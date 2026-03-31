import { Hono } from "hono";
import { generateCodeVerifier, generateState } from "arctic";
import { google, GOOGLE_SCOPES, fetchGoogleUserInfo } from "../lib/google.js";
import { prisma } from "../lib/db.js";
import { getSession } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";
import { TRIAL_DAYS } from "@dompetaing/shared";
import { seedUserCategories } from "../lib/seed.js";
import { env } from "../env.js";

const auth = new Hono();

// ── GET /auth/google — initiate OAuth ──
auth.get("/google", async (c) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, GOOGLE_SCOPES);

  // Store state + code verifier in cookie for CSRF protection
  const { setCookie } = await import("hono/cookie");
  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  setCookie(c, "oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return c.redirect(url.toString());
});

// ── GET /auth/google/callback ──
auth.get("/google/callback", async (c) => {
  const { getCookie, deleteCookie } = await import("hono/cookie");

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  const codeVerifier = getCookie(c, "oauth_code_verifier");

  // Validate OAuth state
  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return c.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }

  // Clean up OAuth cookies
  deleteCookie(c, "oauth_state", { path: "/" });
  deleteCookie(c, "oauth_code_verifier", { path: "/" });

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const googleUser = await fetchGoogleUserInfo(accessToken);

    if (!googleUser.email_verified) {
      return c.redirect(`${env.FRONTEND_URL}/login?error=email_not_verified`);
    }

    // Upsert user
    let user = await prisma.user.findUnique({
      where: { google_id: googleUser.sub },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture ?? null,
          google_id: googleUser.sub,
          access_token: accessToken,
          refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
          token_expiry: tokens.accessTokenExpiresAt(),
        },
      });

      // Create trial subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

      await prisma.subscription.create({
        data: {
          user_id: user.id,
          plan: "trial",
          trial_start: new Date(),
          trial_end: trialEnd,
        },
      });

      // Seed default categories
      await seedUserCategories(user.id);
    } else {
      // Update tokens
      await prisma.user.update({
        where: { id: user.id },
        data: {
          access_token: accessToken,
          refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : user.refresh_token,
          token_expiry: tokens.accessTokenExpiresAt(),
          name: googleUser.name,
          avatar_url: googleUser.picture ?? user.avatar_url,
        },
      });
    }

    // Set session
    const session = await getSession(c);
    session.userId = user.id;
    await session.save();

    // Redirect based on new/returning user
    const redirectPath = isNewUser ? "/onboarding" : "/dashboard";
    return c.redirect(`${env.FRONTEND_URL}${redirectPath}`);
  } catch (err) {
    console.error("[Auth] Google callback error:", err);
    return c.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// ── POST /auth/logout ──
auth.post("/logout", requireAuth, async (c) => {
  const session = await getSession(c);
  session.destroy();
  return c.json({ success: true, data: null, error: null });
});

// ── GET /auth/me ──
auth.get("/me", requireAuth, async (c) => {
  const user = c.get("user");

  return c.json({
    success: true,
    error: null,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      currency: user.currency,
      locale: user.locale,
      theme: user.theme,
      color_scheme: user.color_scheme,
      hide_balance: user.hide_balance,
      gmail_connected: user.gmail_connected,
      gmail_auto_sync: user.gmail_auto_sync,
      gmail_sync_interval: user.gmail_sync_interval,
      gmail_auto_categorize: user.gmail_auto_categorize,
      gmail_review_before_save: user.gmail_review_before_save,
      gmail_last_sync: user.gmail_last_sync,
      notif_budget_threshold: user.notif_budget_threshold,
      notif_weekly_report: user.notif_weekly_report,
      notif_transaction: user.notif_transaction,
      notif_debt_reminder: user.notif_debt_reminder,
      pin_set: !!user.pin_hash,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  });
});

export default auth;

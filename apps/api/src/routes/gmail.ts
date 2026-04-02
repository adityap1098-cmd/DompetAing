import { Hono } from "hono";
import { generateCodeVerifier, generateState } from "arctic";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { requireAuth } from "../middleware/auth.js";
import { requireFeature } from "../middleware/subscription.js";
import { prisma } from "../lib/db.js";
import { googleGmail, GMAIL_SCOPES, fetchGoogleUserInfo } from "../lib/google.js";
import { fetchGmailProfile, getValidToken } from "../lib/gmail.js";
import { syncGmailForUser, getGmailStats, debugSyncForUser } from "../lib/gmailSync.js";
import { pushGmailSync } from "../services/push.service.js";
import { env } from "../env.js";
import { ok, fail } from "@dompetaing/shared";
import { computeAccountBalance } from "../lib/computed.js";
import { encryptToken, decryptToken } from "../lib/crypto.js";

const gmail = new Hono();
gmail.use("*", requireAuth);

// ── POST /gmail/connect — Initiate Gmail OAuth ──
gmail.post("/connect", requireFeature("gmail_sync"), async (c) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = googleGmail.createAuthorizationURL(state, codeVerifier, GMAIL_SCOPES);
  // Force re-consent to get refresh_token
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  setCookie(c, "gmail_oauth_state", state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 10,
    path: "/",
  });
  setCookie(c, "gmail_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return c.json(ok({ url: url.toString() }));
});

// ── GET /gmail/callback — Gmail OAuth callback ──
gmail.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "gmail_oauth_state");
  const codeVerifier = getCookie(c, "gmail_code_verifier");

  deleteCookie(c, "gmail_oauth_state", { path: "/" });
  deleteCookie(c, "gmail_code_verifier", { path: "/" });

  if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
    return c.redirect(`${env.FRONTEND_URL}/gmail-sync?error=oauth_failed`);
  }

  try {
    const user = c.get("user");
    const tokens = await googleGmail.validateAuthorizationCode(code, codeVerifier);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        access_token: encryptToken(tokens.accessToken()),
        refresh_token: encryptToken(tokens.hasRefreshToken() ? tokens.refreshToken() : user.refresh_token),
        token_expiry: tokens.accessTokenExpiresAt(),
        gmail_connected: true,
      },
    });

    return c.redirect(`${env.FRONTEND_URL}/gmail-sync?connected=true`);
  } catch (err) {
    console.error("[Gmail] OAuth callback error:", err);
    return c.redirect(`${env.FRONTEND_URL}/gmail-sync?error=oauth_failed`);
  }
});

// ── GET /gmail/status ──
gmail.get("/status", async (c) => {
  const user = c.get("user");

  const sources = await prisma.gmailSource.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  const stats = await getGmailStats(user.id);

  let gmailEmail: string | null = null;
  if (user.gmail_connected && user.access_token) {
    try {
      // Use getValidToken to auto-refresh expired access tokens
      const { token, refreshed } = await getValidToken(user);
      if (refreshed) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            access_token: encryptToken(refreshed.access_token),
            token_expiry: refreshed.token_expiry,
          },
        });
      }
      const profile = await fetchGmailProfile(token);
      gmailEmail = profile.emailAddress;
    } catch {
      // refresh_token also invalid — user must reconnect
      await prisma.user.update({
        where: { id: user.id },
        data: { gmail_connected: false },
      });
    }
  }

  const accuracy =
    stats.approved + stats.skipped > 0
      ? Math.round((stats.approved / (stats.approved + stats.skipped)) * 100)
      : 0;

  // Separate bank vs marketplace sources
  const MARKETPLACE_NAMES = ["Shopee", "Tokopedia", "Grab", "Gojek", "Traveloka"];
  const bankSources = sources.filter((s) => !MARKETPLACE_NAMES.includes(s.bank_name));
  const marketplaceSources = sources.filter((s) => MARKETPLACE_NAMES.includes(s.bank_name));

  return c.json(
    ok({
      connected: user.gmail_connected,
      email: gmailEmail ?? user.email,
      emails_processed: stats.emails_processed,
      transactions_detected: stats.transactions_detected,
      accuracy,
      pending_count: stats.pending,
      enriched_count: stats.enriched,
      last_sync: user.gmail_last_sync,
      auto_sync: user.gmail_auto_sync,
      sync_interval: user.gmail_sync_interval,
      review_before_save: user.gmail_review_before_save,
      auto_categorize: user.gmail_auto_categorize,
      sources: bankSources.map((s) => ({
        id: s.id,
        bank_name: s.bank_name,
        sender_email: s.sender_email,
        is_active: s.is_active,
        total_detected: s.total_detected,
        created_at: s.created_at,
      })),
      marketplace_sources: marketplaceSources.map((s) => ({
        id: s.id,
        marketplace_name: s.bank_name,
        sender_email: s.sender_email,
        is_active: s.is_active,
        total_detected: s.total_detected,
        created_at: s.created_at,
      })),
    })
  );
});

// ── POST /gmail/sync — Trigger manual sync ──
gmail.post("/sync", requireFeature("gmail_sync"), async (c) => {
  const user = c.get("user");

  if (!user.gmail_connected) {
    return c.json(fail("Gmail not connected"), 400);
  }

  try {
    // Manual sync always scans 6 months back (dedup prevents re-creating same PendingReview)
    const result = await syncGmailForUser(user.id, true);

    // Send push if new transactions found
    if (result.transactions_found > 0) {
      pushGmailSync(user.id, result.transactions_found).catch(() => {});
    }

    return c.json(ok({
      ...result,
      summary: `${result.transactions_found} transaksi ditemukan` +
        (result.enriched > 0 ? `, ${result.enriched} diperkaya` : ""),
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return c.json(fail(msg), 500);
  }
});

// ── GET /gmail/sources ──
gmail.get("/sources", async (c) => {
  const user = c.get("user");
  const sources = await prisma.gmailSource.findMany({
    where: { user_id: user.id },
    orderBy: { total_detected: "desc" },
  });

  return c.json(
    ok(
      sources.map((s) => ({
        id: s.id,
        bank_name: s.bank_name,
        sender_email: s.sender_email,
        is_active: s.is_active,
        total_detected: s.total_detected,
        created_at: s.created_at,
      }))
    )
  );
});

// ── PATCH /gmail/sources/:id/toggle ──
gmail.patch("/sources/:id/toggle", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const source = await prisma.gmailSource.findFirst({
    where: { id, user_id: user.id },
  });
  if (!source) return c.json(fail("Source not found"), 404);

  const updated = await prisma.gmailSource.update({
    where: { id },
    data: { is_active: !source.is_active },
  });

  return c.json(ok({ id: updated.id, is_active: updated.is_active }));
});

// ── GET /gmail/pending ──
gmail.get("/pending", async (c) => {
  const user = c.get("user");

  const pending = await prisma.pendingReview.findMany({
    where: { user_id: user.id, status: "pending" },
    orderBy: [
      { parsed_date: { sort: "desc", nulls: "last" } },
      { created_at: "desc" },
    ],
  });

  // Fetch suggested categories + accounts for display
  const categoryIds = pending
    .map((p) => p.suggested_category_id)
    .filter((id): id is string => !!id);
  const accountIds = pending
    .map((p) => p.suggested_account_id)
    .filter((id): id is string => !!id);

  const [categories, accounts] = await Promise.all([
    categoryIds.length
      ? prisma.category.findMany({ where: { id: { in: categoryIds } } })
      : Promise.resolve([]),
    accountIds.length
      ? prisma.account.findMany({ where: { id: { in: accountIds } } })
      : Promise.resolve([]),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  return c.json(
    ok(
      pending.map((p) => ({
        id: p.id,
        gmail_message_id: p.gmail_message_id,
        raw_subject: p.raw_subject,
        parsed_amount: p.parsed_amount ? Number(p.parsed_amount) : null,
        parsed_merchant: p.parsed_merchant,
        parsed_date: p.parsed_date,
        parsed_type: p.parsed_type,
        bank_name: p.bank_name,
        status: p.status,
        suggested_category: p.suggested_category_id ? catMap.get(p.suggested_category_id) ?? null : null,
        suggested_account: p.suggested_account_id ? accMap.get(p.suggested_account_id) ?? null : null,
        created_at: p.created_at,
      }))
    )
  );
});

// ── PATCH /gmail/pending/:id/approve — Approve → create transaction ──
gmail.patch("/pending/:id/approve", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const review = await prisma.pendingReview.findFirst({
    where: { id, user_id: user.id, status: "pending" },
  });
  if (!review) return c.json(fail("Pending review not found"), 404);

  const body = await c.req.json() as {
    amount: number;
    type: string;
    category_id?: string;
    sub_category_id?: string;
    account_id: string;
    description: string;
    date: string;
  };

  if (!body.amount || !body.type || !body.account_id || !body.description || !body.date) {
    return c.json(fail("amount, type, account_id, description, date are required"), 400);
  }

  // Verify account belongs to user
  const account = await prisma.account.findFirst({
    where: { id: body.account_id, user_id: user.id },
  });
  if (!account) return c.json(fail("Account not found"), 404);

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        user_id: user.id,
        amount: body.amount,
        type: body.type as "expense" | "income",
        category_id: body.category_id || null,
        sub_category_id: body.sub_category_id || null,
        account_id: body.account_id,
        description: body.description,
        date: new Date(body.date),
        source: "gmail",
        gmail_message_id: review.gmail_message_id,
        is_verified: true,
      },
    }),
    prisma.pendingReview.update({
      where: { id },
      data: { status: "approved" },
    }),
  ]);

  const balance = await computeAccountBalance(body.account_id);

  return c.json(ok({ transaction, account_balance: balance }));
});

// ── PATCH /gmail/pending/:id/skip ──
gmail.patch("/pending/:id/skip", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const review = await prisma.pendingReview.findFirst({
    where: { id, user_id: user.id, status: "pending" },
  });
  if (!review) return c.json(fail("Pending review not found"), 404);

  await prisma.pendingReview.update({ where: { id }, data: { status: "skipped" } });
  return c.json(ok({ id, status: "skipped" }));
});

// ── POST /gmail/pending/approve-all ──
gmail.post("/pending/approve-all", async (c) => {
  const user = c.get("user");

  const pending = await prisma.pendingReview.findMany({
    where: { user_id: user.id, status: "pending" },
  });

  let approved = 0;
  let skipped = 0;

  for (const review of pending) {
    if (
      !review.parsed_amount ||
      !review.parsed_type ||
      !review.suggested_account_id ||
      !review.parsed_date
    ) {
      // Skip items missing required data
      await prisma.pendingReview.update({ where: { id: review.id }, data: { status: "skipped" } });
      skipped++;
      continue;
    }

    const description = review.parsed_merchant
      ? `${review.bank_name ?? ""}: ${review.parsed_merchant}`.trim()
      : review.raw_subject;

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          user_id: user.id,
          amount: review.parsed_amount,
          type: review.parsed_type as "expense" | "income",
          category_id: review.suggested_category_id || null,
          sub_category_id: review.suggested_sub_category_id || null,
          account_id: review.suggested_account_id,
          description,
          date: review.parsed_date,
          source: "gmail",
          gmail_message_id: review.gmail_message_id,
          is_verified: true,
        },
      }),
      prisma.pendingReview.update({
        where: { id: review.id },
        data: { status: "approved" },
      }),
    ]);

    approved++;
  }

  return c.json(ok({ approved, skipped, total: pending.length }));
});

// ── PATCH /gmail/settings — Update Gmail preferences ──
gmail.patch("/settings", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as {
    gmail_auto_sync?: boolean;
    gmail_sync_interval?: number;
    gmail_auto_categorize?: boolean;
    gmail_review_before_save?: boolean;
  };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.gmail_auto_sync !== undefined && { gmail_auto_sync: body.gmail_auto_sync }),
      ...(body.gmail_sync_interval !== undefined && { gmail_sync_interval: body.gmail_sync_interval }),
      ...(body.gmail_auto_categorize !== undefined && { gmail_auto_categorize: body.gmail_auto_categorize }),
      ...(body.gmail_review_before_save !== undefined && { gmail_review_before_save: body.gmail_review_before_save }),
    },
  });

  return c.json(
    ok({
      gmail_auto_sync: updated.gmail_auto_sync,
      gmail_sync_interval: updated.gmail_sync_interval,
      gmail_auto_categorize: updated.gmail_auto_categorize,
      gmail_review_before_save: updated.gmail_review_before_save,
    })
  );
});

// ── GET /gmail/debug-scan — scan first 20 emails, return raw sender+subject ──
gmail.get("/debug-scan", async (c) => {
  const user = c.get("user");
  if (!user.gmail_connected) {
    return c.json(fail("Gmail not connected"), 400);
  }

  try {
    const result = await debugSyncForUser(user.id);
    return c.json(ok(result));
  } catch (e) {
    console.error("[Gmail Debug] Error:", e);
    return c.json(fail(e instanceof Error ? e.message : "Debug scan failed"), 500);
  }
});

// ── POST /gmail/disconnect ──
gmail.post("/disconnect", async (c) => {
  const user = c.get("user");

  await prisma.user.update({
    where: { id: user.id },
    data: { gmail_connected: false },
  });

  return c.json(ok({ disconnected: true }));
});

export default gmail;

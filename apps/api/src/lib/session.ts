import { env } from "../env.js";
import type { Context } from "hono";
import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";

export interface SessionData {
  userId: string;
}

export interface Session extends SessionData {
  save: () => Promise<void>;
  destroy: () => void;
}

export async function getSession(c: Context): Promise<Session> {
  const secret = env.SESSION_SECRET;

  let userId = "";
  const cookieVal = await getSignedCookie(c, secret, "dompetaing_session");
  if (cookieVal) {
    try {
      const parsed = JSON.parse(
        Buffer.from(cookieVal, "base64url").toString("utf8")
      ) as SessionData;
      userId = parsed.userId ?? "";
    } catch {
      // invalid cookie → treat as empty session
    }
  }

  const session: Session = {
    userId,
    async save() {
      const data: SessionData = { userId: session.userId };
      const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
      await setSignedCookie(c, "dompetaing_session", encoded, secret, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
      });
    },
    destroy() {
      session.userId = "";
      deleteCookie(c, "dompetaing_session", {
        path: "/",
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
      });
    },
  };

  return session;
}

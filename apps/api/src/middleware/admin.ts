import type { Context, Next } from "hono";
import { env } from "../env.js";

const adminEmails = new Set(
  env.ADMIN_EMAILS
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminEmail(email: string): boolean {
  return adminEmails.has(email.toLowerCase());
}

export async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const user = c.get("user");
  if (!user || !isAdminEmail(user.email)) {
    return c.json({ success: false, error: "Forbidden", data: null }, 403);
  }
  return next();
}

import type { Context, Next } from "hono";
import { prisma } from "../lib/db.js";
import { getSession } from "../lib/session.js";
import type { User } from "@prisma/client";

declare module "hono" {
  interface ContextVariableMap {
    user: User;
  }
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const session = await getSession(c);

  if (!session.userId) {
    return c.json({ success: false, error: "Unauthorized", data: null }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    session.destroy();
    return c.json({ success: false, error: "User not found", data: null }, 401);
  }

  c.set("user", user);
  await next();
}

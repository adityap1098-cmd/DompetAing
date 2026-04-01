import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { ok, fail } from "@dompetaing/shared";

const push = new Hono();
push.use("*", requireAuth);

// ── POST /push/register — Register FCM token ──
push.post("/register", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as {
    fcm_token: string;
    device?: string;
  };

  if (!body.fcm_token || typeof body.fcm_token !== "string") {
    return c.json(fail("fcm_token is required"), 400);
  }

  // Upsert: reactivate if exists, create if new
  await prisma.pushSubscription.upsert({
    where: {
      user_id_fcm_token: {
        user_id: user.id,
        fcm_token: body.fcm_token,
      },
    },
    update: {
      is_active: true,
      device: body.device ?? "web",
    },
    create: {
      user_id: user.id,
      fcm_token: body.fcm_token,
      device: body.device ?? "web",
      is_active: true,
    },
  });

  return c.json(ok({ registered: true }));
});

// ── POST /push/unregister — Unregister FCM token ──
push.post("/unregister", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as { fcm_token: string };

  if (!body.fcm_token) {
    return c.json(fail("fcm_token is required"), 400);
  }

  await prisma.pushSubscription.updateMany({
    where: {
      user_id: user.id,
      fcm_token: body.fcm_token,
    },
    data: { is_active: false },
  });

  return c.json(ok({ unregistered: true }));
});

export default push;

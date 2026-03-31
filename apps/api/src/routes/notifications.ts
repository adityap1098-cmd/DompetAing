import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { ok, fail } from "@dompetaing/shared";

const notifications = new Hono();
notifications.use("*", requireAuth);

// ── GET /notifications ──
notifications.get("/", async (c) => {
  const user = c.get("user");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);
  const unread_only = c.req.query("unread_only") === "true";

  const items = await prisma.notification.findMany({
    where: {
      user_id: user.id,
      ...(unread_only && { is_read: false }),
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  const unread_count = await prisma.notification.count({
    where: { user_id: user.id, is_read: false },
  });

  return c.json(ok({
    items: items.map((n) => {
      let parsedMeta: Record<string, unknown> | null = null;
      if (n.meta) {
        try {
          parsedMeta = JSON.parse(n.meta) as Record<string, unknown>;
        } catch {
          parsedMeta = null;
        }
      }
      return { ...n, meta: parsedMeta };
    }),
    unread_count,
  }));
});

// ── PATCH /notifications/:id/read ──
notifications.patch("/:id/read", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const notif = await prisma.notification.findFirst({
    where: { id, user_id: user.id },
  });
  if (!notif) return c.json(fail("Notification not found"), 404);

  await prisma.notification.update({ where: { id }, data: { is_read: true } });
  return c.json(ok({ id, is_read: true }));
});

// ── PATCH /notifications/read-all ──
notifications.patch("/read-all", async (c) => {
  const user = c.get("user");

  const result = await prisma.notification.updateMany({
    where: { user_id: user.id, is_read: false },
    data: { is_read: true },
  });

  return c.json(ok({ updated: result.count }));
});

// ── DELETE /notifications/:id ──
notifications.delete("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const notif = await prisma.notification.findFirst({
    where: { id, user_id: user.id },
  });
  if (!notif) return c.json(fail("Notification not found"), 404);

  await prisma.notification.delete({ where: { id } });
  return c.json(ok({ id }));
});

// ── DELETE /notifications — clear all ──
notifications.delete("/", async (c) => {
  const user = c.get("user");

  const result = await prisma.notification.deleteMany({
    where: { user_id: user.id },
  });

  return c.json(ok({ deleted: result.count }));
});

export default notifications;

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { ok, fail } from "@dompetaing/shared";
import bcrypt from "bcryptjs";

const settings = new Hono();
settings.use("*", requireAuth);

// ── PIN brute-force protection (in-memory, resets on restart) ──
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const pinAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkPinRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const entry = pinAttempts.get(userId);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
  }
  return { allowed: true };
}

function recordPinFailure(userId: string) {
  const entry = pinAttempts.get(userId) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= PIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
    entry.count = 0;
  }
  pinAttempts.set(userId, entry);
}

function clearPinAttempts(userId: string) {
  pinAttempts.delete(userId);
}

// ── PUT /settings/profile ──
settings.put("/profile", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as {
    name?: string;
    avatar_url?: string;
  };

  if (body.name !== undefined && (!body.name || body.name.trim().length === 0)) {
    return c.json(fail("Name cannot be empty"), 400);
  }

  if (body.avatar_url !== undefined) {
    if (body.avatar_url.length > 2048) {
      return c.json(fail("avatar_url too long"), 400);
    }
    if (body.avatar_url && !/^https:\/\/.{1,}/i.test(body.avatar_url)) {
      return c.json(fail("avatar_url must be an https URL"), 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.avatar_url !== undefined && { avatar_url: body.avatar_url }),
    },
    select: { id: true, name: true, email: true, avatar_url: true },
  });

  return c.json(ok(updated));
});

// ── PUT /settings/preferences ──
settings.put("/preferences", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as {
    theme?: string;
    color_scheme?: string;
    hide_balance?: boolean;
    currency?: string;
    locale?: string;
  };

  const VALID_THEMES = ["light", "dark"];
  const VALID_SCHEMES = [
    // Solid (free)
    "sage_green", "ocean_blue", "royal_purple", "sunset_orange",
    "teal_green", "hot_pink", "navy_blue", "steel_gray",
    // Extra solid
    "gold", "rose_gold", "midnight_blue", "emerald",
    "burgundy", "charcoal",
    // Themed (premium)
    "islamic_gold", "ocean_wave", "forest_nature",
    "sakura_pink", "geometric_dark", "batik_heritage",
  ];
  const VALID_CURRENCIES = ["IDR", "USD", "EUR", "SGD", "MYR"];
  const VALID_LOCALES = ["id", "en"];

  if (body.theme && !VALID_THEMES.includes(body.theme)) {
    return c.json(fail("Invalid theme"), 400);
  }
  if (body.color_scheme && !VALID_SCHEMES.includes(body.color_scheme)) {
    return c.json(fail("Invalid color scheme"), 400);
  }
  if (body.currency && !VALID_CURRENCIES.includes(body.currency)) {
    return c.json(fail("Invalid currency"), 400);
  }
  if (body.locale && !VALID_LOCALES.includes(body.locale)) {
    return c.json(fail("Invalid locale"), 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.theme !== undefined && { theme: body.theme }),
      ...(body.color_scheme !== undefined && { color_scheme: body.color_scheme }),
      ...(body.hide_balance !== undefined && { hide_balance: body.hide_balance }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.locale !== undefined && { locale: body.locale }),
    },
    select: { theme: true, color_scheme: true, hide_balance: true, currency: true, locale: true },
  });

  return c.json(ok(updated));
});

// ── PUT /settings/notifications ──
settings.put("/notifications", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as {
    notif_budget_threshold?: number;
    notif_weekly_report?: boolean;
    notif_transaction?: boolean;
    notif_debt_reminder?: boolean;
  };

  if (
    body.notif_budget_threshold !== undefined &&
    (body.notif_budget_threshold < 50 || body.notif_budget_threshold > 100)
  ) {
    return c.json(fail("Budget threshold must be between 50 and 100"), 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.notif_budget_threshold !== undefined && { notif_budget_threshold: body.notif_budget_threshold }),
      ...(body.notif_weekly_report !== undefined && { notif_weekly_report: body.notif_weekly_report }),
      ...(body.notif_transaction !== undefined && { notif_transaction: body.notif_transaction }),
      ...(body.notif_debt_reminder !== undefined && { notif_debt_reminder: body.notif_debt_reminder }),
    },
    select: {
      notif_budget_threshold: true,
      notif_weekly_report: true,
      notif_transaction: true,
      notif_debt_reminder: true,
    },
  });

  return c.json(ok(updated));
});

// ── PUT /settings/security — Set / change PIN ──
settings.put("/security", async (c) => {
  const user = c.get("user");
  const body = await c.req.json() as {
    action: "set_pin" | "remove_pin" | "verify_pin";
    pin?: string;
    current_pin?: string;
  };

  if (body.action === "set_pin") {
    if (!body.pin || !/^\d{4,6}$/.test(body.pin)) {
      return c.json(fail("PIN must be 4-6 digits"), 400);
    }
    // If PIN already set, require current PIN with rate-limit check
    if (user.pin_hash) {
      if (!body.current_pin) {
        return c.json(fail("current_pin required to change PIN"), 400);
      }
      const rateCheck = checkPinRateLimit(user.id);
      if (!rateCheck.allowed) {
        const mins = Math.ceil((rateCheck.retryAfterMs ?? 0) / 60000);
        return c.json(fail(`Terlalu banyak percobaan. Coba lagi dalam ${mins} menit.`), 429);
      }
      const valid = await bcrypt.compare(body.current_pin, user.pin_hash);
      if (!valid) {
        recordPinFailure(user.id);
        return c.json(fail("Current PIN is incorrect"), 400);
      }
      clearPinAttempts(user.id);
    }
    const pin_hash = await bcrypt.hash(body.pin, 10);
    await prisma.user.update({ where: { id: user.id }, data: { pin_hash } });
    return c.json(ok({ pin_set: true }));
  }

  if (body.action === "remove_pin") {
    if (!user.pin_hash) {
      return c.json(fail("No PIN set"), 400);
    }
    if (!body.current_pin) {
      return c.json(fail("current_pin required to remove PIN"), 400);
    }
    const rateCheck = checkPinRateLimit(user.id);
    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.retryAfterMs ?? 0) / 60000);
      return c.json(fail(`Terlalu banyak percobaan. Coba lagi dalam ${mins} menit.`), 429);
    }
    const valid = await bcrypt.compare(body.current_pin, user.pin_hash);
    if (!valid) {
      recordPinFailure(user.id);
      return c.json(fail("PIN is incorrect"), 400);
    }
    clearPinAttempts(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { pin_hash: null } });
    return c.json(ok({ pin_set: false }));
  }

  if (body.action === "verify_pin") {
    if (!user.pin_hash) {
      return c.json(fail("No PIN set"), 400);
    }
    if (!body.pin) {
      return c.json(fail("pin required"), 400);
    }
    const rateCheck = checkPinRateLimit(user.id);
    if (!rateCheck.allowed) {
      const mins = Math.ceil((rateCheck.retryAfterMs ?? 0) / 60000);
      return c.json(fail(`Terlalu banyak percobaan. Coba lagi dalam ${mins} menit.`), 429);
    }
    const valid = await bcrypt.compare(body.pin, user.pin_hash);
    if (!valid) {
      recordPinFailure(user.id);
      return c.json(fail("Incorrect PIN"), 401);
    }
    clearPinAttempts(user.id);
    return c.json(ok({ verified: true }));
  }

  return c.json(fail("Invalid action"), 400);
});

export default settings;

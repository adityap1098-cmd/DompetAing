/// <reference types="vitest/globals" />
/**
 * Test setup for DompetAing API tests.
 * Mocks Prisma, session, env, and external services.
 */
import { vi } from "vitest";

// ── Mock env (before anything imports it) ──
vi.mock("../src/env.js", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    SESSION_SECRET: "test-secret-key-for-testing-only",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3001/v1/auth/google/callback",
    GMAIL_REDIRECT_URI: "http://localhost:3001/v1/gmail/callback",
    PORT: 3001,
    NODE_ENV: "test",
    FRONTEND_URL: "http://localhost:5173",
    COOKIE_DOMAIN: "",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
    ADMIN_EMAILS: "admin@test.com",
    MIDTRANS_SERVER_KEY: "SB-Mid-server-test",
    MIDTRANS_CLIENT_KEY: "SB-Mid-client-test",
    MIDTRANS_IS_PRODUCTION: false,
    FIREBASE_PROJECT_ID: "",
    FIREBASE_CLIENT_EMAIL: "",
    FIREBASE_PRIVATE_KEY: "",
  },
}));

// ── Mock Prisma ──
export const mockPrismaClient: Record<string, any> = {
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  account: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  transaction: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn(), deleteMany: vi.fn(), groupBy: vi.fn(), updateMany: vi.fn() },
  category: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  subCategory: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  budget: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  debt: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  recurringTransaction: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  subscription: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
  payment: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  notification: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  gmailSource: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  pendingReview: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  pushSubscription: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn((fnOrArray: any) => {
    // Handle both function form $transaction(fn) and array form $transaction([...])
    if (typeof fnOrArray === 'function') return fnOrArray(mockPrismaClient);
    if (Array.isArray(fnOrArray)) return Promise.all(fnOrArray);
    return fnOrArray;
  }),
};

vi.mock("../src/lib/db.js", () => ({
  prisma: mockPrismaClient,
}));

// ── Mock session ──
const mockSession = {
  userId: "test-user-id",
  save: vi.fn(),
  destroy: vi.fn(),
};

vi.mock("../src/lib/session.js", () => ({
  getSession: vi.fn().mockResolvedValue(mockSession),
}));

// ── Mock Google OAuth ──
vi.mock("../src/lib/google.js", () => ({
  google: {
    createAuthorizationURL: vi.fn().mockReturnValue(new URL("https://accounts.google.com/o/oauth2/auth?client_id=test")),
    validateAuthorizationCode: vi.fn().mockResolvedValue({
      accessToken: () => "mock-access-token",
      refreshToken: () => "mock-refresh-token",
      accessTokenExpiresAt: () => new Date(Date.now() + 3600_000),
    }),
  },
  googleGmail: {
    createAuthorizationURL: vi.fn().mockReturnValue(new URL("https://accounts.google.com/o/oauth2/auth?scope=gmail")),
    validateAuthorizationCode: vi.fn().mockResolvedValue({
      accessToken: () => "mock-gmail-token",
      refreshToken: () => "mock-gmail-refresh",
      accessTokenExpiresAt: () => new Date(Date.now() + 3600_000),
    }),
  },
  GOOGLE_SCOPES: ["openid", "profile", "email"],
  fetchGoogleUserInfo: vi.fn().mockResolvedValue({
    sub: "google-123",
    email: "test@example.com",
    name: "Test User",
    picture: null,
    email_verified: true,
  }),
}));

// ── Mock crypto ──
vi.mock("../src/lib/crypto.js", () => ({
  encryptToken: vi.fn((t: string) => `enc_${t}`),
  decryptToken: vi.fn((t: string) => t.replace("enc_", "")),
}));

// ── Mock seed ──
vi.mock("../src/lib/seed.js", () => ({
  seedUserCategories: vi.fn(),
}));

// ── Mock computed functions ──
vi.mock("../src/lib/computed.js", () => ({
  computeAccountBalance: vi.fn().mockResolvedValue(1000000),
  computeNetWorth: vi.fn().mockResolvedValue(5000000),
  computeBudgetSpent: vi.fn().mockResolvedValue(250000),
  getBudgetPeriodDates: vi.fn().mockReturnValue({
    start: new Date("2026-04-01"),
    end: new Date("2026-04-30"),
  }),
}));

// ── Mock push service ──
vi.mock("../src/services/push.service.js", () => ({
  sendPush: vi.fn(),
  pushBudgetAlert: vi.fn(),
  pushDebtReminder: vi.fn(),
  pushGmailSync: vi.fn(),
  pushWeeklyReport: vi.fn(),
  pushRecurring: vi.fn(),
}));

// ── Helper: create a test user object ──
export const testUser = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  avatar_url: null,
  google_id: "google-123",
  access_token: null,
  refresh_token: null,
  token_expiry: null,
  currency: "IDR",
  locale: "id",
  theme: "light",
  color_scheme: "sage_green",
  pin_hash: null,
  hide_balance: false,
  notif_budget_threshold: 80,
  notif_weekly_report: true,
  notif_transaction: false,
  notif_debt_reminder: true,
  notif_push: true,
  gmail_connected: false,
  gmail_auto_sync: true,
  gmail_sync_interval: 15,
  gmail_auto_categorize: true,
  gmail_review_before_save: true,
  gmail_last_sync: null,
  gmail_last_history_id: null,
  created_at: new Date("2026-03-29"),
  updated_at: new Date("2026-03-29"),
};

export const adminUser = {
  ...testUser,
  id: "admin-user-id",
  email: "admin@test.com",
  name: "Admin User",
};

export { mockSession };

// ── Reset all mocks before each test ──
beforeEach(async () => {
  vi.clearAllMocks();
  
  // Re-setup default mocks
  mockSession.userId = "test-user-id";
  mockSession.save = vi.fn();
  mockSession.destroy = vi.fn();
  
  // Default: user exists in DB
  mockPrismaClient.user.findUnique.mockResolvedValue(testUser);
});

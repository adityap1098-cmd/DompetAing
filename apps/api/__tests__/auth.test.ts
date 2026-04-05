import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient, testUser, mockSession } from "./setup";

const setupAuthApp = async () => {
  const mod = await import("../src/routes/auth.js");
  const app = new Hono();
  app.route("/auth", mod.default);
  return app;
};

describe("Auth Routes", () => {
  describe("GET /auth/google", () => {
    it("should redirect to Google OAuth", async () => {
      const app = await setupAuthApp();
      const res = await app.request("http://localhost/auth/google", {
        method: "GET",
      });
      // Should redirect to Google
      expect([302, 303]).toContain(res.status);
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user when authenticated", async () => {
      const app = await setupAuthApp();
      mockPrismaClient.subscription.findUnique.mockResolvedValue({
        id: "sub-1",
        user_id: "test-user-id",
        plan: "trial",
        trial_end: new Date(Date.now() + 86400000 * 30),
        premium_end: null,
        is_active: true,
        auto_renew: false,
      });
      const { status, json } = await testRequest(app, "GET", "/auth/me");
      expect(status).toBe(200);
      expect(json.data).toBeDefined();
      expect(json.data.email).toBe("test@example.com");
    });

    it("should return 401 when not authenticated", async () => {
      mockSession.userId = "";
      const app = await setupAuthApp();
      const { status, json } = await testRequest(app, "GET", "/auth/me");
      expect(status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe("POST /auth/logout", () => {
    it("should destroy session and return success", async () => {
      const app = await setupAuthApp();
      const { status, json } = await testRequest(app, "POST", "/auth/logout");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("Session handling", () => {
    it("should handle invalid OAuth callback gracefully", async () => {
      const app = await setupAuthApp();
      // Missing code/state should redirect to login with error
      const res = await app.request("http://localhost/auth/google/callback", {
        method: "GET",
      });
      // Should redirect back to login
      expect([302, 303]).toContain(res.status);
    });
  });
});

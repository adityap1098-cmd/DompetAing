import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testRequest } from "./helpers";
import { mockPrismaClient } from "./setup";

const setupApp = async () => {
  const mod = await import("../src/routes/categories.js");
  const app = new Hono();
  app.route("/categories", mod.default);
  return app;
};

const CAT_ID = "clz00000000000000000000cc";

const mockCategory = {
  id: CAT_ID,
  user_id: "test-user-id",
  name: "Makanan",
  type: "expense",
  icon: "🍔",
  color: "#FF5722",
  is_system: false,
  sort_order: 0,
  created_at: new Date(),
  updated_at: new Date(),
  sub_categories: [],
  _count: { transactions: 0 },
};

describe("Categories Routes", () => {
  describe("GET /categories", () => {
    it("should return user categories", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findMany.mockResolvedValue([mockCategory]);

      const { status, json } = await testRequest(app, "GET", "/categories");
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should filter by type", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const { status } = await testRequest(app, "GET", "/categories?type=expense");
      expect(status).toBe(200);
    });
  });

  describe("POST /categories", () => {
    it("should create a new category", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findFirst.mockResolvedValue(null); // no duplicate
      mockPrismaClient.category.create.mockResolvedValue(mockCategory);

      const { status, json } = await testRequest(app, "POST", "/categories", {
        name: "Makanan",
        type: "expense",
        icon: "🍔",
        color: "#FF5722",
      });
      expect(status).toBe(201);
      expect(json.success).toBe(true);
    });

    it("should reject category without name", async () => {
      const app = await setupApp();
      const { status } = await testRequest(app, "POST", "/categories", {
        type: "expense",
        icon: "🍔",
      });
      expect(status).toBe(400);
    });
  });

  describe("PUT /categories/:id", () => {
    it("should update a category", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findFirst
        .mockResolvedValueOnce(mockCategory) // find existing
        .mockResolvedValueOnce(null); // no duplicate name
      mockPrismaClient.category.update.mockResolvedValue({ ...mockCategory, name: "Makanan & Minuman" });

      const { status, json } = await testRequest(app, "PUT", `/categories/${CAT_ID}`, {
        name: "Makanan & Minuman",
        icon: "🍔",
        color: "#FF5722",
      });
      expect(status).toBe(200);
    });
  });

  describe("DELETE /categories/:id", () => {
    it("should delete category without transactions", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.transaction.count.mockResolvedValue(0);
      mockPrismaClient.category.delete.mockResolvedValue(mockCategory);

      const { status } = await testRequest(app, "DELETE", `/categories/${CAT_ID}`);
      expect(status).toBe(200);
    });

    it("should return 409 when category has transactions", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.transaction.count.mockResolvedValue(5);

      const { status, json } = await testRequest(app, "DELETE", `/categories/${CAT_ID}`);
      expect(status).toBe(409);
    });

    it("should force delete category with transactions", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.transaction.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaClient.category.delete.mockResolvedValue(mockCategory);

      const { status } = await testRequest(app, "DELETE", `/categories/${CAT_ID}?force=true`);
      expect(status).toBe(200);
    });
  });

  describe("Sub-categories", () => {
    it("should create a sub-category", async () => {
      const app = await setupApp();
      mockPrismaClient.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaClient.subCategory.findFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(null); // no existing subcategories (maxOrder)
      mockPrismaClient.subCategory.create.mockResolvedValue({
        id: "clz00000000000000000subcx",
        category_id: CAT_ID,
        name: "Sarapan",
        sort_order: 0,
        created_at: new Date(),
      });

      const { status, json } = await testRequest(app, "POST", `/categories/${CAT_ID}/sub`, {
        name: "Sarapan",
      });
      expect(status).toBe(201);
    });
  });
});

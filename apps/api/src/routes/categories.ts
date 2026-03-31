import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateSubCategorySchema,
  ok,
  fail,
} from "@dompetaing/shared";

const categories = new Hono();
categories.use("*", requireAuth);

// ── Serialise ──
function serializeSub(s: {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  created_at: Date;
}) {
  return {
    id: s.id,
    category_id: s.category_id,
    name: s.name,
    sort_order: s.sort_order,
    created_at: s.created_at.toISOString(),
  };
}

function serializeCategory(cat: {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  is_system: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  sub_categories: Array<{
    id: string;
    category_id: string;
    name: string;
    sort_order: number;
    created_at: Date;
  }>;
}) {
  return {
    id: cat.id,
    user_id: cat.user_id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    type: cat.type,
    is_system: cat.is_system,
    sort_order: cat.sort_order,
    sub_categories: cat.sub_categories.map(serializeSub),
    created_at: cat.created_at.toISOString(),
    updated_at: cat.updated_at.toISOString(),
  };
}

// ── GET /categories ──
categories.get("/", async (c) => {
  const user = c.get("user");
  const type = c.req.query("type");
  const search = c.req.query("search");

  const cats = await prisma.category.findMany({
    where: {
      user_id: user.id,
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              {
                sub_categories: {
                  some: { name: { contains: search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    include: { sub_categories: { orderBy: { sort_order: "asc" } } },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
  });

  return c.json(ok(cats.map(serializeCategory)));
});

// ── GET /categories/:id ──
categories.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const cat = await prisma.category.findFirst({
    where: { id, user_id: user.id },
    include: { sub_categories: { orderBy: { sort_order: "asc" } } },
  });

  if (!cat) return c.json(fail("Kategori tidak ditemukan"), 404);
  return c.json(ok(serializeCategory(cat)));
});

// ── POST /categories ──
categories.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.category.findFirst({
    where: { user_id: user.id, name: parsed.data.name },
  });
  if (existing) return c.json(fail("Nama kategori sudah ada"), 409);

  const maxOrder = await prisma.category.findFirst({
    where: { user_id: user.id },
    orderBy: { sort_order: "desc" },
    select: { sort_order: true },
  });

  const cat = await prisma.category.create({
    data: {
      user_id: user.id,
      name: parsed.data.name,
      icon: parsed.data.icon,
      color: parsed.data.color,
      type: parsed.data.type,
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
    },
    include: { sub_categories: true },
  });

  return c.json(ok(serializeCategory(cat)), 201);
});

// ── PUT /categories/:id ──
categories.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateCategorySchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const existing = await prisma.category.findFirst({
    where: { id, user_id: user.id },
  });
  if (!existing) return c.json(fail("Kategori tidak ditemukan"), 404);

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const nameExists = await prisma.category.findFirst({
      where: { user_id: user.id, name: parsed.data.name, id: { not: id } },
    });
    if (nameExists) return c.json(fail("Nama kategori sudah ada"), 409);
  }

  const cat = await prisma.category.update({
    where: { id },
    data: parsed.data,
    include: { sub_categories: { orderBy: { sort_order: "asc" } } },
  });

  return c.json(ok(serializeCategory(cat)));
});

// ── DELETE /categories/:id ──
categories.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const force = c.req.query("force") === "true";

  const existing = await prisma.category.findFirst({
    where: { id, user_id: user.id },
  });
  if (!existing) return c.json(fail("Kategori tidak ditemukan"), 404);

  const txnCount = await prisma.transaction.count({
    where: { category_id: id, user_id: user.id },
  });

  if (txnCount > 0 && !force) {
    return c.json(
      {
        success: false,
        data: null,
        error: "Kategori ini memiliki transaksi",
        transaction_count: txnCount,
      },
      409
    );
  }

  if (txnCount > 0 && force) {
    await prisma.transaction.updateMany({
      where: { category_id: id, user_id: user.id },
      data: { category_id: null, sub_category_id: null },
    });
  }

  await prisma.category.delete({ where: { id } });

  return c.json(ok({ deleted: true }));
});

// ── POST /categories/:id/sub ──
categories.post("/:id/sub", async (c) => {
  const user = c.get("user");
  const categoryId = c.req.param("id");
  const body = await c.req.json();
  const parsed = CreateSubCategorySchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const cat = await prisma.category.findFirst({
    where: { id: categoryId, user_id: user.id },
  });
  if (!cat) return c.json(fail("Kategori tidak ditemukan"), 404);

  const existing = await prisma.subCategory.findFirst({
    where: { category_id: categoryId, name: parsed.data.name },
  });
  if (existing) return c.json(fail("Nama sub-kategori sudah ada"), 409);

  const maxOrder = await prisma.subCategory.findFirst({
    where: { category_id: categoryId },
    orderBy: { sort_order: "desc" },
    select: { sort_order: true },
  });

  const sub = await prisma.subCategory.create({
    data: {
      category_id: categoryId,
      name: parsed.data.name,
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
    },
  });

  return c.json(ok(serializeSub(sub)), 201);
});

// ── PUT /categories/:id/sub/:subId ──
categories.put("/:id/sub/:subId", async (c) => {
  const user = c.get("user");
  const categoryId = c.req.param("id");
  const subId = c.req.param("subId");
  const body = await c.req.json();
  const parsed = CreateSubCategorySchema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  const cat = await prisma.category.findFirst({
    where: { id: categoryId, user_id: user.id },
  });
  if (!cat) return c.json(fail("Kategori tidak ditemukan"), 404);

  const existing = await prisma.subCategory.findFirst({
    where: { id: subId, category_id: categoryId },
  });
  if (!existing) return c.json(fail("Sub-kategori tidak ditemukan"), 404);

  const nameExists = await prisma.subCategory.findFirst({
    where: { category_id: categoryId, name: parsed.data.name, id: { not: subId } },
  });
  if (nameExists) return c.json(fail("Nama sub-kategori sudah ada"), 409);

  const sub = await prisma.subCategory.update({
    where: { id: subId },
    data: { name: parsed.data.name },
  });

  return c.json(ok(serializeSub(sub)));
});

// ── DELETE /categories/:id/sub/:subId ──
categories.delete("/:id/sub/:subId", async (c) => {
  const user = c.get("user");
  const categoryId = c.req.param("id");
  const subId = c.req.param("subId");

  const cat = await prisma.category.findFirst({
    where: { id: categoryId, user_id: user.id },
  });
  if (!cat) return c.json(fail("Kategori tidak ditemukan"), 404);

  const existing = await prisma.subCategory.findFirst({
    where: { id: subId, category_id: categoryId },
  });
  if (!existing) return c.json(fail("Sub-kategori tidak ditemukan"), 404);

  await prisma.transaction.updateMany({
    where: { sub_category_id: subId, user_id: user.id },
    data: { sub_category_id: null },
  });

  await prisma.subCategory.delete({ where: { id: subId } });

  return c.json(ok({ deleted: true }));
});

// ── PATCH /categories/reorder ──
categories.patch("/reorder", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const schema = z.object({
    orders: z.array(
      z.object({ id: z.string(), sort_order: z.number().int() })
    ),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json(fail(parsed.error.message), 400);

  await Promise.all(
    parsed.data.orders.map(({ id, sort_order }) =>
      prisma.category.updateMany({
        where: { id, user_id: user.id },
        data: { sort_order },
      })
    )
  );

  return c.json(ok({ reordered: true }));
});

export default categories;

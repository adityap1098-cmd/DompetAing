import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { ok, fail } from "@dompetaing/shared";

const importRouter = new Hono();
importRouter.use("*", requireAuth);

// ── Parse CSV text → rows ──
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
  });
}

// ── Validate + enrich a single row ──
interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income" | "transfer";
  category?: string;
  account?: string;
  error?: string;
}

function parseRow(raw: Record<string, string>): ParsedRow {
  const dateStr = raw["date"] ?? "";
  const description = (raw["description"] ?? "").trim();
  const amountStr = raw["amount"] ?? "";
  const type = (raw["type"] ?? "").toLowerCase().trim();

  if (!dateStr) return { date: "", description, amount: 0, type: "expense", error: "Kolom date kosong" };
  if (!description) return { date: dateStr, description: "", amount: 0, type: "expense", error: "Kolom description kosong" };

  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) {
    return { date: dateStr, description, amount: 0, type: "expense", error: `Format tanggal tidak valid: ${dateStr}` };
  }

  const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));
  if (isNaN(amount) || amount <= 0) {
    return { date: dateStr, description, amount: 0, type: "expense", error: `Amount tidak valid: ${amountStr}` };
  }

  if (!["expense", "income", "transfer"].includes(type)) {
    return { date: dateStr, description, amount, type: "expense", error: `Type tidak valid: ${type}. Gunakan expense/income/transfer` };
  }

  return {
    date: dateObj.toISOString(),
    description,
    amount,
    type: type as "expense" | "income" | "transfer",
    category: raw["category"]?.trim() || undefined,
    account: raw["account"]?.trim() || undefined,
  };
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

// ── POST /import/preview ──
importRouter.post("/preview", async (c) => {
  let text: string;
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return c.json(fail("File tidak ditemukan"), 400);
    }
    const f = file as File;
    // Check file size BEFORE reading into memory
    if (f.size > MAX_FILE_BYTES) {
      return c.json(fail("File terlalu besar (max 5MB)"), 400);
    }
    text = await f.text();
  } catch {
    return c.json(fail("Gagal membaca file"), 400);
  }

  const rawRows = parseCsv(text);
  if (rawRows.length === 0) {
    return c.json(fail("File CSV kosong atau format tidak valid"), 400);
  }

  const rows = rawRows.map(parseRow);
  const valid = rows.filter((r) => !r.error).length;
  const invalid = rows.filter((r) => !!r.error).length;

  return c.json(ok({ valid, invalid, rows }));
});

// ── POST /import/csv ──
importRouter.post("/csv", async (c) => {
  const user = c.get("user");

  let text: string;
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return c.json(fail("File tidak ditemukan"), 400);
    }
    const f = file as File;
    if (f.size > MAX_FILE_BYTES) {
      return c.json(fail("File terlalu besar (max 5MB)"), 400);
    }
    text = await f.text();
  } catch {
    return c.json(fail("Gagal membaca file"), 400);
  }

  const rawRows = parseCsv(text);
  if (rawRows.length === 0) {
    return c.json(fail("File CSV kosong"), 400);
  }

  const rows = rawRows.map(parseRow);
  const validRows = rows.filter((r) => !r.error);

  if (validRows.length === 0) {
    return c.json(fail("Tidak ada baris yang valid"), 400);
  }

  // Preload user accounts and categories for matching
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ where: { user_id: user.id, is_active: true } }),
    prisma.category.findMany({ where: { user_id: user.id } }),
  ]);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of validRows) {
    try {
      // Match account by name (case-insensitive)
      let accountId: string | null = null;
      if (row.account) {
        const matched = accounts.find(
          (a) => a.name.toLowerCase() === row.account!.toLowerCase()
        );
        accountId = matched?.id ?? null;
      }
      // Default to first account if not matched
      if (!accountId && accounts.length > 0) {
        accountId = accounts[0].id;
      }
      if (!accountId) {
        skipped++;
        errors.push(`Baris "${row.description}": akun tidak ditemukan`);
        continue;
      }

      // Match category by name (case-insensitive)
      let categoryId: string | null = null;
      if (row.category) {
        const matched = categories.find(
          (cat) => cat.name.toLowerCase() === row.category!.toLowerCase()
        );
        categoryId = matched?.id ?? null;
      }

      await prisma.transaction.create({
        data: {
          user_id: user.id,
          amount: row.amount,
          type: row.type,
          description: row.description,
          date: new Date(row.date),
          account_id: accountId,
          category_id: categoryId,
          source: "manual",
          is_verified: true,
        },
      });

      imported++;
    } catch {
      skipped++;
      errors.push(`Baris "${row.description}": gagal disimpan`);
    }
  }

  return c.json(ok({ imported, skipped, errors }));
});

export default importRouter;

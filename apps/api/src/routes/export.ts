import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { requireFeature } from "../middleware/subscription.js";
import * as XLSX from "xlsx";

const exportRoutes = new Hono();
exportRoutes.use("*", requireAuth);
exportRoutes.use("*", requireFeature("export"));

// ── Shared query ──
async function fetchTransactions(userId: string, dateFrom: string, dateTo: string) {
  return prisma.transaction.findMany({
    where: {
      user_id: userId,
      date: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + "T23:59:59.999Z"),
      },
    },
    include: {
      account: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── POST /export/csv ──
exportRoutes.post("/csv", async (c) => {
  const user = c.get("user");
  const { date_from, date_to } = await c.req.json<{ date_from: string; date_to: string }>();
  if (!date_from || !date_to) return c.json({ success: false, error: "date_from dan date_to wajib diisi", data: null }, 400);

  const txns = await fetchTransactions(user.id, date_from, date_to);

  const rows = [
    ["Tanggal", "Jenis", "Jumlah", "Akun", "Kategori", "Keterangan"],
    ...txns.map((t) => [
      fmtDate(t.date),
      t.type,
      Number(t.amount),
      t.account?.name ?? "",
      t.category?.name ?? "",
      t.description,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const filename = `transaksi_${date_from}_${date_to}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// ── POST /export/excel ──
exportRoutes.post("/excel", async (c) => {
  const user = c.get("user");
  const { date_from, date_to } = await c.req.json<{ date_from: string; date_to: string }>();
  if (!date_from || !date_to) return c.json({ success: false, error: "date_from dan date_to wajib diisi", data: null }, 400);

  const txns = await fetchTransactions(user.id, date_from, date_to);

  // Sheet 1: Transactions
  const txnRows = [
    ["Tanggal", "Jenis", "Jumlah (Rp)", "Akun", "Kategori", "Keterangan"],
    ...txns.map((t) => [
      fmtDate(t.date),
      t.type === "expense" ? "Pengeluaran" : t.type === "income" ? "Pemasukan" : "Transfer",
      Number(t.amount),
      t.account?.name ?? "-",
      t.category?.name ?? "-",
      t.description,
    ]),
  ];

  // Sheet 2: Summary
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const summaryRows = [
    ["Ringkasan", ""],
    ["Periode", `${date_from} s/d ${date_to}`],
    ["Total Transaksi", txns.length],
    ["Total Pemasukan", income],
    ["Total Pengeluaran", expense],
    ["Selisih (Tabungan)", income - expense],
  ];

  const wb = XLSX.utils.book_new();
  const wsTxn = XLSX.utils.aoa_to_sheet(txnRows);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Column widths
  wsTxn["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 40 }];
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, wsTxn, "Transaksi");
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const filename = `transaksi_${date_from}_${date_to}.xlsx`;

  return new Response(blob, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// ── POST /export/pdf ──
// Returns print-friendly HTML — user opens in browser and prints as PDF
exportRoutes.post("/pdf", async (c) => {
  const user = c.get("user");
  const { date_from, date_to } = await c.req.json<{ date_from: string; date_to: string }>();
  if (!date_from || !date_to) return c.json({ success: false, error: "date_from dan date_to wajib diisi", data: null }, 400);

  const txns = await fetchTransactions(user.id, date_from, date_to);

  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savings = income - expense;

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  const rows = txns
    .map(
      (t) => `<tr>
      <td>${fmtDate(t.date)}</td>
      <td>${t.type === "expense" ? "Pengeluaran" : t.type === "income" ? "Pemasukan" : "Transfer"}</td>
      <td style="text-align:right">${fmt(Number(t.amount))}</td>
      <td>${t.account?.name ?? "-"}</td>
      <td>${t.category?.name ?? "-"}</td>
      <td>${t.description}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Transaksi DompetAing</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .period { color: #666; margin-bottom: 20px; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; }
  .summary-card { padding: 12px 20px; border: 1px solid #ddd; border-radius: 8px; min-width: 140px; }
  .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .5px; }
  .summary-card .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
  .income { color: #10b981; } .expense { color: #ef4444; } .savings { color: #3b82f6; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #666; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
<h1>Laporan Transaksi DompetAing</h1>
<p class="period">Periode: ${date_from} s/d ${date_to} &nbsp;·&nbsp; ${txns.length} transaksi</p>
<div class="summary">
  <div class="summary-card"><div class="label">Pemasukan</div><div class="value income">${fmt(income)}</div></div>
  <div class="summary-card"><div class="label">Pengeluaran</div><div class="value expense">${fmt(expense)}</div></div>
  <div class="summary-card"><div class="label">Selisih</div><div class="value savings">${fmt(savings)}</div></div>
</div>
<table>
  <thead><tr><th>Tanggal</th><th>Jenis</th><th style="text-align:right">Jumlah</th><th>Akun</th><th>Kategori</th><th>Keterangan</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const filename = `laporan_${date_from}_${date_to}.html`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

export default exportRoutes;

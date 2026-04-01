// src/components/transaction/TransactionForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import type { Transaction, TransactionType } from "@dompetaing/shared";
import type { CreateTransactionInput } from "@/hooks/useTransactions";

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (data: CreateTransactionInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "transfer", label: "Transfer" },
];

export function TransactionForm({
  transaction,
  onSubmit,
  onCancel,
  loading,
}: TransactionFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(
    transaction ? String(Math.round(transaction.amount)) : ""
  );
  const [accountId, setAccountId] = useState(transaction?.account_id ?? "");
  const [toAccountId, setToAccountId] = useState(transaction?.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [subCategoryId, setSubCategoryId] = useState(transaction?.sub_category_id ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(
    transaction ? transaction.date.slice(0, 10) : today
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!transaction?.notes);

  const { data: accounts } = useAccounts();
  const { data: allCategories } = useCategories();

  const categories = (allCategories ?? []).filter((cat) =>
    type === "expense"
      ? cat.type === "expense" || cat.type === "both"
      : cat.type === "income" || cat.type === "both"
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subCategories = selectedCategory?.sub_categories ?? [];

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategoryId("");
    setSubCategoryId("");
    setToAccountId("");
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    setSubCategoryId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!accountId) return;
    if (type === "transfer" && !toAccountId) return;

    const data: CreateTransactionInput = {
      amount: numAmount,
      type,
      account_id: accountId,
      description:
        description.trim() ||
        (type === "transfer"
          ? "Transfer"
          : type === "income"
          ? selectedCategory?.name ?? "Pemasukan"
          : selectedCategory?.name ?? "Pengeluaran"),
      date: new Date(date + "T00:00:00").toISOString(),
    };

    if (type !== "transfer") {
      if (categoryId) data.category_id = categoryId;
      if (subCategoryId) data.sub_category_id = subCategoryId;
    }
    if (type === "transfer") data.to_account_id = toAccountId;
    if (notes.trim()) data.notes = notes.trim();

    onSubmit(data);
  }

  // Shared input style — matches mockup field style
  const field =
    "w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] " +
    "bg-[#F0EEE9] dark:bg-[#242522] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] " +
    "focus:outline-none focus:border-accent-500 dark:focus:border-accent-dark " +
    "focus:bg-white dark:focus:bg-[#1C1D1A] transition-colors";

  const label = "block text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] mb-1 uppercase tracking-[0.06em]";

  const activeTypeColor =
    type === "expense"
      ? "bg-[#C94A1C] dark:bg-[#E87340]"
      : type === "income"
      ? "bg-[#1E8A5A] dark:bg-[#4CAF7A]"
      : "bg-accent-500 dark:bg-accent-dark";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-[17px] pt-3 pb-4">

      {/* ── Type tabs ── */}
      <div className="flex rounded-[10px] overflow-hidden bg-[#F0EEE9] dark:bg-[#242522] border border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.07)]">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleTypeChange(t.value)}
            className={[
              "flex-1 py-2 text-[11px] font-bold transition-all duration-150",
              type === t.value
                ? `${activeTypeColor} text-white rounded-[8px] mx-0.5 my-0.5`
                : "text-[#9E9B98] dark:text-[#4A4948]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Amount ── */}
      <div className="py-5 bg-[#F0EEE9] dark:bg-[#242522] rounded-[14px] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <AmountInput value={amount} onChange={setAmount} />
      </div>

      {/* ── Akun + Tanggal (2 col) ── */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>{type === "transfer" ? "Dari Akun" : "Akun"}</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field} required>
            <option value="">Pilih akun...</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
            required
          />
        </div>
      </div>

      {/* ── To Account (transfer only) ── */}
      {type === "transfer" && (
        <div>
          <label className={label}>Ke Akun</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={field} required>
            <option value="">Pilih akun tujuan...</option>
            {(accounts ?? []).filter((a) => a.id !== accountId).map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Kategori + Sub-kategori (2 col jika ada sub) ── */}
      {type !== "transfer" && (
        <div className={subCategories.length > 0 ? "grid grid-cols-2 gap-2" : ""}>
          <div>
            <label className={label}>Kategori</label>
            <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} className={field}>
              <option value="">Tanpa kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          {subCategories.length > 0 && (
            <div>
              <label className={label}>Sub-kategori</label>
              <select value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)} className={field}>
                <option value="">Semua</option>
                {subCategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Keterangan ── */}
      <div>
        <label className={label}>Keterangan</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={type === "transfer" ? "Transfer" : "Mis: Makan siang di warteg"}
          maxLength={255}
          className={field}
        />
      </div>

      {/* ── Catatan (opsional) ── */}
      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark text-left"
        >
          + Tambah catatan
        </button>
      ) : (
        <div>
          <label className={label}>Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan..."
            maxLength={1000}
            rows={2}
            className={field + " resize-none"}
          />
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {transaction ? "Simpan" : "Tambah"}
        </Button>
      </div>
    </form>
  );
}
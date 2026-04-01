import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useCategories } from "@/hooks/useCategories";
import type { Budget } from "@dompetaing/shared";

interface BudgetFormProps {
  /** When set, form is in edit-mode (amount only) */
  budget?: Budget;
  /** category_ids already budgeted for this period — excluded from add-mode select */
  existingCategoryIds?: string[];
  month: number;
  year: number;
  onSubmit: (data: { category_id: string; amount: number }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BudgetForm({
  budget,
  existingCategoryIds = [],
  month,
  year,
  onSubmit,
  onCancel,
  loading,
}: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? "");
  const [amount, setAmount] = useState(
    budget ? String(Math.round(budget.amount)) : ""
  );

  const { data: allCategories } = useCategories();

  // Only expense categories; in add-mode exclude already-budgeted ones
  const categories = (allCategories ?? []).filter(
    (c) =>
      (c.type === "expense" || c.type === "both") &&
      (budget ? true : !existingCategoryIds.includes(c.id))
  );

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!categoryId) return;
    onSubmit({ category_id: categoryId, amount: numAmount });
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] " +
    "bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] " +
    "focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-dark";

  const labelClass = "block text-[10px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4 pb-2">
      {/* Period info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-50 dark:bg-accent-100/20">
        <span className="text-sm">📅</span>
        <p className="text-xs font-semibold text-accent-500 dark:text-accent-dark">
          {monthNames[month - 1]} {year}
        </p>
      </div>

      {/* Category — only in add mode */}
      {!budget && (
        <div>
          <label className={labelClass}>Kategori</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Pilih kategori...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-1">
              Semua kategori sudah punya budget untuk bulan ini.
            </p>
          )}
        </div>
      )}

      {/* Category display — edit mode */}
      {budget && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F7F6F3] dark:bg-[#111210]/50 border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]">
          <span className="text-lg">{budget.category.icon}</span>
          <div>
            <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
              {budget.category.name}
            </p>
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Kategori budget</p>
          </div>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className={labelClass}>Limit Budget</label>
        <div className="py-3 px-2 bg-[#F7F6F3] dark:bg-[#111210]/50 rounded-2xl">
          <AmountInput value={amount} onChange={setAmount} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {budget ? "Simpan" : "Tambah"}
        </Button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { AmountNumpad } from "@/components/ui/AmountNumpad";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { useCategories } from "@/hooks/useCategories";
import type { Budget } from "@dompetaing/shared";

interface BudgetFormProps {
  budget?: Budget;
  existingCategoryIds?: string[];
  month: number;
  year: number;
  onSubmit: (data: { category_id: string; amount: number }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const { data: allCategories } = useCategories();

  const categories = (allCategories ?? []).filter(
    (c) =>
      (c.type === "expense" || c.type === "both") &&
      (budget ? true : !existingCategoryIds.includes(c.id))
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function handleSubmit() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!categoryId) return;
    onSubmit({ category_id: categoryId, amount: numAmount });
  }

  const label = "block text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] mb-1.5 uppercase tracking-[0.06em]";

  const fieldBtn = [
    "flex items-center gap-3 w-full px-3.5 py-3 rounded-[12px] text-left",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
    "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
  ].join(" ");

  return (
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-4">
      {/* Period info */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[12px]"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
      >
        <span className="text-[14px]">📅</span>
        <p className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
          {MONTH_NAMES[month - 1]} {year}
        </p>
      </div>

      {/* Category — picker in add mode, display in edit mode */}
      {!budget ? (
        <div>
          <label className={label}>Kategori</label>
          <button type="button" onClick={() => setShowCategoryPicker(true)} className={fieldBtn}>
            {selectedCategory ? (
              <>
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] shrink-0"
                  style={{ backgroundColor: `${selectedCategory.color}1A` }}
                >
                  {selectedCategory.icon}
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                  {selectedCategory.name}
                </span>
              </>
            ) : (
              <span className="text-[13px] text-[#9E9B98] dark:text-[#4A4948]">Pilih kategori...</span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98] shrink-0">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {categories.length === 0 && (
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-1.5 px-1">
              Semua kategori sudah punya budget untuk bulan ini.
            </p>
          )}
        </div>
      ) : (
        <div className={fieldBtn + " cursor-default"}>
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] shrink-0"
            style={{ backgroundColor: `${budget.category.color}1A` }}
          >
            {budget.category.icon}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
              {budget.category.name}
            </p>
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Kategori budget</p>
          </div>
        </div>
      )}

      {/* Amount with numpad */}
      <div>
        <label className={label}>Limit Budget</label>
        <AmountNumpad value={amount} onChange={setAmount} />
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={[
            "flex-1 py-3 rounded-[12px] text-[13px] font-bold",
            "bg-[#F0EEE9] dark:bg-[#242522] text-[#1A1917] dark:text-[#F0EEE9]",
            "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
            "active:scale-95 disabled:opacity-50",
          ].join(" ")}
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !categoryId || !amount || Number(amount) <= 0}
          className={[
            "flex-1 py-3 rounded-[12px] text-[13px] font-bold text-white",
            "transition-all active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
          style={{ backgroundColor: "var(--accent)" }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            </span>
          ) : budget ? "Simpan" : "Tambah"}
        </button>
      </div>

      {/* Category picker */}
      <CategoryPicker
        isOpen={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        categories={categories}
        selectedId={categoryId}
        onSelect={(catId) => setCategoryId(catId)}
        allowNone={false}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import type { TransactionType } from "@dompetaing/shared";

export interface FilterValues {
  type: "all" | TransactionType;
  category_id: string;
  account_id: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
}

export const DEFAULT_FILTERS: FilterValues = {
  type: "all",
  category_id: "",
  account_id: "",
  date_from: "",
  date_to: "",
  amount_min: "",
  amount_max: "",
};

export function countActiveFilters(f: FilterValues): number {
  return [
    f.type !== "all",
    !!f.category_id,
    !!f.account_id,
    !!f.date_from,
    !!f.date_to,
    !!f.amount_min,
    !!f.amount_max,
  ].filter(Boolean).length;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  values: FilterValues;
  onApply: (values: FilterValues) => void;
}

const TYPE_OPTIONS: { value: FilterValues["type"]; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "transfer", label: "Transfer" },
];

export function FilterPanel({ isOpen, onClose, values, onApply }: FilterPanelProps) {
  const [local, setLocal] = useState<FilterValues>(values);

  // Sync when panel opens
  useEffect(() => {
    if (isOpen) setLocal(values);
  }, [isOpen, values]);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  function set<K extends keyof FilterValues>(key: K, val: FilterValues[K]) {
    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  function handleApply() {
    onApply(local);
    onClose();
  }

  function handleReset() {
    setLocal(DEFAULT_FILTERS);
    onApply(DEFAULT_FILTERS);
    onClose();
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] " +
    "bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] " +
    "focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-dark";

  const sectionLabel = "text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] uppercase tracking-wide mb-2";

  const activeCount = countActiveFilters(local);

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] flex flex-col",
          "bg-white dark:bg-[#1C1D1A] rounded-t-2xl shadow-xl",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#9E9B98] dark:bg-[#4A4948]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] shrink-0">
          <h2 className="text-base font-bold text-[#1A1917] dark:text-[#F0EEE9]">
            Filter Transaksi
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#9E9B98] dark:text-[#4A4948] hover:text-[#6B6864] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        {isOpen && (
        <div className="overflow-y-auto flex-1 overscroll-contain px-4 py-4 space-y-5">
          {/* Type */}
          <section>
            <p className={sectionLabel}>Tipe</p>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("type", opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    local.type === opt.value
                      ? "bg-accent-500 dark:bg-accent-dark border-accent-500 dark:border-accent-dark text-white"
                      : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96] hover:border-[rgba(0,0,0,0.15)] dark:hover:border-[rgba(255,255,255,0.15)]",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Date range */}
          <section>
            <p className={sectionLabel}>Rentang Tanggal</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#9E9B98] dark:text-[#4A4948] mb-1">Dari</label>
                <input
                  type="date"
                  value={local.date_from}
                  onChange={(e) => set("date_from", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#9E9B98] dark:text-[#4A4948] mb-1">Sampai</label>
                <input
                  type="date"
                  value={local.date_to}
                  onChange={(e) => set("date_to", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Category */}
          <section>
            <p className={sectionLabel}>Kategori</p>
            <select
              value={local.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className={inputClass}
            >
              <option value="">Semua kategori</option>
              {(categories ?? []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </section>

          {/* Account */}
          <section>
            <p className={sectionLabel}>Akun</p>
            <select
              value={local.account_id}
              onChange={(e) => set("account_id", e.target.value)}
              className={inputClass}
            >
              <option value="">Semua akun</option>
              {(accounts ?? []).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name}
                </option>
              ))}
            </select>
          </section>

          {/* Amount range */}
          <section>
            <p className={sectionLabel}>Rentang Nominal</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#9E9B98] dark:text-[#4A4948] mb-1">Min (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={local.amount_min}
                  onChange={(e) => set("amount_min", e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#9E9B98] dark:text-[#4A4948] mb-1">Maks (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={local.amount_max}
                  onChange={(e) => set("amount_max", e.target.value)}
                  placeholder="∞"
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </div>
        )}

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[12px] font-semibold text-[#6B6864] dark:text-[#9E9B96] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-accent-500 dark:bg-accent-dark text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Terapkan{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

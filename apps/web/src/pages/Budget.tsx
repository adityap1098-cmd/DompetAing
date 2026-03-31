import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { showToast } from "@/components/ui/Toast";
import { formatRupiah, formatDate, formatPercent } from "@/lib/format";
import {
  useBudgets,
  useBudgetDetail,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useCopyBudget,
} from "@/hooks/useBudgets";
import { useSubscription } from "@/hooks/useSubscription";
import type { Budget } from "@dompetaing/shared";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const ALERT_THRESHOLD = 80;

// ── Donut chart (pure SVG) ──
function DonutChart({ percentage, color, size = 88 }: { percentage: number; color: string; size?: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" className="-rotate-90">
      <circle cx={56} cy={56} r={r} fill="none" strokeWidth="13"
        stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
      {percentage > 0 && (
        <circle cx={56} cy={56} r={r} fill="none" strokeWidth="13"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`} />
      )}
    </svg>
  );
}

// ── Progress bar ──
function ProgressBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[#F0EEE9] dark:bg-[#242522] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: percentage > 100 ? "#ef4444" : color }}
      />
    </div>
  );
}

// ── Budget item with expandable drill-down ──
function BudgetItem({
  budget, isExpanded, onToggle, onEdit, onDelete,
}: {
  budget: Budget;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (b: Budget) => void;
  onDelete: (b: Budget) => void;
}) {
  const { data: detail, isLoading: detailLoading } = useBudgetDetail(
    isExpanded ? budget.id : ""
  );

  const isExceeded = budget.percentage >= 100;
  const isAlert = budget.percentage >= ALERT_THRESHOLD && !isExceeded;
  const barColor = isExceeded ? "#ef4444" : isAlert ? "#f59e0b" : budget.category.color;

  return (
    <div className="border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
      {/* Main row */}
      <button type="button" onClick={onToggle}
        className="w-full px-[17px] py-3 flex items-start gap-3 text-left hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: budget.category.color + "20" }}>
          {budget.category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">{budget.category.name}</p>
              {isAlert && <span className="text-xs">⚠️</span>}
              {isExceeded && <span className="text-[10px] font-bold text-[#C94A1C] dark:text-[#E87340]">Melewati!</span>}
            </div>
            <p className="font-mono text-[11px] font-semibold" style={{ color: barColor }}>
              {formatRupiah(budget.spent, { compact: true })} / {formatRupiah(budget.amount, { compact: true })}
            </p>
          </div>
          <ProgressBar percentage={budget.percentage} color={barColor} />
        </div>
        <svg className={["w-4 h-4 text-[#9E9B98] dark:text-[#4A4948] shrink-0 mt-2.5 transition-transform duration-200",
          isExpanded ? "rotate-180" : ""].join(" ")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Drill-down panel */}
      {isExpanded && (
        <div className="bg-[#F0EEE9] dark:bg-[#242522] border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          {/* Action buttons */}
          <div className="flex gap-2 px-[17px] pt-3 pb-2">
            <button type="button" onClick={() => onEdit(budget)}
              className="flex-1 py-1.5 rounded-[8px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] bg-white dark:bg-[#1C1D1A] hover:opacity-80 transition-opacity">
              ✏️ Edit
            </button>
            <button type="button" onClick={() => onDelete(budget)}
              className="flex-1 py-1.5 rounded-[8px] border border-[#C94A1C]/30 dark:border-[#E87340]/30 text-[10px] font-semibold text-[#C94A1C] dark:text-[#E87340] bg-white dark:bg-[#1C1D1A] hover:opacity-80 transition-opacity">
              🗑 Hapus
            </button>
          </div>

          {detailLoading ? (
            <div className="flex justify-center py-5">
              <div className="animate-spin h-5 w-5 border-2 border-accent-500 border-t-transparent rounded-full" />
            </div>
          ) : detail ? (
            <div className="px-[17px] pb-4 space-y-3">
              {detail.sub_breakdown.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] uppercase tracking-[0.05em] mb-2">Breakdown</p>
                  <div className="space-y-2">
                    {detail.sub_breakdown.map((sub) => (
                      <div key={sub.sub_category_id ?? "none"} className="flex items-center gap-2">
                        <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] w-20 truncate shrink-0">{sub.sub_category_name}</p>
                        <div className="flex-1 h-1.5 rounded-full bg-[#E8E6E0] dark:bg-[#2C2D2A] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(sub.percentage, 100)}%`, backgroundColor: budget.category.color }} />
                        </div>
                        <p className="font-mono text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] w-16 text-right shrink-0">
                          {formatRupiah(sub.spent, { compact: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detail.recent_transactions.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] uppercase tracking-[0.05em] mb-2">Transaksi Terakhir</p>
                  <div className="space-y-1.5">
                    {detail.recent_transactions.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between py-0.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">{txn.description}</p>
                          <p className="text-[9px] text-[#6B6864] dark:text-[#9E9B96]">
                            {formatDate(txn.date, "short")} · {txn.account.icon} {txn.account.name}
                          </p>
                        </div>
                        <p className="font-mono text-[10px] font-semibold text-[#C94A1C] dark:text-[#E87340] ml-2 shrink-0">
                          -{formatRupiah(txn.amount, { compact: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detail.sub_breakdown.length === 0 && detail.recent_transactions.length === 0 && (
                <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center py-2">Belum ada transaksi di periode ini</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Upgrade prompt ──
function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center text-center py-6 px-6">
      <span className="text-3xl mb-2">🔒</span>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Batas Budget Gratis (3)</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Upgrade untuk budget tak terbatas.</p>
      <Link to="/subscription"
        className="bg-accent-500 dark:bg-accent-dark text-white px-4 py-2 rounded-btn text-xs font-semibold hover:opacity-90 transition-opacity">
        ✨ Upgrade ke Premium
      </Link>
    </div>
  );
}

// ── Main page ──
export function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError } = useBudgets(month, year);
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const copyBudget = useCopyBudget();
  const { limits, isPremium } = useSubscription();

  const budgets = data?.budgets ?? [];
  const atFreeLimit = !isPremium && limits.currentBudgets >= (limits.maxBudgets ?? 3);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setExpandedId(null);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setExpandedId(null);
  }

  const prevMonthNum = month === 1 ? 12 : month - 1;
  const prevMonthYear = month === 1 ? year - 1 : year;
  const prevMonthName = MONTH_NAMES[prevMonthNum - 1];
  const { data: prevMonthData } = useBudgets(prevMonthNum, prevMonthYear);
  // null = still loading, false = no budgets, true = has budgets
  const hasPrevBudgets: boolean | null = prevMonthData
    ? prevMonthData.budgets.length > 0
    : null;

  function handleCreate(formData: { category_id: string; amount: number }) {
    createBudget.mutate(
      { category_id: formData.category_id, amount: formData.amount, period_type: "monthly", period_month: month, period_year: year },
      {
        onSuccess: () => { setIsAddOpen(false); showToast("Budget berhasil ditambahkan"); },
        onError: (err) => showToast(err.message, "error"),
      }
    );
  }

  function handleUpdate(formData: { category_id: string; amount: number }) {
    if (!editingBudget) return;
    updateBudget.mutate(
      { id: editingBudget.id, amount: formData.amount },
      {
        onSuccess: () => { setEditingBudget(null); showToast("Budget diperbarui"); },
        onError: (err) => showToast(err.message, "error"),
      }
    );
  }

  function handleDelete() {
    if (!deletingBudget) return;
    deleteBudget.mutate(deletingBudget.id, {
      onSuccess: () => { setDeletingBudget(null); setExpandedId(null); showToast("Budget dihapus"); },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function handleCopyPrevious() {
    const fromMonth = month === 1 ? 12 : month - 1;
    const fromYear = month === 1 ? year - 1 : year;
    copyBudget.mutate(
      { from_month: fromMonth, from_year: fromYear, to_month: month, to_year: year },
      {
        onSuccess: (res) => showToast(`${res.copied} budget disalin dari ${prevMonthName}`),
        onError: (err) => showToast(err.message, "error"),
      }
    );
  }

  const overallPct = data?.percentage ?? 0;
  const overallColor = overallPct >= 100 ? "#ef4444" : overallPct >= ALERT_THRESHOLD ? "#f59e0b" : "var(--accent)";
  const existingCategoryIds = budgets.map((b) => b.category_id);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header with month nav */}
      <Header
        title="Budget"
        right={
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={prevMonth} aria-label="Bulan sebelumnya"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
              {MONTH_NAMES[month - 1].slice(0, 3)} {year}
            </span>
            <button type="button" onClick={nextMonth} aria-label="Bulan berikutnya"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        }
      />

      {isLoading || (isFetching && budgets.length === 0) ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="animate-spin h-7 w-7 border-2 border-accent-500 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 gap-3">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gagal memuat budget</p>
          <p className="text-xs text-gray-400">Periksa koneksi dan coba lagi</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex-1">
          <EmptyState icon="🎯" title="Belum ada budget"
            description={`Set budget ${MONTH_NAMES[month - 1]} ${year} untuk kontrol pengeluaran`} />
          <div className="px-6 pb-6">
            <button type="button" onClick={handleCopyPrevious}
              disabled={copyBudget.isPending || hasPrevBudgets === false}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {copyBudget.isPending
                ? "Menyalin..."
                : hasPrevBudgets === false
                ? `Tidak ada budget di ${prevMonthName}`
                : `📋 Salin dari ${prevMonthName} ${prevMonthYear}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 pb-24">
          {/* Overall summary card */}
          <div className="px-[17px] pt-4 pb-3">
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] p-3.5 border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">{MONTH_NAMES[month - 1]} {year}</p>
                <span
                  className="text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ color: overallColor, backgroundColor: overallColor + "20" }}
                >
                  {Math.round(overallPct)}% terpakai
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <DonutChart percentage={overallPct} color={overallColor} size={80} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="font-mono text-[14px] font-bold" style={{ color: overallColor }}>
                      {Math.round(overallPct)}%
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Total</span>
                    <span className="font-mono text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                      {formatRupiah(data?.total_budget ?? 0, { compact: true })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Terpakai</span>
                    <span className="font-mono text-[11px] font-semibold" style={{ color: overallColor }}>
                      {formatRupiah(data?.total_spent ?? 0, { compact: true })}
                    </span>
                  </div>
                </div>
              </div>
              {overallPct >= ALERT_THRESHOLD && overallPct < 100 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-amber-50 dark:bg-amber-900/20">
                  <span className="text-xs">⚠️</span>
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    Pengeluaran {Math.round(overallPct)}% dari budget
                  </p>
                </div>
              )}
              {overallPct >= 100 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#C94A1C]/10 dark:bg-[#E87340]/10">
                  <span className="text-xs">🔴</span>
                  <p className="text-[10px] font-semibold text-[#C94A1C] dark:text-[#E87340]">
                    Pengeluaran melebihi budget!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Feature gate banner */}
          {atFreeLimit && (
            <div className="mx-[17px] mb-3 rounded-[14px] border border-dashed border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]">
              <UpgradePrompt />
            </div>
          )}

          {/* Section header */}
          <div className="px-[17px] pb-2">
            <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Kategori Budget</p>
          </div>

          {/* Budget list */}
          <div className="mx-[17px] bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden mb-3">
            {budgets.map((budget) => (
              <BudgetItem
                key={budget.id}
                budget={budget}
                isExpanded={expandedId === budget.id}
                onToggle={() => setExpandedId((prev) => (prev === budget.id ? null : budget.id))}
                onEdit={setEditingBudget}
                onDelete={setDeletingBudget}
              />
            ))}
          </div>

          {/* Copy previous month */}
          <div className="px-[17px] pt-1">
            <button type="button" onClick={handleCopyPrevious}
              disabled={copyBudget.isPending || hasPrevBudgets === false}
              className="w-full py-2.5 rounded-[10px] border border-dashed border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.12)] text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] bg-white dark:bg-[#1C1D1A] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {copyBudget.isPending
                ? "Menyalin..."
                : hasPrevBudgets === false
                ? `Tidak ada budget di ${prevMonthName}`
                : `📋 Salin dari ${prevMonthName} ${prevMonthYear}`}
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      {!atFreeLimit && (
        <button type="button" onClick={() => setIsAddOpen(true)} aria-label="Tambah budget"
          className="fixed bottom-20 right-4 z-40 w-[50px] h-[50px] rounded-full bg-accent-500 dark:bg-accent-dark text-white shadow-[0_4px_14px_rgba(46,125,90,0.38)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" className="w-5 h-5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {/* Add modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Budget">
        <BudgetForm
          key={isAddOpen ? "open" : "closed"}
          existingCategoryIds={existingCategoryIds}
          month={month} year={year}
          onSubmit={handleCreate}
          onCancel={() => setIsAddOpen(false)}
          loading={createBudget.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editingBudget} onClose={() => setEditingBudget(null)} title="Edit Budget">
        {editingBudget && (
          <BudgetForm
            key={editingBudget.id}
            budget={editingBudget}
            month={month} year={year}
            onSubmit={handleUpdate}
            onCancel={() => setEditingBudget(null)}
            loading={updateBudget.isPending}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deletingBudget}
        onClose={() => setDeletingBudget(null)}
        onConfirm={handleDelete}
        title="Hapus Budget?"
        description={
          deletingBudget
            ? `Budget "${deletingBudget.category.name}" (${formatRupiah(deletingBudget.amount)}) akan dihapus.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
      />
    </div>
  );
}

import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { TransactionForm } from "@/components/transaction/TransactionForm";
import { FilterPanel, DEFAULT_FILTERS, countActiveFilters } from "@/components/transaction/FilterPanel";
import type { FilterValues } from "@/components/transaction/FilterPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  useTransactions,
  useTransactionTotal,
  useCreateTransaction,
  useDeleteTransaction,
} from "@/hooks/useTransactions";
import type { Transaction } from "@dompetaing/shared";
import type { CreateTransactionInput } from "@/hooks/useTransactions";

export function TransactionsPage() {
  const navigate = useNavigate();

  // ── Filter state ──
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Transaction | null>(null);

  // Undo-delete: id → setTimeout handle
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }

  function handleApplyFilters(newFilters: FilterValues) {
    setFilters(newFilters);
    setPage(1);
  }

  // Build API query from UI state
  const queryFilters = {
    page,
    limit: 30,
    ...(filters.type !== "all" ? { type: filters.type } : {}),
    ...(filters.category_id ? { category_id: filters.category_id } : {}),
    ...(filters.account_id ? { account_id: filters.account_id } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.amount_min ? { amount_min: Number(filters.amount_min) } : {}),
    ...(filters.amount_max ? { amount_max: Number(filters.amount_max) } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  // Total filter params (no page/limit) — for the aggregate query
  const totalFilters = {
    ...(filters.type !== "all" ? { type: filters.type } : {}),
    ...(filters.category_id ? { category_id: filters.category_id } : {}),
    ...(filters.account_id ? { account_id: filters.account_id } : {}),
    ...(filters.date_from ? { date_from: filters.date_from } : {}),
    ...(filters.date_to ? { date_to: filters.date_to } : {}),
    ...(filters.amount_min ? { amount_min: Number(filters.amount_min) } : {}),
    ...(filters.amount_max ? { amount_max: Number(filters.amount_max) } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const { data, isLoading } = useTransactions(queryFilters);
  const { data: totalData } = useTransactionTotal(totalFilters);
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const activeFilterCount = countActiveFilters(filters) + (debouncedSearch ? 1 : 0);

  const items = useMemo(
    () => (data?.items ?? []).filter((t) => !pendingDeleteIds.has(t.id)),
    [data?.items, pendingDeleteIds]
  );

  // Group by date
  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of items) {
      const dateKey = t.date.slice(0, 10);
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(t);
    }
    return Array.from(groups.entries());
  }, [items]);

  function handleCreate(data: CreateTransactionInput) {
    createTransaction.mutate(data, {
      onSuccess: () => {
        setIsAddOpen(false);
        showToast("Transaksi berhasil ditambahkan");
      },
      onError: (err) => {
        showToast(err.message, "error");
      },
    });
  }

  function handleConfirmDelete() {
    if (!confirmingDelete) return;
    const txn = confirmingDelete;
    setConfirmingDelete(null);

    // Optimistically hide
    setPendingDeleteIds((prev) => new Set([...prev, txn.id]));

    const timerId = setTimeout(() => {
      deleteTransaction.mutate(txn.id, {
        onError: () => {
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(txn.id);
            return next;
          });
          showToast("Gagal menghapus transaksi", "error");
        },
      });
      pendingDeletes.current.delete(txn.id);
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(txn.id);
        return next;
      });
    }, 3500);

    pendingDeletes.current.set(txn.id, timerId);

    showToast(
      "Transaksi dihapus",
      "success",
      {
        label: "Batalkan",
        onClick: () => {
          const timer = pendingDeletes.current.get(txn.id);
          if (timer) clearTimeout(timer);
          pendingDeletes.current.delete(txn.id);
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(txn.id);
            return next;
          });
        },
      },
      3500
    );
  }

  const isEmpty = !isLoading && items.length === 0;
  const hasActiveFilter = activeFilterCount > 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Transaksi"
        right={
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            aria-label="Filter"
            className="relative w-7 h-7 flex items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[#6B6864] dark:text-[#9E9B96] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-500 dark:bg-accent-dark text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        }
      />

      {/* Search */}
      <div className="px-[17px] pt-3 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[11px] h-[11px] text-[#9E9B98] dark:text-[#4A4948]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari transaksi..."
            className="w-full pl-8 pr-4 py-2 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[11px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:border-accent-500 dark:focus:border-accent-dark placeholder:text-[#9E9B98] dark:placeholder:text-[#4A4948]"
          />
          {search && (
            <button type="button" onClick={() => handleSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9B98] text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-1.5 px-[17px] pb-3 overflow-x-auto no-scrollbar items-center">
        {(["all", "income", "expense", "transfer"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setFilters(f => ({ ...f, type: t })); setPage(1); }}
            className={[
              "flex-shrink-0 px-3 py-1.5 rounded-[12px] text-[10px] font-semibold transition-colors",
              filters.type === t
                ? "bg-accent-500 dark:bg-accent-dark text-white"
                : "bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
            ].join(" ")}
          >
            {t === "all" ? "Semua" : t === "income" ? "Pemasukan" : t === "expense" ? "Pengeluaran" : "Transfer"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate("/recurring")}
          className="flex-shrink-0 px-3 py-1.5 rounded-[12px] text-[10px] font-semibold bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-accent-500 dark:text-accent-dark"
        >
          Berulang →
        </button>
        {activeFilterCount > 1 && (
          <button
            type="button"
            onClick={() => { setFilters(DEFAULT_FILTERS); handleSearchChange(""); setPage(1); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-[12px] text-[10px] font-semibold bg-[#C94A1C]/10 text-[#C94A1C] dark:bg-[#E87340]/10 dark:text-[#E87340]"
          >
            Reset ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="animate-spin h-7 w-7 border-2 border-accent-500 border-t-transparent rounded-full" />
        </div>
      ) : isEmpty ? (
        <div className="flex-1">
          <EmptyState
            icon="📋"
            title="Belum ada transaksi"
            description={
              hasActiveFilter
                ? "Tidak ada transaksi yang sesuai filter"
                : "Tap tombol + untuk menambah transaksi pertama kamu"
            }
          />
        </div>
      ) : (
        <div className="flex-1 pb-24">
          {/* Result summary */}
          <div className="px-[17px] pb-2 flex items-center justify-between">
            <p className="text-[9px] font-semibold text-[#9E9B98] dark:text-[#4A4948] uppercase tracking-[0.04em]">
              {data?.meta.total ?? items.length} transaksi
            </p>
            {totalData && hasActiveFilter && (
              <p className="font-mono text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                {formatRupiah(totalData.total_amount)}
              </p>
            )}
          </div>

          {/* Grouped list */}
          {grouped.map(([dateKey, txns]) => (
            <div key={dateKey}>
              <div className="px-[17px] py-1.5 sticky top-14">
                <p className="text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] uppercase tracking-[0.05em]">
                  {formatDate(dateKey, "long")}
                </p>
              </div>
              {txns.map((txn) => (
                <TransactionItem
                  key={txn.id}
                  transaction={txn}
                  onClick={() => navigate(`/transactions/${txn.id}`)}
                  onDelete={() => setConfirmingDelete(txn)}
                  isPendingDelete={pendingDeleteIds.has(txn.id)}
                />
              ))}
            </div>
          ))}

          {data?.meta.has_next && (
            <div className="px-[17px] pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] bg-white dark:bg-[#1C1D1A] hover:opacity-80 transition-opacity"
              >
                Muat lebih banyak
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        values={filters}
        onApply={handleApplyFilters}
      />

      {/* Add Transaction Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Transaksi">
        <TransactionForm
          key={isAddOpen ? "open" : "closed"}
          onSubmit={handleCreate}
          onCancel={() => setIsAddOpen(false)}
          loading={createTransaction.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Transaksi?"
        description={
          confirmingDelete
            ? `"${confirmingDelete.description}" — ${
                confirmingDelete.type === "income" ? "+" : confirmingDelete.type === "expense" ? "-" : ""
              }${formatRupiah(confirmingDelete.amount)}`
            : ""
        }
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
      />
    </div>
  );
}

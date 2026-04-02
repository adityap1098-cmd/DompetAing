import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { DebtForm } from "@/components/debt/DebtForm";
import { DebtItem } from "@/components/debt/DebtItem";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { formatRupiah } from "@/lib/format";
import { showToast } from "@/components/ui/Toast";
import { useAccounts } from "@/hooks/useAccounts";
import {
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  usePayDebt,
  useUnpayDebt,
  type CreateDebtInput,
} from "@/hooks/useDebts";
import type { Debt } from "@dompetaing/shared";

type Tab = "all" | "hutang" | "piutang" | "paid";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "hutang", label: "Hutang" },
  { id: "piutang", label: "Piutang" },
  { id: "paid", label: "Lunas" },
];

export function DebtsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null);

  // Pay dialog state
  const [payAutoRecord, setPayAutoRecord] = useState(true);
  const [payAccountId, setPayAccountId] = useState("");

  const queryParams = {
    type: (tab === "hutang" ? "hutang" : tab === "piutang" ? "piutang" : undefined) as
      | "hutang"
      | "piutang"
      | undefined,
    status: (tab === "paid" ? "paid" : tab === "all" ? "all" : "active") as
      | "active"
      | "paid"
      | "all",
  };

  const { data, isLoading } = useDebts(queryParams);
  const { data: accountsData } = useAccounts();
  const accounts = accountsData ?? [];

  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();
  const payDebtMutation = usePayDebt();
  const unpayDebtMutation = useUnpayDebt();

  const debts = data?.debts ?? [];
  const summary = data?.summary;

  function handleCreate(input: CreateDebtInput) {
    createDebt.mutate(input, {
      onSuccess: () => {
        setShowAddModal(false);
        showToast("Berhasil ditambahkan", "success");
      },
      onError: () => showToast("Gagal menyimpan", "error"),
    });
  }

  function handleUpdate(input: CreateDebtInput) {
    if (!editDebt) return;
    updateDebt.mutate(
      { id: editDebt.id, ...input },
      {
        onSuccess: () => {
          setEditDebt(null);
          showToast("Berhasil diperbarui", "success");
        },
        onError: () => showToast("Gagal menyimpan", "error"),
      }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteDebt.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        showToast("Dihapus", "success");
      },
      onError: () => showToast("Gagal menghapus", "error"),
    });
  }

  function openPayDialog(debt: Debt) {
    setPayDebt(debt);
    setPayAutoRecord(debt.auto_record);
    setPayAccountId(accounts[0]?.id ?? "");
  }

  function handlePay() {
    if (!payDebt) return;
    payDebtMutation.mutate(
      {
        id: payDebt.id,
        auto_record: payAutoRecord,
        account_id: payAutoRecord ? payAccountId : undefined,
      },
      {
        onSuccess: (res) => {
          setPayDebt(null);
          const txnMsg = res.transaction ? " + transaksi dicatat" : "";
          showToast(`Lunas${txnMsg} ✓`, "success");
        },
        onError: (err) =>
          showToast((err as Error).message ?? "Gagal", "error"),
      }
    );
  }

  function handleUnpay(debt: Debt) {
    unpayDebtMutation.mutate(debt.id, {
      onSuccess: (res) => {
        const revertMsg = res.deleted_transaction_ids.length > 0 ? " + transaksi dihapus" : "";
        showToast(`Batal lunas${revertMsg}`, "success");
      },
      onError: () => showToast("Gagal", "error"),
    });
  }

  return (
    <div className="flex flex-col pb-24">
      <Header title="Hutang & Piutang" />

      <div className="pt-4 pb-24">
        {/* Summary card */}
        {summary && (summary.hutang_active_count > 0 || summary.piutang_active_count > 0) && (
          <div className="grid grid-cols-2 gap-2.5 px-[17px] mb-3">
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
              <p className="text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] uppercase tracking-wide mb-1">Total Hutang</p>
              <p className="font-mono text-[13px] font-semibold text-[#C94A1C] dark:text-[#E87340]">
                {formatRupiah(summary.total_hutang, { compact: true })}
              </p>
              <p className="text-[9px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">{summary.hutang_active_count} aktif</p>
            </div>
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
              <p className="text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] uppercase tracking-wide mb-1">Total Piutang</p>
              <p className="font-mono text-[13px] font-semibold text-[#1E8A5A] dark:text-[#4CAF7A]">
                {formatRupiah(summary.total_piutang, { compact: true })}
              </p>
              <p className="text-[9px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">{summary.piutang_active_count} aktif</p>
            </div>
          </div>
        )}

        {/* Overdue alert */}
        {summary && summary.overdue_count > 0 && (
          <div className="mx-[17px] mb-3 bg-[#C94A1C]/10 dark:bg-[#E87340]/10 rounded-[12px] px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <p className="text-[11px] font-semibold text-[#C94A1C] dark:text-[#E87340]">
              {summary.overdue_count} hutang/piutang lewat jatuh tempo
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 px-[17px] pb-3 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "flex-shrink-0 px-3 py-1.5 rounded-[12px] text-[10px] font-semibold transition-colors",
                tab === t.id
                  ? "bg-accent-500 dark:bg-accent-dark text-white"
                  : "bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mx-[17px] bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          {isLoading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-[17px] py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] last:border-b-0">
                  <Skeleton className="w-9 h-9 rounded-[10px] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3.5 w-20 rounded" />
                </div>
              ))}
            </div>
          ) : debts.length === 0 ? (
            <div className="py-8 px-4">
              <EmptyState
                icon="🤝"
                title="Belum ada hutang/piutang"
                description={
                  tab === "paid" ? "Belum ada yang sudah lunas"
                  : tab === "hutang" ? "Belum ada hutang aktif"
                  : tab === "piutang" ? "Belum ada piutang aktif"
                  : "Catat hutang dan piutang kamu di sini"
                }
              />
            </div>
          ) : (
            <div>
              {debts.map((d) => (
                <DebtItemRow
                  key={d.id}
                  debt={d}
                  onPay={() => openPayDialog(d)}
                  onUnpay={() => handleUnpay(d)}
                  onEdit={() => setEditDebt(d)}
                  onDelete={() => setDeleteTarget(d)}
                  isPaying={unpayDebtMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Hutang/Piutang"
      >
        <DebtForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddModal(false)}
          loading={createDebt.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editDebt}
        onClose={() => setEditDebt(null)}
        title="Edit Hutang/Piutang"
      >
        {editDebt && (
          <DebtForm
            debt={editDebt}
            onSubmit={handleUpdate}
            onCancel={() => setEditDebt(null)}
            loading={updateDebt.isPending}
          />
        )}
      </Modal>

      {/* Pay Confirmation Dialog */}
      <Modal
        isOpen={!!payDebt}
        onClose={() => setPayDebt(null)}
        title={payDebt?.type === "hutang" ? "Tandai Lunas — Hutang" : "Tandai Lunas — Piutang"}
      >
        {payDebt && (
          <div className="space-y-4">
            <div className="bg-[#F7F6F3] dark:bg-[#1C1D1A] rounded-[12px] px-4 py-3 border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]">
              <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
                {payDebt.type === "hutang" ? "Hutang ke" : "Piutang dari"}
              </p>
              <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">{payDebt.person_name}</p>
              <p className="font-mono text-[15px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mt-1">
                {formatRupiah(payDebt.amount)}
              </p>
            </div>

            {/* Auto record toggle */}
            <label className="flex items-center justify-between py-1">
              <div>
                <p className="text-[12px] font-medium text-[#1A1917] dark:text-[#F0EEE9]">
                  Catat sebagai transaksi
                </p>
                <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
                  {payDebt.type === "hutang"
                    ? "Buat transaksi pengeluaran otomatis"
                    : "Buat transaksi pemasukan otomatis"}
                </p>
              </div>
              <input
                type="checkbox"
                checked={payAutoRecord}
                onChange={(e) => setPayAutoRecord(e.target.checked)}
                className="w-4 h-4 accent-accent-500"
              />
            </label>

            {/* Account select */}
            {payAutoRecord && (
              <div>
                <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
                  {payDebt.type === "hutang" ? "Bayar dari akun" : "Terima ke akun"}
                </label>
                {accounts.length === 0 ? (
                  <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Tidak ada akun tersedia</p>
                ) : (
                  <select
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-[#F7F6F3] dark:bg-[#111210] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPayDebt(null)}
                className="flex-1 py-2.5 rounded-[12px] bg-[#F0EEE9] dark:bg-[#242522] text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={payDebtMutation.isPending || (payAutoRecord && !payAccountId)}
                onClick={handlePay}
                className="flex-1 py-2.5 rounded-[12px] bg-accent-500 dark:bg-accent-dark text-white text-[12px] font-semibold disabled:opacity-50"
              >
                {payDebtMutation.isPending ? "..." : "Tandai Lunas"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Hutang/Piutang"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">
              Hapus {deleteTarget.type === "hutang" ? "hutang" : "piutang"} ke{" "}
              <strong className="text-[#1A1917] dark:text-[#F0EEE9]">
                {deleteTarget.person_name}
              </strong>{" "}
              sebesar{" "}
              <strong>{formatRupiah(deleteTarget.amount)}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-[12px] bg-[#F0EEE9] dark:bg-[#242522] text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteDebt.isPending}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-[12px] bg-[#C94A1C]/10 text-[#C94A1C] dark:text-[#E87340] text-[12px] font-semibold disabled:opacity-50"
              >
                {deleteDebt.isPending ? "..." : "Hapus"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── DebtItemRow: item + inline action buttons ──
interface DebtItemRowProps {
  debt: Debt;
  onPay: () => void;
  onUnpay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPaying: boolean;
}

function DebtItemRow({ debt, onPay, onUnpay, onEdit, onDelete, isPaying }: DebtItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <DebtItem debt={debt} onClick={() => setExpanded((v) => !v)} />
      {expanded && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {!debt.is_paid ? (
            <>
              <button
                onClick={onPay}
                className="flex-1 py-1.5 rounded-btn bg-income/10 dark:bg-income-dark/10 text-income dark:text-income-dark text-xs font-semibold border border-income/20 dark:border-income-dark/20"
              >
                ✓ Tandai Lunas
              </button>
              <button
                onClick={onEdit}
                className="px-3 py-1.5 rounded-[8px] bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96] text-[10px] font-semibold"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1.5 rounded-btn bg-expense/10 dark:bg-expense-dark/10 text-expense dark:text-expense-dark text-xs font-semibold"
              >
                Hapus
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onUnpay}
                disabled={isPaying}
                className="flex-1 py-1.5 rounded-[8px] bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96] text-[10px] font-semibold disabled:opacity-50"
              >
                ↩ Batal Lunas
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1.5 rounded-btn bg-expense/10 dark:bg-expense-dark/10 text-expense dark:text-expense-dark text-xs font-semibold"
              >
                Hapus
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

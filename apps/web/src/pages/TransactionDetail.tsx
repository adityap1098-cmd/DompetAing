import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TransactionForm } from "@/components/transaction/TransactionForm";
import { showToast } from "@/components/ui/Toast";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  useTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/hooks/useTransactions";
import type { CreateTransactionInput } from "@/hooks/useTransactions";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] last:border-b-0">
      <dt className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] shrink-0 pt-0.5">{label}</dt>
      <dd className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] text-right">{value}</dd>
    </div>
  );
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: txn, isLoading } = useTransaction(id!);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  function handleUpdate(data: CreateTransactionInput) {
    updateTransaction.mutate(
      { id: id!, ...data },
      {
        onSuccess: () => { setIsEditOpen(false); showToast("Transaksi diperbarui"); },
        onError: (err) => { showToast(err.message, "error"); },
      }
    );
  }

  function handleDelete() {
    deleteTransaction.mutate(id!, {
      onSuccess: () => { showToast("Transaksi dihapus"); navigate(-1); },
      onError: (err) => { showToast(err.message, "error"); setIsDeleteOpen(false); },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="h-[140px] bg-[#F0EEE9] dark:bg-[#1C1D1A] animate-pulse" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-7 w-7 border-2 border-accent-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#6B6864] dark:text-[#9E9B96] text-sm">
        Transaksi tidak ditemukan
      </div>
    );
  }

  const isIncome = txn.type === "income";
  const isExpense = txn.type === "expense";
  const sign = isIncome ? "+" : isExpense ? "-" : "";
  const amountTextColor = isIncome ? "rgba(180,255,210,0.9)" : isExpense ? "rgba(255,180,180,0.9)" : "rgba(255,255,255,0.9)";
  const icon = txn.category?.icon ?? (isIncome ? "💰" : isExpense ? "💸" : "↔️");
  const categoryLabel = txn.category
    ? `${txn.category.name}${txn.sub_category ? ` · ${txn.sub_category.name}` : ""}`
    : txn.type === "transfer" ? "Transfer" : "Lainnya";

  return (
    <div className="flex flex-col">
      {/* Gradient Header */}
      <div className="bg-accent-500 dark:bg-accent-dark px-[17px] pb-5 pt-4 text-white">
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] opacity-80 mb-2.5 flex items-center gap-1"
        >
          ← Kembali
        </button>
        <div className="text-[30px] text-center my-1">{icon}</div>
        <p className="text-[15px] font-extrabold text-center">{txn.description}</p>
        <p className="text-[10px] opacity-80 text-center mt-0.5">{categoryLabel}</p>
        <p className="font-mono text-[24px] font-semibold text-center mt-2.5" style={{ color: amountTextColor }}>
          {sign}{formatRupiah(txn.amount)}
        </p>
      </div>

      {/* Details card */}
      <div className="mx-[17px] -mt-3 bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] px-3.5 py-1 mb-3">
        <dl>
          <DetailRow label="Tanggal" value={formatDate(txn.date, "long")} />
          {txn.type !== "transfer" && (
            <DetailRow label="Kategori" value={categoryLabel} />
          )}
          <DetailRow label={txn.type === "transfer" ? "Dari Akun" : "Akun"} value={`${txn.account?.icon ?? "🏦"} ${txn.account?.name ?? "-"}`} />
          {txn.type === "transfer" && txn.to_account && (
            <DetailRow label="Ke Akun" value={`${txn.to_account.icon ?? "🏦"} ${txn.to_account.name}`} />
          )}
          {txn.notes && <DetailRow label="Catatan" value={txn.notes} />}
          <DetailRow label="Status" value="✓ Selesai" />
          {txn.source !== "manual" && (
            <DetailRow label="Sumber" value={txn.source === "gmail" ? "Gmail Sync" : txn.source} />
          )}
        </dl>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-[17px]">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="flex-1 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[11px] font-bold text-[#1A1917] dark:text-[#F0EEE9] bg-white dark:bg-[#1C1D1A] hover:opacity-80 transition-opacity"
        >
          ✏️ Edit
        </button>
        <button
          type="button"
          onClick={() => setIsDeleteOpen(true)}
          className="flex-1 py-2.5 rounded-[10px] border border-[#C94A1C]/30 dark:border-[#E87340]/30 text-[11px] font-bold text-[#C94A1C] dark:text-[#E87340] bg-white dark:bg-[#1C1D1A] hover:opacity-80 transition-opacity"
        >
          🗑 Hapus
        </button>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Transaksi">
        <TransactionForm
          key={isEditOpen ? txn.id : "closed"}
          transaction={txn}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditOpen(false)}
          loading={updateTransaction.isPending}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Transaksi?"
        description={`Yakin hapus "${txn.description}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        confirmVariant="danger"
        loading={deleteTransaction.isPending}
      />
    </div>
  );
}

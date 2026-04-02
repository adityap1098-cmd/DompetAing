import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AccountForm } from "@/components/account/AccountForm";
import type { AccountFormData } from "@/components/account/AccountForm";
import { useAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useHideBalance } from "@/hooks/useHideBalance";
import { formatRupiah } from "@/lib/format";
import { Skeleton } from "@/components/ui/LoadingSkeleton";

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: account, isLoading } = useAccount(id ?? "");
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const { formatAmount } = useHideBalance();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleEdit = (data: AccountFormData) => {
    if (!account) return;
    updateAccount.mutate({ id: account.id, ...data }, { onSuccess: () => setIsEditOpen(false) });
  };

  const handleDelete = () => {
    if (!account) return;
    deleteAccount.mutate(account.id, { onSuccess: () => navigate("/accounts", { replace: true }) });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="h-[140px] bg-[#F0EEE9] dark:bg-[#1C1D1A] animate-pulse" />
        <div className="p-[17px] space-y-3">
          <Skeleton className="h-24 rounded-[14px]" />
          <Skeleton className="h-48 rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <span className="text-5xl mb-4">😕</span>
        <p className="text-sm text-[#6B6864] dark:text-[#9E9B96]">Akun tidak ditemukan.</p>
        <button onClick={() => navigate("/accounts")} className="mt-4 text-sm font-semibold text-accent-500 dark:text-accent-dark">
          Kembali ke Akun
        </button>
      </div>
    );
  }

  const accentColor = account.color ?? "var(--accent)";

  return (
    <div className="flex flex-col">
      {/* Gradient Header — matches mockup Akun Detail */}
      <div
        className="px-[17px] pb-5 pt-4 text-white"
        style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${accentColor} 60%, #000), ${accentColor})` }}
      >
        <button onClick={() => navigate(-1)} className="text-[10px] opacity-80 mb-3 flex items-center gap-1">
          ← Kembali
        </button>
        <p className="text-[10px] opacity-70 uppercase tracking-[0.04em] mb-1">{account.name}</p>
        <p className="text-[16px] font-extrabold">
          {account.bank_name ?? account.name} {(account as any).account_number ? `— ••••${(account as any).account_number.slice(-4)}` : ""}
        </p>
        <p className="font-mono text-[26px] font-semibold mt-3">
          {formatAmount(account.balance)}
        </p>
        <p className="text-[11px] opacity-80 mt-1">
          {account.type === "bank" ? "Rekening Bank" : account.type === "ewallet" ? "Dompet Digital" : "Uang Tunai"}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-[17px] pt-3 pb-0">
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

      {/* Info card */}
      <div className="mx-[17px] mt-3 bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] px-3.5 py-1 mb-3">
        <InfoRow label="Tipe" value={account.type === "bank" ? "Bank" : account.type === "ewallet" ? "E-Wallet" : "Tunai"} />
        {account.bank_name && <InfoRow label="Bank" value={account.bank_name} />}
        <InfoRow label="Saldo Awal" value={formatRupiah(account.initial_balance)} />
        <InfoRow label="Status" value={account.is_active ? "✓ Aktif" : "Nonaktif"} />
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Aset">
        <AccountForm
          account={account}
          onSubmit={handleEdit}
          onCancel={() => setIsEditOpen(false)}
          loading={updateAccount.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Akun?"
        description={`Akun "${account.name}" akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        loading={deleteAccount.isPending}
      />
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] last:border-b-0">
      <span className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">{label}</span>
      <span className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">{value}</span>
    </div>
  );
}

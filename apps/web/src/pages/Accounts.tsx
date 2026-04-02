import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AccountCard } from "@/components/account/AccountCard";
import { BalanceCard } from "@/components/account/BalanceCard";
import { AccountForm } from "@/components/account/AccountForm";
import type { AccountFormData } from "@/components/account/AccountForm";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "@/hooks/useAccounts";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { Link } from "react-router-dom";
import type { Account } from "@dompetaing/shared";
import { showToast } from "@/components/ui/Toast";

function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <span className="text-4xl mb-3">🔒</span>
      <h3 className="text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-1">
        Batas Akun Gratis
      </h3>
      <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] mb-5">
        Pengguna gratis hanya bisa menambahkan 2 akun.
        Upgrade ke Premium untuk akun tak terbatas.
      </p>
      <Link
        to="/subscription"
        className="inline-flex items-center gap-2 bg-accent-500 dark:bg-accent-dark text-white px-5 py-2.5 rounded-btn font-semibold text-sm hover:bg-accent-600 transition-colors"
      >
        ✨ Upgrade ke Premium
      </Link>
    </div>
  );
}

export function AccountsPage() {
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const { limits, isPremium } = useSubscription();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const netWorth = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0);
  const accountCount = (accounts ?? []).length;

  const atFreeLimit = !isPremium && accountCount >= limits.maxAccounts;

  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleCreate = (data: AccountFormData) => {
    createAccount.mutate(data, {
      onSuccess: () => {
        setIsAddModalOpen(false);
      },
    });
  };

  const handleUpdate = (data: AccountFormData) => {
    if (!editingAccount) return;
    updateAccount.mutate(
      { id: editingAccount.id, ...data },
      {
        onSuccess: () => {
          setEditingAccount(null);
          showToast("Akun berhasil diperbarui");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingAccount) return;
    deleteAccount.mutate(deletingAccount.id, {
      onSuccess: () => {
        setDeletingAccount(null);
        showToast("Akun dihapus");
      },
    });
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Aset"
      />

      <div className="pt-4 pb-24">
        {/* Balance summary */}
        <BalanceCard netWorth={netWorth} accountCount={accountCount} />

        {/* Account list */}
        {isLoading ? (
          <div className="px-[17px] space-y-3">
            <Skeleton className="h-20 rounded-[14px]" />
            <Skeleton className="h-20 rounded-[14px]" />
          </div>
        ) : accountCount === 0 ? (
          <div className="px-[17px]">
            <EmptyState
              icon="🏦"
              title="Belum ada aset"
              description="Tambahkan rekening bank, e-wallet, atau uang tunai untuk mulai mencatat keuangan kamu"
              action={
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-accent-500 dark:bg-accent-dark text-white text-[11px] font-bold rounded-[10px]"
                >
                  + Tambah Aset Pertama
                </button>
              }
            />
          </div>
        ) : (
          <div>
            {(accounts ?? []).map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onClick={() => navigate(`/accounts/${account.id}`)}
                onEdit={() => setEditingAccount(account)}
                onDelete={() => setDeletingAccount(account)}
              />
            ))}
            {/* Add account button */}
            {!atFreeLimit && (
              <div className="px-[17px] pt-3">
                <button type="button" onClick={handleAdd}
                  className="w-full py-2.5 rounded-[10px] text-[13px] font-bold text-white active:scale-95 transition-all"
                  style={{ backgroundColor: "var(--accent)" }}>
                  + Tambah Aset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Aset"
      >
        {atFreeLimit ? (
          <UpgradePrompt />
        ) : (
          <AccountForm
            key={isAddModalOpen ? "add-open" : "add-closed"}
            onSubmit={handleCreate}
            onCancel={() => setIsAddModalOpen(false)}
            loading={createAccount.isPending}
          />
        )}
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        isOpen={editingAccount !== null}
        onClose={() => setEditingAccount(null)}
        title="Edit Aset"
      >
        {editingAccount && (
          <AccountForm
            key={editingAccount.id}
            account={editingAccount}
            onSubmit={handleUpdate}
            onCancel={() => setEditingAccount(null)}
            loading={updateAccount.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deletingAccount !== null}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete}
        title="Hapus Akun"
        description={`Yakin hapus akun "${deletingAccount?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        confirmVariant="danger"
        loading={deleteAccount.isPending}
      />
    </div>
  );
}

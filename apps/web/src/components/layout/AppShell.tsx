import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Toaster } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/transaction/TransactionForm";
import { useAddTransactionStore } from "@/store/addTransaction";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { showToast } from "@/components/ui/Toast";
import type { CreateTransactionInput } from "@/hooks/useTransactions";

interface AppShellProps {
  children: ReactNode;
}

function GlobalAddTransactionModal() {
  const { isOpen, close } = useAddTransactionStore();
  const createTransaction = useCreateTransaction();

  function handleSubmit(data: CreateTransactionInput) {
    createTransaction.mutate(data, {
      onSuccess: () => {
        close();
        showToast("Transaksi berhasil ditambahkan");
      },
      onError: (err) => {
        showToast(err.message, "error");
      },
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Tambah Transaksi">
        <TransactionForm
          key={isOpen ? "open" : "closed"}
          onSubmit={handleSubmit}
          onCancel={close}
          loading={createTransaction.isPending}
        />
      
    </Modal>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#F7F6F3] dark:bg-[#111210] max-w-md mx-auto relative">
      <main className="flex-1 content-with-nav overflow-y-auto">
        {children}
      </main>
      <BottomNav />
      <GlobalAddTransactionModal />
      <Toaster />
    </div>
  );
}

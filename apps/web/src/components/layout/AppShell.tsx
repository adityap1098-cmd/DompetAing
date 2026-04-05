import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { Toaster } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/transaction/TransactionForm";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { DebtForm } from "@/components/debt/DebtForm";
import { useGlobalAddStore } from "@/store/globalAdd";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useCreateBudget } from "@/hooks/useBudgets";
import { useCreateDebt } from "@/hooks/useDebts";
import { showToast } from "@/components/ui/Toast";
import type { CreateTransactionInput } from "@/hooks/useTransactions";

interface AppShellProps {
  children: ReactNode;
}

function GlobalModals() {
  const { activeModal, close } = useGlobalAddStore();
  const createTransaction = useCreateTransaction();
  const createBudget = useCreateBudget();
  const createDebt = useCreateDebt();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  function handleTransactionSubmit(data: CreateTransactionInput) {
    createTransaction.mutate(data, {
      onSuccess: () => {
        close();
        showToast("Transaksi berhasil ditambahkan");
      },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function handleBudgetSubmit(data: { category_id: string; amount: number }) {
    createBudget.mutate(
      { ...data, period_type: "monthly", period_month: month, period_year: year },
      {
        onSuccess: () => {
          close();
          showToast("Budget berhasil ditambahkan");
        },
        onError: (err) => showToast(err.message, "error"),
      }
    );
  }

  function handleDebtSubmit(data: {
    type: "hutang" | "piutang";
    person_name: string;
    amount: number;
    description?: string;
    borrow_date: string;
    due_date?: string;
    reminder_enabled: boolean;
    auto_record: boolean;
  }) {
    createDebt.mutate(data, {
      onSuccess: () => {
        close();
        showToast("Hutang/piutang berhasil ditambahkan");
      },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  return (
    <>
      {/* Transaction modal */}
      <Modal isOpen={activeModal === "transaction"} onClose={close} title="Tambah Transaksi">
        <TransactionForm
          key={activeModal === "transaction" ? "open" : "closed"}
          onSubmit={handleTransactionSubmit}
          onCancel={close}
          loading={createTransaction.isPending}
        />
      </Modal>

      {/* Budget modal */}
      <Modal isOpen={activeModal === "budget"} onClose={close} title="Tambah Budget">
        <BudgetForm
          key={activeModal === "budget" ? "open" : "closed"}
          month={month}
          year={year}
          onSubmit={handleBudgetSubmit}
          onCancel={close}
          loading={createBudget.isPending}
        />
      </Modal>

      {/* Debt modal */}
      <Modal isOpen={activeModal === "debt"} onClose={close} title="Tambah Hutang/Piutang">
        <DebtForm
          key={activeModal === "debt" ? "open" : "closed"}
          onSubmit={handleDebtSubmit}
          onCancel={close}
          loading={createDebt.isPending}
        />
      </Modal>
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#F7F6F3] dark:bg-[#111210] max-w-md mx-auto relative">
      <OfflineBanner />
      <main className="flex-1 content-with-nav overflow-y-auto">
        {children}
      </main>
      <BottomNav />
      <GlobalModals />
      <Toaster />
    </div>
  );
}

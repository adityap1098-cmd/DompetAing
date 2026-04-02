import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { RecurringForm } from "@/components/recurring/RecurringForm";
import { RecurringItem } from "@/components/recurring/RecurringItem";
import { formatRupiah } from "@/lib/format";
import { showToast } from "@/components/ui/Toast";
import {
  useRecurring,
  useCreateRecurring,
  useUpdateRecurring,
  useDeleteRecurring,
  useToggleRecurring,
  type CreateRecurringInput,
} from "@/hooks/useRecurring";
import type { RecurringTransaction } from "@dompetaing/shared";

export function RecurringPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);

  const { data, isLoading } = useRecurring();
  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const toggleRecurring = useToggleRecurring();

  const items = data?.items ?? [];
  const summary = data?.summary;

  function handleCreate(input: CreateRecurringInput) {
    createRecurring.mutate(input, {
      onSuccess: () => {
        setShowAddModal(false);
        showToast("Berhasil ditambahkan", "success");
      },
      onError: () => showToast("Gagal menyimpan", "error"),
    });
  }

  function handleUpdate(input: CreateRecurringInput) {
    if (!editItem) return;
    updateRecurring.mutate(
      { id: editItem.id, ...input },
      {
        onSuccess: () => {
          setEditItem(null);
          showToast("Berhasil diperbarui", "success");
        },
        onError: () => showToast("Gagal menyimpan", "error"),
      }
    );
  }

  function handleToggle(item: RecurringTransaction) {
    toggleRecurring.mutate(item.id, {
      onSuccess: (updated) => {
        showToast(updated.is_active ? "Diaktifkan" : "Dijeda", "success");
      },
      onError: () => showToast("Gagal", "error"),
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteRecurring.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        showToast("Dihapus", "success");
      },
      onError: () => showToast("Gagal menghapus", "error"),
    });
  }

  return (
    <div className="flex flex-col pb-24">
      <Header title="Transaksi Berulang" />

      <div className="px-[17px] pt-4 pb-24 space-y-3">
        {/* Summary */}
        {summary && (items.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
              <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">
                Keluar / bulan
              </p>
              <p className="text-[15px] font-bold font-mono text-[#C94A1C] dark:text-[#E87340]">
                {formatRupiah(summary.total_expense_monthly, { compact: true })}
              </p>
              <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">estimasi</p>
            </div>
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
              <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">
                Masuk / bulan
              </p>
              <p className="text-[15px] font-bold font-mono text-[#1E8A5A] dark:text-[#4CAF7A]">
                {formatRupiah(summary.total_income_monthly, { compact: true })}
              </p>
              <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">estimasi</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="w-8 h-8 rounded-[9px] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-2.5 w-36 rounded" />
                    <Skeleton className="h-2 w-24 rounded" />
                  </div>
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 px-4">
              <EmptyState
                icon="🔄"
                title="Belum ada transaksi berulang"
                description="Tambah pengeluaran/pemasukan rutin yang otomatis tercatat"
              />
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
              {items.map((item) => (
                <RecurringItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onToggle={() => handleToggle(item)}
                  isToggling={toggleRecurring.isPending && toggleRecurring.variables === item.id}
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
        title="Tambah Transaksi Berulang"
      >
        <RecurringForm
          onSubmit={handleCreate}
          onCancel={() => setShowAddModal(false)}
          loading={createRecurring.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Transaksi Berulang"
      >
        {editItem && (
          <RecurringForm
            recurring={editItem}
            onSubmit={handleUpdate}
            onCancel={() => setEditItem(null)}
            loading={updateRecurring.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Transaksi Berulang"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">
              Hapus <strong className="text-[#1A1917] dark:text-[#F0EEE9]">{deleteTarget.description}</strong>?
              Transaksi yang sudah dibuat tidak akan dihapus.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[12px] font-semibold text-[#6B6864] dark:text-[#9E9B96]">
                Batal
              </button>
              <button
                type="button"
                disabled={deleteRecurring.isPending}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-[10px] bg-[#C94A1C]/10 dark:bg-[#E87340]/10 text-[#C94A1C] dark:text-[#E87340] text-[12px] font-semibold disabled:opacity-50"
              >
                {deleteRecurring.isPending ? "..." : "Hapus"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Row with inline expand ──
interface RecurringItemRowProps {
  item: RecurringTransaction;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

function RecurringItemRow({ item, onEdit, onDelete, onToggle, isToggling }: RecurringItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <RecurringItem item={item} onClick={() => setExpanded((v) => !v)} />
      {expanded && (
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={[
              "flex-1 py-1.5 rounded-btn text-xs font-semibold border transition-all disabled:opacity-50",
              item.is_active
                ? "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96] border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]"
                : "bg-[#1E8A5A]/10 dark:bg-[#4CAF7A]/10 text-[#1E8A5A] dark:text-[#4CAF7A] border-[#1E8A5A]/20 dark:border-[#4CAF7A]/20",
            ].join(" ")}
          >
            {isToggling ? "..." : item.is_active ? "⏸ Jeda" : "▶ Aktifkan"}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-[9px] bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96] text-[11px] font-semibold"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded-[9px] bg-[#C94A1C]/10 dark:bg-[#E87340]/10 text-[#C94A1C] dark:text-[#E87340] text-[11px] font-semibold"
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}

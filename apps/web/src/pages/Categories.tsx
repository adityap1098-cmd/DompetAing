import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { CategoryForm } from "@/components/category/CategoryForm";
import type { CategoryFormData } from "@/components/category/CategoryForm";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateSubCategory,
  useUpdateSubCategory,
  useDeleteSubCategory,
} from "@/hooks/useCategories";
import { showToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import type { Category, SubCategory } from "@dompetaing/shared";

// ── Type chips ──
const TYPE_FILTERS = [
  { label: "Semua", value: "" },
  { label: "Pengeluaran", value: "expense" },
  { label: "Pemasukan", value: "income" },
  { label: "Keduanya", value: "both" },
] as const;

const typeLabel: Record<string, string> = {
  expense: "Pengeluaran",
  income: "Pemasukan",
  both: "Keduanya",
};

const typeBadgeClass: Record<string, string> = {
  expense: "bg-[#C94A1C]/10 text-[#C94A1C] dark:bg-[#E87340]/10 dark:text-[#E87340]",
  income: "bg-[#1E8A5A]/10 text-[#1E8A5A] dark:bg-[#4CAF7A]/10 dark:text-[#4CAF7A]",
  both: "bg-accent-500/10 text-accent-500 dark:bg-accent-dark/10 dark:text-accent-dark",
};

// ── Sub-category inline item ──
function SubCategoryItem({
  sub,
  categoryId,
  isSystem,
}: {
  sub: SubCategory;
  categoryId: string;
  isSystem: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sub.name);
  const updateSub = useUpdateSubCategory();
  const deleteSub = useDeleteSubCategory();

  const handleSave = () => {
    if (!editName.trim() || editName === sub.name) {
      setEditing(false);
      return;
    }
    updateSub.mutate(
      { categoryId, subId: sub.id, name: editName.trim() },
      {
        onSuccess: () => {
          setEditing(false);
          showToast("Sub-kategori diperbarui");
        },
        onError: (err) => {
          showToast(err instanceof ApiError ? err.message : "Gagal memperbarui", "error");
        },
      }
    );
  };

  const handleDelete = () => {
    deleteSub.mutate(
      { categoryId, subId: sub.id },
      {
        onSuccess: () => showToast("Sub-kategori dihapus"),
        onError: () => showToast("Gagal menghapus", "error"),
      }
    );
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setEditing(false); setEditName(sub.name); }
          }}
          className="flex-1 px-2 py-1 text-[11px] rounded-[8px] border border-accent-500 dark:border-accent-dark bg-[#F7F6F3] dark:bg-[#111210] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={updateSub.isPending}
          className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark px-2"
        >
          {updateSub.isPending ? "..." : "Simpan"}
        </button>
        <button
          onClick={() => { setEditing(false); setEditName(sub.name); }}
          className="text-[11px] text-[#9E9B98] dark:text-[#4A4948]"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="flex-1 text-[11px] text-[#6B6864] dark:text-[#9E9B96]">{sub.name}</span>
      {!isSystem && (
        <>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 text-[#9E9B98] dark:text-[#4A4948] hover:text-accent-500 dark:hover:text-accent-dark transition-opacity"
            aria-label="Edit sub-kategori"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteSub.isPending}
            className="opacity-0 group-hover:opacity-100 p-1 text-[#9E9B98] dark:text-[#4A4948] hover:text-[#C94A1C] dark:hover:text-[#E87340] transition-opacity"
            aria-label="Hapus sub-kategori"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

// ── Add sub-category inline form ──
function AddSubCategoryInline({
  categoryId,
  onDone,
}: {
  categoryId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const createSub = useCreateSubCategory();

  const handleAdd = () => {
    if (!name.trim()) return;
    createSub.mutate(
      { categoryId, name: name.trim() },
      {
        onSuccess: () => {
          setName("");
          onDone();
          showToast("Sub-kategori ditambahkan");
        },
        onError: (err) => {
          showToast(err instanceof ApiError ? err.message : "Gagal menambahkan", "error");
        },
      }
    );
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") onDone();
        }}
        placeholder="Nama sub-kategori"
        className="flex-1 px-2 py-1 text-[11px] rounded-[8px] border border-accent-500 dark:border-accent-dark bg-[#F7F6F3] dark:bg-[#111210] text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948] focus:outline-none"
      />
      <button
        onClick={handleAdd}
        disabled={createSub.isPending || !name.trim()}
        className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark px-2 disabled:opacity-50"
      >
        {createSub.isPending ? "..." : "Tambah"}
      </button>
      <button onClick={onDone} className="text-[11px] text-[#9E9B98] dark:text-[#4A4948]">
        Batal
      </button>
    </div>
  );
}

// ── Category card ──
function CategoryCard({
  category,
  onEdit,
  onDelete,
  forceExpand = false,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  forceExpand?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = forceExpand || expanded;
  const [addingSub, setAddingSub] = useState(false);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Color bar */}
      <div className="h-1 w-full" style={{ backgroundColor: category.color }} />

      {/* Main row */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${category.color}20` }}
        >
          {category.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] truncate">
              {category.name}
            </p>
            {category.is_system && (
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0EEE9] dark:bg-[#242522] text-[#9E9B98] dark:text-[#4A4948]">
                SISTEM
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={[
                "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                typeBadgeClass[category.type] ?? "",
              ].join(" ")}
            >
              {typeLabel[category.type]}
            </span>
            {category.sub_categories.length > 0 && (
              <span className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
                {category.sub_categories.length} sub-kategori
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          className={[
            "w-4 h-4 text-[#9E9B98] dark:text-[#4A4948] transition-transform shrink-0",
            isExpanded ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Sub-categories expanded */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          <div className="border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] pt-3 space-y-2">
            {category.sub_categories.map((sub) => (
              <SubCategoryItem
                key={sub.id}
                sub={sub}
                categoryId={category.id}
                isSystem={category.is_system}
              />
            ))}
            {category.sub_categories.length === 0 && !addingSub && (
              <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Belum ada sub-kategori</p>
            )}
            {addingSub ? (
              <AddSubCategoryInline
                categoryId={category.id}
                onDone={() => setAddingSub(false)}
              />
            ) : (
              <button
                onClick={() => setAddingSub(true)}
                className="text-xs text-accent-500 dark:text-accent-dark font-medium hover:underline"
              >
                + Tambah sub-kategori
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="flex border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] divide-x divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
        <button
          className="flex-1 py-2.5 text-[11px] font-semibold text-accent-500 dark:text-accent-dark hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          Edit
        </button>
        <button
          className="flex-1 py-2.5 text-[11px] font-semibold text-[#C94A1C] dark:text-[#E87340] hover:bg-[#C94A1C]/5 dark:hover:bg-[#E87340]/5 transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          Hapus
        </button>
      </div>
    </Card>
  );
}

// ── Main page ──
export function CategoriesPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: categories, isLoading } = useCategories({
    type: typeFilter || undefined,
    search: search || undefined,
  });

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [forceDeleteState, setForceDeleteState] = useState<{
    category: Category;
    txnCount: number;
  } | null>(null);

  const filteredCount = useMemo(() => categories?.length ?? 0, [categories]);

  const handleCreate = (data: CategoryFormData) => {
    createCategory.mutate(data, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        showToast("Kategori ditambahkan");
      },
      onError: (err) => {
        showToast(err instanceof ApiError ? err.message : "Gagal menambahkan", "error");
      },
    });
  };

  const handleUpdate = (data: CategoryFormData) => {
    if (!editingCategory) return;
    updateCategory.mutate(
      { id: editingCategory.id, ...data },
      {
        onSuccess: () => {
          setEditingCategory(null);
          showToast("Kategori diperbarui");
        },
        onError: (err) => {
          showToast(err instanceof ApiError ? err.message : "Gagal memperbarui", "error");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingCategory) return;
    deleteCategory.mutate(
      { id: deletingCategory.id },
      {
        onSuccess: () => {
          setDeletingCategory(null);
          showToast("Kategori dihapus");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            const data = err.data as { transaction_count?: number };
            setForceDeleteState({
              category: deletingCategory,
              txnCount: data?.transaction_count ?? 0,
            });
            setDeletingCategory(null);
          } else {
            showToast(err instanceof ApiError ? err.message : "Gagal menghapus", "error");
          }
        },
      }
    );
  };

  const handleForceDelete = () => {
    if (!forceDeleteState) return;
    deleteCategory.mutate(
      { id: forceDeleteState.category.id, force: true },
      {
        onSuccess: () => {
          setForceDeleteState(null);
          showToast("Kategori dihapus");
        },
        onError: () => {
          showToast("Gagal menghapus", "error");
        },
      }
    );
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Kategori"
        right={
          <div
            className="w-7 h-7 flex items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[#6B6864] dark:text-[#9E9B96] text-base font-bold cursor-pointer"
            onClick={() => setIsAddModalOpen(true)}
          >
            +
          </div>
        }
      />

      <div className="px-[17px] pt-4 pb-24 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9B98] dark:text-[#4A4948]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kategori..."
            className="w-full pl-9 pr-4 py-2.5 rounded-[12px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948] focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:focus:ring-accent-dark/30"
          />
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-[9px] text-[10px] font-semibold transition-colors",
                typeFilter === f.value
                  ? "bg-accent-500 dark:bg-accent-dark text-white"
                  : "bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-card" />
            ))}
          </div>
        ) : filteredCount === 0 ? (
          <EmptyState
            icon="🏷️"
            title={search ? "Kategori tidak ditemukan" : "Belum ada kategori"}
            description={
              search
                ? `Tidak ada kategori yang cocok dengan "${search}"`
                : "Tambahkan kategori untuk mengorganisir transaksimu"
            }
            action={
              !search ? (
                <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                  + Tambah Kategori
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {(categories ?? []).map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={() => setEditingCategory(cat)}
                onDelete={() => setDeletingCategory(cat)}
                forceExpand={!!search}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Kategori"
      >
        <CategoryForm
          key={isAddModalOpen ? "add-open" : "add-closed"}
          onSubmit={handleCreate}
          onCancel={() => setIsAddModalOpen(false)}
          loading={createCategory.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        title="Edit Kategori"
      >
        {editingCategory && (
          <CategoryForm
            key={editingCategory.id}
            category={editingCategory}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCategory(null)}
            loading={updateCategory.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        description={[
          `Yakin hapus kategori "${deletingCategory?.name}"?`,
          (deletingCategory?.sub_categories.length ?? 0) > 0
            ? ` ${deletingCategory!.sub_categories.length} sub-kategori akan ikut terhapus.`
            : "",
        ].join("")}
        confirmLabel="Hapus"
        confirmVariant="danger"
        loading={deleteCategory.isPending}
      />

      {/* Force Delete Confirm */}
      <ConfirmDialog
        isOpen={forceDeleteState !== null}
        onClose={() => setForceDeleteState(null)}
        onConfirm={handleForceDelete}
        title="Hapus Paksa?"
        description={`Kategori "${forceDeleteState?.category.name}" digunakan oleh ${forceDeleteState?.txnCount} transaksi. Jika dihapus, semua transaksi tersebut jadi tanpa kategori.`}
        confirmLabel="Hapus Paksa"
        confirmVariant="danger"
        loading={deleteCategory.isPending}
      />
    </div>
  );
}

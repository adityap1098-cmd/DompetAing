import { useState } from "react";
import { AmountNumpad } from "@/components/ui/AmountNumpad";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { AccountPicker } from "@/components/ui/AccountPicker";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import type { Transaction, TransactionType } from "@dompetaing/shared";
import type { CreateTransactionInput } from "@/hooks/useTransactions";

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (data: CreateTransactionInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TYPES: { value: TransactionType; label: string; icon: string }[] = [
  { value: "expense", label: "Pengeluaran", icon: "💸" },
  { value: "income", label: "Pemasukan", icon: "💰" },
  { value: "transfer", label: "Transfer", icon: "↔️" },
];

export function TransactionForm({
  transaction,
  onSubmit,
  onCancel,
  loading,
}: TransactionFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  // Step 1: amount, Step 2: details
  const [step, setStep] = useState<1 | 2>(transaction ? 2 : 1);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(
    transaction ? String(Math.round(transaction.amount)) : ""
  );
  const [accountId, setAccountId] = useState(transaction?.account_id ?? "");
  const [toAccountId, setToAccountId] = useState(transaction?.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [subCategoryId, setSubCategoryId] = useState(transaction?.sub_category_id ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(
    transaction ? transaction.date.slice(0, 10) : today
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!transaction?.notes);

  // Picker states
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);

  const { data: accounts } = useAccounts();
  const { data: allCategories } = useCategories();

  const categories = (allCategories ?? []).filter((cat) =>
    type === "expense"
      ? cat.type === "expense" || cat.type === "both"
      : cat.type === "income" || cat.type === "both"
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAccount = (accounts ?? []).find((a) => a.id === accountId);
  const selectedToAccount = (accounts ?? []).find((a) => a.id === toAccountId);

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategoryId("");
    setSubCategoryId("");
    setToAccountId("");
  }

  function handleCategorySelect(catId: string, subId?: string) {
    setCategoryId(catId);
    setSubCategoryId(subId ?? "");
  }

  function handleSubmit() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (!accountId) return;
    if (type === "transfer" && !toAccountId) return;

    const data: CreateTransactionInput = {
      amount: numAmount,
      type,
      account_id: accountId,
      description:
        description.trim() ||
        (type === "transfer"
          ? "Transfer"
          : type === "income"
          ? selectedCategory?.name ?? "Pemasukan"
          : selectedCategory?.name ?? "Pengeluaran"),
      date: date + "T12:00:00+07:00",
    };

    if (type !== "transfer") {
      if (categoryId) data.category_id = categoryId;
      if (subCategoryId) data.sub_category_id = subCategoryId;
    }
    if (type === "transfer") data.to_account_id = toAccountId;
    if (notes.trim()) data.notes = notes.trim();

    onSubmit(data);
  }

  const activeTypeColor =
    type === "expense"
      ? "bg-[#C94A1C] dark:bg-[#E87340]"
      : type === "income"
      ? "bg-[#1E8A5A] dark:bg-[#4CAF7A]"
      : "bg-[var(--accent)]";

  const fieldBtn = [
    "flex items-center gap-3 w-full px-[14px] py-[10px] rounded-[10px] text-left",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
    "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
    "active:bg-[#DDDBD6] dark:active:bg-[#333432]",
  ].join(" ");

  const label = "block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1";

  const inputField = [
    "w-full px-[14px] py-[10px] rounded-[10px] text-[13px]",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
    "text-[#1A1917] dark:text-[#F0EEE9]",
    "placeholder:text-[#9E9B98] dark:placeholder:text-[#4A4948]",
    "focus:outline-none focus:border-[var(--accent)]",
    "transition-colors",
  ].join(" ");

  // ── STEP 1: Amount with numpad ──
  if (step === 1) {
    return (
      <div className="flex flex-col px-[18px] pt-2 pb-[18px]">
        {/* Type tabs */}
        <div className="flex rounded-[10px] overflow-hidden bg-[#F0EEE9] dark:bg-[#242522] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] mb-4">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={[
                "flex-1 py-2.5 text-[12px] font-bold transition-all duration-150",
                type === t.value
                  ? `${activeTypeColor} text-white rounded-[10px] mx-0.5 my-0.5`
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Custom numpad amount input */}
        <AmountNumpad
          value={amount}
          onChange={setAmount}
          onConfirm={() => setStep(2)}
          confirmLabel="Lanjut →"
          confirmDisabled={!amount || Number(amount) <= 0}
        />
      </div>
    );
  }

  // ── STEP 2: Details ──
  return (
    <div className="flex flex-col gap-[10px] px-[18px] pt-2 pb-[18px]">
      {/* Amount summary — tap to go back */}
      <button
        type="button"
        onClick={() => setStep(1)}
        className={[
          "flex items-center justify-between py-3 px-4 rounded-[10px]",
          "bg-[#F0EEE9] dark:bg-[#242522]",
          "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
          "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">
            {type === "expense" ? "💸" : type === "income" ? "💰" : "↔️"}
          </span>
          <span className={[
            "text-[10px] font-bold uppercase tracking-wide",
            type === "expense" ? "text-[#C94A1C] dark:text-[#E87340]" :
            type === "income" ? "text-[#1E8A5A] dark:text-[#4CAF7A]" :
            "text-[var(--accent)]",
          ].join(" ")}>
            {TYPES.find((t) => t.value === type)?.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[16px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">
            Rp {Number(amount).toLocaleString("id-ID")}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98]">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
      </button>

      {/* Account picker */}
      <div>
        <label className={label}>{type === "transfer" ? "Dari Akun" : "Akun"}</label>
        <button type="button" onClick={() => setShowAccountPicker(true)} className={fieldBtn}>
          {selectedAccount ? (
            <>
              <div
                className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] shrink-0"
                style={{ backgroundColor: `${selectedAccount.color}1A` }}
              >
                {selectedAccount.icon}
              </div>
              <span className="flex-1 text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                {selectedAccount.name}
              </span>
            </>
          ) : (
            <span className="text-[13px] text-[#9E9B98] dark:text-[#4A4948]">Pilih akun...</span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98] shrink-0">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* To Account (transfer) */}
      {type === "transfer" && (
        <div>
          <label className={label}>Ke Akun</label>
          <button type="button" onClick={() => setShowToAccountPicker(true)} className={fieldBtn}>
            {selectedToAccount ? (
              <>
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] shrink-0"
                  style={{ backgroundColor: `${selectedToAccount.color}1A` }}
                >
                  {selectedToAccount.icon}
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                  {selectedToAccount.name}
                </span>
              </>
            ) : (
              <span className="text-[13px] text-[#9E9B98] dark:text-[#4A4948]">Pilih akun tujuan...</span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98] shrink-0">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}

      {/* Category picker (not for transfer) */}
      {type !== "transfer" && (
        <div>
          <label className={label}>Kategori</label>
          <button type="button" onClick={() => setShowCategoryPicker(true)} className={fieldBtn}>
            {selectedCategory ? (
              <>
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] shrink-0"
                  style={{ backgroundColor: `${selectedCategory.color}1A` }}
                >
                  {selectedCategory.icon}
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                  {selectedCategory.name}
                  {subCategoryId && selectedCategory.sub_categories?.find(s => s.id === subCategoryId)
                    ? ` · ${selectedCategory.sub_categories.find(s => s.id === subCategoryId)!.name}`
                    : ""}
                </span>
              </>
            ) : (
              <span className="text-[13px] text-[#9E9B98] dark:text-[#4A4948]">Pilih kategori...</span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98] shrink-0">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}

      {/* Date + Description */}
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <div>
          <label className={label}>Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputField}
            required
          />
        </div>
        <div>
          <label className={label}>Keterangan</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opsional"
            maxLength={255}
            className={inputField}
          />
        </div>
      </div>

      {/* Notes (optional) */}
      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="text-[11px] font-semibold text-left"
          style={{ color: "var(--accent)" }}
        >
          + Tambah catatan
        </button>
      ) : (
        <div>
          <label className={label}>Catatan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan..."
            maxLength={1000}
            rows={2}
            className={inputField + " resize-none"}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={[
            "flex-1 py-3 rounded-[10px] text-[13px] font-bold",
            "bg-[#F0EEE9] dark:bg-[#242522] text-[#1A1917] dark:text-[#F0EEE9]",
            "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
            "active:scale-95 disabled:opacity-50",
          ].join(" ")}
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !accountId || (type === "transfer" && !toAccountId)}
          className={[
            "flex-1 py-3 rounded-[10px] text-[13px] font-bold text-white",
            "transition-all active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
          style={{ backgroundColor: "var(--accent)" }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Menyimpan...
            </span>
          ) : transaction ? "Simpan" : "Tambah"}
        </button>
      </div>

      {/* Pickers (rendered as separate modals on top) */}
      <CategoryPicker
        isOpen={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        categories={categories}
        selectedId={categoryId}
        onSelect={handleCategorySelect}
      />

      <AccountPicker
        isOpen={showAccountPicker}
        onClose={() => setShowAccountPicker(false)}
        accounts={accounts ?? []}
        selectedId={accountId}
        onSelect={setAccountId}
      />

      <AccountPicker
        isOpen={showToAccountPicker}
        onClose={() => setShowToAccountPicker(false)}
        accounts={accounts ?? []}
        selectedId={toAccountId}
        onSelect={setToAccountId}
        title="Pilih Akun Tujuan"
        excludeId={accountId}
      />
    </div>
  );
}

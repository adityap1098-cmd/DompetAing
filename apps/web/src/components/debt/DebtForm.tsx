import { useState } from "react";
import { AmountNumpad } from "@/components/ui/AmountNumpad";
import type { Debt } from "@dompetaing/shared";

interface DebtFormProps {
  debt?: Debt;
  onSubmit: (data: {
    type: "hutang" | "piutang";
    person_name: string;
    amount: number;
    description?: string;
    borrow_date: string;
    due_date?: string;
    reminder_enabled: boolean;
    auto_record: boolean;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DebtForm({ debt, onSubmit, onCancel, loading }: DebtFormProps) {
  // Step 1: amount, Step 2: details
  const [step, setStep] = useState<1 | 2>(debt ? 2 : 1);

  const [type, setType] = useState<"hutang" | "piutang">(debt?.type ?? "hutang");
  const [personName, setPersonName] = useState(debt?.person_name ?? "");
  const [amount, setAmount] = useState(debt ? String(Math.round(debt.amount)) : "");
  const [description, setDescription] = useState(debt?.description ?? "");
  const [borrowDate, setBorrowDate] = useState(
    debt?.borrow_date ? debt.borrow_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(debt?.due_date ? debt.due_date.slice(0, 10) : "");
  const [reminderEnabled, setReminderEnabled] = useState(debt?.reminder_enabled ?? true);
  const [autoRecord, setAutoRecord] = useState(debt?.auto_record ?? true);

  const isEdit = !!debt;

  function handleSubmit() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !personName.trim() || !borrowDate) return;

    onSubmit({
      type,
      person_name: personName.trim(),
      amount: numAmount,
      description: description.trim() || undefined,
      borrow_date: new Date(borrowDate).toISOString(),
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      reminder_enabled: reminderEnabled,
      auto_record: autoRecord,
    });
  }

  const label = "block text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] mb-1.5 uppercase tracking-[0.06em]";

  const inputField = [
    "w-full px-3.5 py-3 rounded-[12px] text-[13px]",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
    "text-[#1A1917] dark:text-[#F0EEE9]",
    "placeholder:text-[#9E9B98] dark:placeholder:text-[#4A4948]",
    "focus:outline-none focus:border-[var(--accent)]",
    "transition-colors",
  ].join(" ");

  const toggleRow = [
    "flex items-center justify-between py-3 px-3.5 rounded-[12px]",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
  ].join(" ");

  // ── STEP 1: Type + Amount ──
  if (step === 1) {
    return (
      <div className="flex flex-col px-4 pt-2 pb-4">
        {/* Type selector */}
        <div className="flex rounded-[12px] overflow-hidden bg-[#F0EEE9] dark:bg-[#242522] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] mb-4">
          {(["hutang", "piutang"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={[
                "flex-1 py-2.5 text-[12px] font-bold transition-all duration-150",
                type === t
                  ? t === "hutang"
                    ? "bg-[#C94A1C] dark:bg-[#E87340] text-white rounded-[10px] mx-0.5 my-0.5"
                    : "bg-[#1E8A5A] dark:bg-[#4CAF7A] text-white rounded-[10px] mx-0.5 my-0.5"
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")}
            >
              {t === "hutang" ? "🔴 Hutang" : "🟢 Piutang"}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-center text-[#9E9B98] dark:text-[#4A4948] mb-3">
          {type === "hutang" ? "Gua pinjam uang dari orang lain" : "Orang lain pinjam uang dari gua"}
        </p>

        {/* Custom numpad */}
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
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-4">
      {/* Amount summary — tap to go back */}
      <button
        type="button"
        onClick={() => setStep(1)}
        className={[
          "flex items-center justify-between py-3 px-4 rounded-[14px]",
          "bg-[#F0EEE9] dark:bg-[#242522]",
          "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
          "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">{type === "hutang" ? "🔴" : "🟢"}</span>
          <span className={[
            "text-[10px] font-bold uppercase tracking-wide",
            type === "hutang" ? "text-[#C94A1C] dark:text-[#E87340]" : "text-[#1E8A5A] dark:text-[#4CAF7A]",
          ].join(" ")}>
            {type === "hutang" ? "Hutang" : "Piutang"}
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

      {/* Person name */}
      <div>
        <label className={label}>
          {type === "hutang" ? "Dipinjam dari" : "Dipinjamkan ke"}
        </label>
        <input
          type="text"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder="Nama orang"
          maxLength={100}
          required
          className={inputField}
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className={label}>
          Keterangan <span className="font-normal normal-case text-[#C8C6C2] dark:text-[#3A3938]">(opsional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="cth: Pinjam modal stok"
          maxLength={500}
          className={inputField}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Tanggal pinjam</label>
          <input
            type="date"
            value={borrowDate}
            onChange={(e) => setBorrowDate(e.target.value)}
            required
            className={inputField}
          />
        </div>
        <div>
          <label className={label}>
            Jatuh tempo <span className="font-normal normal-case text-[#C8C6C2] dark:text-[#3A3938]">(opsional)</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputField}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <label className={toggleRow}>
          <div>
            <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
              Pengingat jatuh tempo
            </p>
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Notifikasi sebelum tenggat</p>
          </div>
          <div
            role="switch"
            aria-checked={reminderEnabled}
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={[
              "w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0",
              reminderEnabled ? "bg-[var(--accent)]" : "bg-[#D8D6D2] dark:bg-[#3A3B38]",
            ].join(" ")}
          >
            <div className={[
              "w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform duration-200",
              reminderEnabled ? "translate-x-[18px]" : "translate-x-0.5",
            ].join(" ")} />
          </div>
        </label>

        <label className={toggleRow}>
          <div>
            <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
              Catat otomatis saat lunas
            </p>
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Buat transaksi otomatis</p>
          </div>
          <div
            role="switch"
            aria-checked={autoRecord}
            onClick={() => setAutoRecord(!autoRecord)}
            className={[
              "w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0",
              autoRecord ? "bg-[var(--accent)]" : "bg-[#D8D6D2] dark:bg-[#3A3B38]",
            ].join(" ")}
          >
            <div className={[
              "w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform duration-200",
              autoRecord ? "translate-x-[18px]" : "translate-x-0.5",
            ].join(" ")} />
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={[
            "flex-1 py-3 rounded-[12px] text-[13px] font-bold",
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
          disabled={loading || !personName.trim() || !amount || !borrowDate}
          className={[
            "flex-1 py-3 rounded-[12px] text-[13px] font-bold text-white",
            "transition-all active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
          style={{ backgroundColor: "var(--accent)" }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            </span>
          ) : isEdit ? "Simpan" : "Tambah"}
        </button>
      </div>
    </div>
  );
}

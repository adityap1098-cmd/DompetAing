import { useState } from "react";
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

function formatAmountDisplay(raw: string): string {
  const n = raw.replace(/\D/g, "");
  if (!n) return "";
  return Number(n).toLocaleString("id-ID");
}

export function DebtForm({ debt, onSubmit, onCancel, loading }: DebtFormProps) {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  const toggleRow = [
    "flex items-center justify-between py-[10px] px-[14px] rounded-[10px]",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
  ].join(" ");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[10px] px-[18px] pt-2 pb-[18px]">
      {/* Type selector */}
      {!isEdit && (
        <div>
          <div className="flex rounded-[10px] overflow-hidden bg-[#F0EEE9] dark:bg-[#242522] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
            {(["hutang", "piutang"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  "flex-1 py-2.5 text-[12px] font-bold transition-all duration-150",
                  type === t
                    ? t === "hutang"
                      ? "bg-[#C94A1C] dark:bg-[#E87340] text-white rounded-[8px] mx-0.5 my-0.5"
                      : "bg-[#1E8A5A] dark:bg-[#4CAF7A] text-white rounded-[8px] mx-0.5 my-0.5"
                    : "text-[#9E9B98] dark:text-[#4A4948]",
                ].join(" ")}
              >
                {t === "hutang" ? "🔴 Hutang" : "🟢 Piutang"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-center text-[#9E9B98] dark:text-[#4A4948] mt-1.5">
            {type === "hutang" ? "Gua pinjam uang dari orang lain" : "Orang lain pinjam uang dari gua"}
          </p>
        </div>
      )}

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

      {/* Amount — native keyboard */}
      <div>
        <label className={label}>Nominal</label>
        <div className="relative">
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[13px] font-mono text-[#9E9B98] dark:text-[#4A4948]">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formatAmountDisplay(amount)}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className={inputField + " pl-10 font-mono font-semibold"}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={label}>
          Keterangan <span className="font-normal text-[#C8C6C2] dark:text-[#3A3938]">(opsional)</span>
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
            Jatuh tempo <span className="font-normal text-[#C8C6C2] dark:text-[#3A3938]">(opsional)</span>
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
      <div className="flex flex-col gap-[6px]">
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
      <div className="flex gap-2.5 pt-[8px]">
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
          type="submit"
          disabled={loading || !personName.trim() || !amount || !borrowDate}
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
            </span>
          ) : isEdit ? "Simpan" : "Tambah"}
        </button>
      </div>
    </form>
  );
}

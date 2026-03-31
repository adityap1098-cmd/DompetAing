import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
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
  const [type, setType] = useState<"hutang" | "piutang">(debt?.type ?? "hutang");
  const [personName, setPersonName] = useState(debt?.person_name ?? "");
  const [amount, setAmount] = useState(debt ? String(Math.round(debt.amount)) : "");
  const [description, setDescription] = useState(debt?.description ?? "");
  // borrow_date: store as YYYY-MM-DD for <input type="date">
  const [borrowDate, setBorrowDate] = useState(
    debt?.borrow_date ? debt.borrow_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(debt?.due_date ? debt.due_date.slice(0, 10) : "");
  const [reminderEnabled, setReminderEnabled] = useState(debt?.reminder_enabled ?? true);
  const [autoRecord, setAutoRecord] = useState(debt?.auto_record ?? true);

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

  const isEdit = !!debt;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      {!isEdit && (
        <div>
          <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2">
            Jenis
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["hutang", "piutang"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  "py-2.5 rounded-btn text-sm font-semibold border transition-all",
                  type === t
                    ? t === "hutang"
                      ? "bg-expense/10 dark:bg-expense-dark/10 border-expense dark:border-expense-dark text-expense dark:text-expense-dark"
                      : "bg-income/10 dark:bg-income-dark/10 border-income dark:border-income-dark text-income dark:text-income-dark"
                    : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
                ].join(" ")}
              >
                {t === "hutang" ? "🔴 Hutang" : "🟢 Piutang"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-1">
            {type === "hutang" ? "Gua pinjam uang dari orang lain" : "Orang lain pinjam uang dari gua"}
          </p>
        </div>
      )}

      {/* Person name */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          {type === "hutang" ? "Dipinjam dari" : "Dipinjamkan ke"}
        </label>
        <input
          type="text"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder="Nama orang"
          maxLength={100}
          required
          className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948] focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Nominal
        </label>
        <AmountInput value={amount} onChange={setAmount} />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Keterangan <span className="font-normal text-[#9E9B98] dark:text-[#4A4948]">(opsional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="cth: Pinjam modal stok"
          maxLength={500}
          className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948] focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
            Tanggal pinjam
          </label>
          <input
            type="date"
            value={borrowDate}
            onChange={(e) => setBorrowDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
            Jatuh tempo <span className="font-normal text-[#9E9B98] dark:text-[#4A4948]">(opsional)</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-1">
        <label className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-[#1A1917] dark:text-[#F0EEE9]">
              Pengingat jatuh tempo
            </p>
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Notifikasi sebelum tenggat</p>
          </div>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="w-4 h-4 accent-accent-500"
          />
        </label>
        <label className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-[#1A1917] dark:text-[#F0EEE9]">
              Catat otomatis saat lunas
            </p>
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Otomatis buat transaksi saat dilunasi</p>
          </div>
          <input
            type="checkbox"
            checked={autoRecord}
            onChange={(e) => setAutoRecord(e.target.checked)}
            className="w-4 h-4 accent-accent-500"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Batal
        </Button>
        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!personName.trim() || !amount || !borrowDate}
        >
          {isEdit ? "Simpan" : "Tambah"}
        </Button>
      </div>
    </form>
  );
}

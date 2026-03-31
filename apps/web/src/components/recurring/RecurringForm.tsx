import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import type { RecurringTransaction } from "@dompetaing/shared";
import type { CreateRecurringInput } from "@/hooks/useRecurring";

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function parseActiveDaysSet(activeDays: string | null | undefined): Set<number> {
  if (!activeDays) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const parsed = activeDays.split(",").map(Number).filter((n) => !isNaN(n) && n >= 0 && n <= 6);
  return parsed.length > 0 ? new Set(parsed) : new Set([0, 1, 2, 3, 4, 5, 6]);
}

interface RecurringFormProps {
  recurring?: RecurringTransaction;
  onSubmit: (data: CreateRecurringInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function RecurringForm({ recurring, onSubmit, onCancel, loading }: RecurringFormProps) {
  const [description, setDescription] = useState(recurring?.description ?? "");
  const [amount, setAmount] = useState(recurring ? String(Math.round(recurring.amount)) : "");
  const [type, setType] = useState<"expense" | "income">(recurring?.type ?? "expense");
  const [categoryId, setCategoryId] = useState(recurring?.category_id ?? "");
  const [accountId, setAccountId] = useState(recurring?.account_id ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">(
    (recurring?.frequency as "daily" | "weekly" | "monthly" | "yearly") ?? "monthly"
  );
  // weekly
  const [dayOfWeek, setDayOfWeek] = useState<number>(recurring?.day_of_week ?? 5);
  // monthly / yearly
  const [dayOfMonth, setDayOfMonth] = useState<number>(recurring?.day_of_month ?? 1);
  // daily: set of active day indices (0=Sun…6=Sat)
  const [activeDays, setActiveDays] = useState<Set<number>>(() =>
    parseActiveDaysSet(recurring?.frequency === "daily" ? recurring.active_days : null)
  );
  // yearly: month (1–12), stored in active_days
  const [monthOfYear, setMonthOfYear] = useState<number>(() => {
    if (recurring?.frequency === "yearly" && recurring.active_days) {
      const m = parseInt(recurring.active_days, 10);
      if (!isNaN(m) && m >= 1 && m <= 12) return m;
    }
    return new Date().getMonth() + 1;
  });

  const { data: allCategories } = useCategories();
  const { data: accounts } = useAccounts();

  const categories = (allCategories ?? []).filter(
    (c) => c.type === type || c.type === "both"
  );

  function toggleDay(idx: number) {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx); // keep at least 1 day
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !description.trim() || !accountId) return;

    let active_days: string | undefined;
    if (frequency === "daily") {
      active_days = Array.from(activeDays).sort().join(",");
    } else if (frequency === "yearly") {
      active_days = String(monthOfYear);
    }

    onSubmit({
      description: description.trim(),
      amount: numAmount,
      type,
      category_id: categoryId || undefined,
      account_id: accountId,
      frequency,
      day_of_week: frequency === "weekly" ? dayOfWeek : undefined,
      day_of_month: (frequency === "monthly" || frequency === "yearly") ? dayOfMonth : undefined,
      active_days,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Description */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Deskripsi
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="cth: BBM, Langganan Spotify"
          maxLength={255}
          required
          className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948] focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2">
          Jenis
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategoryId(""); }}
              className={[
                "py-2 rounded-btn text-sm font-semibold border transition-all",
                type === t
                  ? t === "expense"
                    ? "bg-expense/10 dark:bg-expense-dark/10 border-expense dark:border-expense-dark text-expense dark:text-expense-dark"
                    : "bg-income/10 dark:bg-income-dark/10 border-income dark:border-income-dark text-income dark:text-income-dark"
                  : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Nominal
        </label>
        <AmountInput value={amount} onChange={setAmount} />
      </div>

      {/* Category */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Kategori <span className="font-normal text-[#9E9B98] dark:text-[#4A4948]">(opsional)</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="">Tanpa kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Account */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Akun
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="">Pilih akun</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2">
          Frekuensi
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={[
                "py-2 rounded-btn text-xs font-semibold border transition-all",
                frequency === f
                  ? "bg-accent-500 dark:bg-accent-dark border-accent-500 dark:border-accent-dark text-white"
                  : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              {f === "daily" ? "Harian" : f === "weekly" ? "Mingguan" : f === "monthly" ? "Bulanan" : "Tahunan"}
            </button>
          ))}
        </div>
      </div>

      {/* Daily: active day checkboxes */}
      {frequency === "daily" && (
        <div>
          <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2">
            Hari aktif
          </label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={[
                  "py-2 rounded-btn text-[10px] font-semibold border transition-all",
                  activeDays.has(idx)
                    ? "bg-accent-500 dark:bg-accent-dark border-accent-500 dark:border-accent-dark text-white"
                    : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
                ].join(" ")}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weekly: day of week */}
      {frequency === "weekly" && (
        <div>
          <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2">
            Hari
          </label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDayOfWeek(idx)}
                className={[
                  "py-2 rounded-btn text-[10px] font-semibold border transition-all",
                  dayOfWeek === idx
                    ? "bg-accent-500 dark:bg-accent-dark border-accent-500 dark:border-accent-dark text-white"
                    : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
                ].join(" ")}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly: day of month */}
      {frequency === "monthly" && (
        <div>
          <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
            Tanggal tiap bulan
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      )}

      {/* Yearly: month + day */}
      {frequency === "yearly" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
              Bulan
            </label>
            <select
              value={monthOfYear}
              onChange={(e) => setMonthOfYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
              Tanggal
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-btn border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Batal
        </Button>
        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!description.trim() || !amount || !accountId}
        >
          {recurring ? "Simpan" : "Tambah"}
        </Button>
      </div>
    </form>
  );
}

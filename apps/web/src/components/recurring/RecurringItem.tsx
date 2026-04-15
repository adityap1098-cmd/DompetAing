import { formatRupiah, formatDate } from "@/lib/format";
import type { RecurringTransaction } from "@dompetaing/shared";

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function frequencyLabel(r: RecurringTransaction): string {
  switch (r.frequency) {
    case "daily": {
      if (r.active_days) {
        const days = r.active_days
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n >= 0 && n <= 6)
          .sort()
          .map((n) => DAY_NAMES[n]);
        if (days.length > 0 && days.length < 7) return `Setiap ${days.join(", ")}`;
      }
      return "Setiap hari";
    }
    case "weekly":
      return r.day_of_week !== null
        ? `Setiap ${DAY_NAMES[r.day_of_week]}`
        : "Setiap minggu";
    case "monthly":
      return r.day_of_month !== null
        ? `Setiap tgl ${r.day_of_month}`
        : "Setiap bulan";
    case "yearly": {
      const month = r.active_days ? parseInt(r.active_days, 10) : null;
      const dom = r.day_of_month;
      if (month && !isNaN(month) && month >= 1 && month <= 12 && dom) {
        return `Setiap ${dom} ${MONTH_ABBR[month - 1]}`;
      }
      return "Setiap tahun";
    }
    default:
      return r.frequency;
  }
}

interface RecurringItemProps {
  item: RecurringTransaction;
  onClick?: () => void;
}

export function RecurringItem({ item, onClick }: RecurringItemProps) {
  const isExpense = item.type === "expense";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors text-left"
    >
      {/* Icon */}
      <div
        className={[
          "w-8 h-8 rounded-[9px] flex items-center justify-center text-sm shrink-0",
          isExpense
            ? "bg-[#C94A1C]/10 dark:bg-[#E87340]/10"
            : "bg-[#1E8A5A]/10 dark:bg-[#4CAF7A]/10",
        ].join(" ")}
      >
        {item.category?.icon ?? (isExpense ? "💸" : "💰")}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">
            {item.description}
          </p>
          {!item.is_active && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0EEE9] dark:bg-[#242522] text-[#9E9B98] dark:text-[#4A4948] shrink-0">
              PAUSE
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
          {frequencyLabel(item)} · {item.account?.name ?? "—"}
        </p>
        <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">
          Berikutnya: {formatDate(item.next_run, "short")}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p
          className={[
            "text-[11px] font-semibold font-mono",
            item.is_active
              ? isExpense
                ? "text-[#C94A1C] dark:text-[#E87340]"
                : "text-[#1E8A5A] dark:text-[#4CAF7A]"
              : "text-[#9E9B98] dark:text-[#4A4948]",
          ].join(" ")}
        >
          {formatRupiah(item.amount)}
        </p>
        <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">
          ~{formatRupiah(item.monthly_total)}/bln
        </p>
      </div>
    </button>
  );
}

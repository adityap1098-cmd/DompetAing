import { formatRupiah, formatDate } from "@/lib/format";
import type { Debt } from "@dompetaing/shared";

interface DebtItemProps {
  debt: Debt;
  onClick?: () => void;
}

export function DebtItem({ debt, onClick }: DebtItemProps) {
  const isHutang = debt.type === "hutang";

  function getDueLabel() {
    if (!debt.due_date) return null;
    if (debt.is_paid) return null;
    if (debt.is_overdue) {
      const days = debt.days_remaining !== null ? Math.abs(debt.days_remaining) : 0;
      return <span className="text-[9px] font-bold text-[#C94A1C] dark:text-[#E87340]">🔴 Lewat {days} hari</span>;
    }
    if (debt.days_remaining !== null && debt.days_remaining <= 7) {
      return <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">⚠️ {debt.days_remaining === 0 ? "Hari ini!" : `${debt.days_remaining} hari lagi`}</span>;
    }
    return <span className="text-[9px] text-[#6B6864] dark:text-[#9E9B96]">Jatuh tempo {formatDate(debt.due_date, "short")}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-[17px] py-2.5 hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors text-left border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] last:border-b-0"
    >
      <div className={[
        "w-8 h-8 rounded-[9px] flex items-center justify-center text-sm shrink-0",
        isHutang ? "bg-[#C94A1C]/10 dark:bg-[#E87340]/10" : "bg-[#1E8A5A]/10 dark:bg-[#4CAF7A]/10",
      ].join(" ")}>
        {isHutang ? "🔴" : "🟢"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">{debt.person_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[9px] text-[#6B6864] dark:text-[#9E9B96]">
            {isHutang ? "Hutang" : "Piutang"} · {formatDate(debt.borrow_date, "short")}
          </span>
          {getDueLabel()}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={[
          "font-mono text-[11px] font-semibold",
          debt.is_paid ? "text-[#9E9B98] dark:text-[#4A4948] line-through"
          : isHutang ? "text-[#C94A1C] dark:text-[#E87340]"
          : "text-[#1E8A5A] dark:text-[#4CAF7A]",
        ].join(" ")}>
          {formatRupiah(debt.amount)}
        </p>
        <p className="text-[8px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
          {debt.is_paid ? "✓ Lunas" : "Belum lunas"}
        </p>
      </div>
    </button>
  );
}

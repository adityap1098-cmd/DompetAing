import type { Transaction } from "@dompetaing/shared";
import { formatRupiah } from "@/lib/format";
import { OfflineBadge } from "@/components/ui/OfflineBadge";

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  isPendingDelete?: boolean;
}

const TYPE_ICON: Record<string, string> = {
  expense: "💸",
  income: "💰",
  transfer: "↔️",
};

export function TransactionItem({
  transaction: t,
  onClick,
  onDelete,
  isPendingDelete,
}: TransactionItemProps) {
  const amountColor =
    t.type === "income"
      ? "text-[#1E8A5A] dark:text-[#4CAF7A]"
      : t.type === "expense"
      ? "text-[#C94A1C] dark:text-[#E87340]"
      : "text-[#6B6864] dark:text-[#9E9B96]";

  const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
  const icon = t.category?.icon ?? TYPE_ICON[t.type];
  const iconBg = t.category?.color ?? "var(--accent)";
  const categoryLabel =
    t.type === "transfer"
      ? `${t.account?.name ?? ""} → ${t.to_account?.name ?? ""}`
      : t.category?.name ?? "Lainnya";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-2.5 w-full px-[17px] py-2.5 text-left",
        "border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] last:border-b-0",
        "hover:bg-[#F0EEE9] dark:hover:bg-[#242522] active:bg-[#E8E6E0] dark:active:bg-[#2C2D2A]",
        "transition-colors duration-100",
        isPendingDelete ? "opacity-40" : "",
      ].join(" ")}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[13px] shrink-0"
        style={{ backgroundColor: iconBg ? `${iconBg}1F` : "rgba(46,125,90,0.12)" }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">
          {t.description}
        </p>
        <p className="text-[9px] text-[#6B6864] dark:text-[#9E9B96] truncate mt-0.5">
          {categoryLabel}
          {t.sub_category ? ` · ${t.sub_category.name}` : ""}
          {t.type !== "transfer" ? ` · ${t.account?.name ?? ""}` : ""}
        </p>
        {(t as Transaction & { _offline?: boolean })._offline && (
          <OfflineBadge className="mt-0.5" />
        )}
      </div>

      {/* Amount + date */}
      <div className="text-right shrink-0">
        <p className={`font-mono text-[11px] font-semibold ${amountColor}`}>
          {sign}{formatRupiah(t.amount)}
        </p>
        <p className="text-[8px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
          {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </p>
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          className="p-1.5 text-[#9E9B98] dark:text-[#4A4948] hover:text-[#C94A1C] dark:hover:text-[#E87340] transition-colors shrink-0"
          aria-label="Hapus transaksi"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </button>
  );
}

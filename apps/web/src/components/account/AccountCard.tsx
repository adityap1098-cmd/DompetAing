import type { Account } from "@dompetaing/shared";
import { useHideBalance } from "@/hooks/useHideBalance";

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const typeLabels: Record<Account["type"], string> = {
  bank: "Bank",
  ewallet: "E-Wallet",
  cash: "Tunai",
};

export function AccountCard({ account, onClick, onEdit, onDelete }: AccountCardProps) {
  const { formatAmount } = useHideBalance();
  return (
    <div
      className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform mx-[17px] mb-3"
      onClick={onClick}
    >
      {/* Color bar */}
      <div className="h-1 w-full" style={{ backgroundColor: account.color ?? "var(--accent)" }} />

      <div className="px-3.5 py-3 flex items-center gap-3">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: account.color ? `${account.color}20` : "rgba(46,125,90,0.12)" }}
        >
          {account.icon ?? "🏦"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] truncate">
              {account.name}
            </p>
            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]">
              {typeLabels[account.type]}
            </span>
          </div>
          {account.bank_name && (
            <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] truncate mt-0.5">{account.bank_name}</p>
          )}
        </div>

        {/* Balance */}
        <div className="shrink-0 text-right">
          <p className={[
            "font-mono text-[13px] font-semibold",
            account.balance >= 0 ? "text-[#1A1917] dark:text-[#F0EEE9]" : "text-[#C94A1C] dark:text-[#E87340]",
          ].join(" ")}>
            {formatAmount(account.balance, { compact: true })}
          </p>
        </div>
      </div>

      {/* Action row */}
      {(onEdit ?? onDelete) && (
        <div className="flex border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] divide-x divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
          {onEdit && (
            <button
              className="flex-1 py-2 text-[11px] font-semibold text-accent-500 dark:text-accent-dark hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="flex-1 py-2 text-[11px] font-semibold text-[#C94A1C] dark:text-[#E87340] hover:bg-[#C94A1C]/5 dark:hover:bg-[#E87340]/5 transition-colors"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}

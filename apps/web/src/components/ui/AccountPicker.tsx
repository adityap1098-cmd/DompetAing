import { Modal } from "@/components/ui/Modal";
import { formatRupiah } from "@/lib/format";

interface AccountOption {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  balance?: number;
}

interface AccountPickerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  selectedId?: string;
  onSelect: (accountId: string) => void;
  title?: string;
  excludeId?: string;
}

export function AccountPicker({
  isOpen,
  onClose,
  accounts,
  selectedId,
  onSelect,
  title = "Pilih Akun",
  excludeId,
}: AccountPickerProps) {
  const filtered = excludeId
    ? accounts.filter((a) => a.id !== excludeId)
    : accounts;

  function handleSelect(id: string) {
    onSelect(id);
    onClose();
  }

  const typeLabel: Record<string, string> = {
    bank: "Bank",
    ewallet: "E-Wallet",
    cash: "Tunai",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="pb-4">
        {filtered.map((account) => {
          const isSelected = account.id === selectedId;

          return (
            <button
              key={account.id}
              type="button"
              onClick={() => handleSelect(account.id)}
              className={[
                "flex items-center gap-3 px-4 py-3.5 w-full text-left",
                "border-b border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)]",
                "hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors",
                "active:bg-[#E8E6E0] dark:active:bg-[#2C2D2A]",
                isSelected ? "bg-[#F0EEE9]/60 dark:bg-[#242522]/60" : "",
              ].join(" ")}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] shrink-0"
                style={{ backgroundColor: account.color ? `${account.color}1A` : "rgba(46,125,90,0.1)" }}
              >
                {account.icon}
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">
                  {account.name}
                </p>
                <p className="text-[11px] text-[#9E9B98] dark:text-[#4A4948]">
                  {typeLabel[account.type] ?? account.type}
                </p>
              </div>

              {/* Balance + check */}
              <div className="flex items-center gap-2 shrink-0">
                {typeof account.balance === "number" && (
                  <span className="font-mono text-[12px] font-medium text-[#6B6864] dark:text-[#9E9B96]">
                    {formatRupiah(account.balance)}
                  </span>
                )}
                {isSelected && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-[#9E9B98] dark:text-[#4A4948]">
              Tidak ada akun tersedia
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

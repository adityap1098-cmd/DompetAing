
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  confirmVariant = "primary",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-[#1C1D1A] rounded-[18px] shadow-xl p-5 border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]"
      >
        <h3
          id="confirm-title"
          className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-2"
        >
          {title}
        </h3>
        <p
          id="confirm-description"
          className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-5"
        >
          {description}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[12px] font-semibold text-[#6B6864] dark:text-[#9E9B96] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "flex-1 py-2.5 rounded-[10px] text-[12px] font-semibold disabled:opacity-50",
              confirmVariant === "danger"
                ? "bg-[#C94A1C]/10 dark:bg-[#E87340]/10 text-[#C94A1C] dark:text-[#E87340]"
                : "bg-accent-500 dark:bg-accent-dark text-white",
            ].join(" ")}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

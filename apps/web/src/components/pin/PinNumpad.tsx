// Custom numpad for PIN entry — 3×4 grid, mobile-friendly touch targets
import { useCallback } from "react";

interface PinNumpadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onConfirm?: () => void;        // if provided, renders OK button; otherwise renders empty
  confirmDisabled?: boolean;
  variant?: "light" | "dark";     // dark = lock screen, light = bottom sheet
}

export function PinNumpad({
  onDigit,
  onDelete,
  onConfirm,
  confirmDisabled,
  variant = "light",
}: PinNumpadProps) {
  const handlePress = useCallback(
    (value: string) => {
      // Haptic-like feedback via brief scale animation handled by CSS
      if (value === "delete") {
        onDelete();
      } else if (value === "confirm") {
        onConfirm?.();
      } else {
        onDigit(value);
      }
    },
    [onDigit, onDelete, onConfirm]
  );

  const isDark = variant === "dark";

  // Button style classes
  const digitClass = [
    "flex items-center justify-center rounded-full",
    "min-w-[64px] min-h-[64px] w-16 h-16",
    "text-[22px] font-semibold select-none",
    "transition-all duration-100 active:scale-90",
    isDark
      ? "bg-white/10 text-white hover:bg-white/15 active:bg-white/20"
      : "bg-[#F0EEE9] dark:bg-[#2A2B28] text-[#1A1917] dark:text-[#F0EEE9] hover:bg-[#E8E6E0] dark:hover:bg-[#333432] active:bg-[#DDDBD6] dark:active:bg-[#3C3D3A]",
  ].join(" ");

  const actionClass = [
    "flex items-center justify-center rounded-full",
    "min-w-[64px] min-h-[64px] w-16 h-16",
    "text-[16px] font-semibold select-none",
    "transition-all duration-100 active:scale-90",
  ].join(" ");

  const deleteClass = [
    actionClass,
    isDark
      ? "text-white/70 hover:bg-white/10 active:bg-white/15"
      : "text-[#6B6864] dark:text-[#9E9B96] hover:bg-[#F0EEE9] dark:hover:bg-[#2A2B28] active:bg-[#E8E6E0]",
  ].join(" ");

  const confirmClass = [
    actionClass,
    confirmDisabled
      ? "opacity-30 cursor-not-allowed"
      : isDark
        ? "bg-white/20 text-white hover:bg-white/25 active:bg-white/30"
        : "bg-accent-500 dark:bg-accent-dark text-white hover:opacity-90 active:opacity-80",
  ].join(" ");

  // Grid layout: 1-9, delete, 0, OK
  const keys = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "delete", "0", "confirm",
  ];

  return (
    <div className="grid grid-cols-3 gap-3 justify-items-center w-fit mx-auto px-4">
      {keys.map((key) => {
        if (key === "delete") {
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePress("delete")}
              className={deleteClass}
              aria-label="Hapus"
            >
              {/* Backspace icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
          );
        }

        if (key === "confirm") {
          if (!onConfirm) {
            // Empty placeholder to keep grid aligned
            return <div key={key} className="w-16 h-16" />;
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => !confirmDisabled && handlePress("confirm")}
              disabled={confirmDisabled}
              className={confirmClass}
              aria-label="Konfirmasi"
            >
              {/* Check icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          );
        }

        return (
          <button
            key={key}
            type="button"
            onClick={() => handlePress(key)}
            className={digitClass}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

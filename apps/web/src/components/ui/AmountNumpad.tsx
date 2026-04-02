import { useState, useCallback } from "react";

interface AmountNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmLabel?: string;
}

function formatDisplay(raw: string): string {
  const n = raw.replace(/\D/g, "");
  if (!n) return "0";
  return Number(n).toLocaleString("id-ID");
}

export function AmountNumpad({
  value,
  onChange,
  onConfirm,
  confirmDisabled,
  confirmLabel,
}: AmountNumpadProps) {
  const handleDigit = useCallback(
    (digit: string) => {
      const current = value.replace(/\D/g, "");
      // Max 15 digits
      if (current.length >= 15) return;
      // Don't allow leading zeros
      const next = current === "0" || current === "" ? digit : current + digit;
      onChange(next);
    },
    [value, onChange]
  );

  const handleDelete = useCallback(() => {
    const current = value.replace(/\D/g, "");
    if (current.length <= 1) {
      onChange("");
    } else {
      onChange(current.slice(0, -1));
    }
  }, [value, onChange]);

  const handleTripleZero = useCallback(() => {
    const current = value.replace(/\D/g, "");
    if (!current || current === "0") return;
    if (current.length >= 13) return;
    onChange(current + "000");
  }, [value, onChange]);

  const displayValue = formatDisplay(value);
  const numericValue = Number(value.replace(/\D/g, "") || "0");

  const digitClass = [
    "flex items-center justify-center rounded-full",
    "w-[72px] h-[52px]",
    "text-[20px] font-semibold select-none",
    "transition-all duration-100 active:scale-90",
    "bg-[#F0EEE9] dark:bg-[#2A2B28] text-[#1A1917] dark:text-[#F0EEE9]",
    "hover:bg-[#E8E6E0] dark:hover:bg-[#333432]",
    "active:bg-[#DDDBD6] dark:active:bg-[#3C3D3A]",
  ].join(" ");

  const actionClass = [
    "flex items-center justify-center rounded-full",
    "w-[72px] h-[52px]",
    "text-[14px] font-semibold select-none",
    "transition-all duration-100 active:scale-90",
  ].join(" ");

  const keys = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "000", "0", "delete",
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Amount display */}
      <div className="flex items-baseline justify-center gap-1.5 py-3 px-4 min-h-[56px]">
        <span className="font-mono text-[18px] font-medium text-[#9E9B98] dark:text-[#4A4948]">
          Rp
        </span>
        <span
          className={[
            "font-mono font-bold text-center transition-all",
            numericValue > 0
              ? "text-[#1A1917] dark:text-[#F0EEE9]"
              : "text-[#C8C6C2] dark:text-[#3A3938]",
            displayValue.length > 12 ? "text-[22px]" : displayValue.length > 8 ? "text-[26px]" : "text-[32px]",
          ].join(" ")}
        >
          {displayValue}
        </span>
      </div>

      {/* Numpad grid */}
      <div className="grid grid-cols-3 gap-2 justify-items-center w-fit mx-auto">
        {keys.map((key) => {
          if (key === "delete") {
            return (
              <button
                key={key}
                type="button"
                onClick={handleDelete}
                className={[
                  actionClass,
                  "text-[#6B6864] dark:text-[#9E9B96]",
                  "hover:bg-[#F0EEE9] dark:hover:bg-[#2A2B28]",
                ].join(" ")}
                aria-label="Hapus"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            );
          }

          if (key === "000") {
            return (
              <button
                key={key}
                type="button"
                onClick={handleTripleZero}
                className={digitClass + " text-[16px]"}
              >
                000
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDigit(key)}
              className={digitClass}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled || numericValue <= 0}
          className={[
            "w-full max-w-[240px] py-3 rounded-[14px] text-[14px] font-bold",
            "transition-all duration-150 active:scale-95 mt-1",
            numericValue > 0 && !confirmDisabled
              ? "text-white"
              : "bg-[#E8E6E0] dark:bg-[#2A2B28] text-[#9E9B98] dark:text-[#4A4948] cursor-not-allowed",
          ].join(" ")}
          style={
            numericValue > 0 && !confirmDisabled
              ? { backgroundColor: "var(--accent)" }
              : undefined
          }
        >
          {confirmLabel ?? "Lanjut"}
        </button>
      )}
    </div>
  );
}

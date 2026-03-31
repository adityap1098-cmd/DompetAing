// src/components/ui/AmountInput.tsx
import { useRef } from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AmountInput({ value, onChange, placeholder = "0", autoFocus }: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function formatDisplay(raw: string): string {
    const n = raw.replace(/\D/g, "");
    if (!n) return "";
    return Number(n).toLocaleString("id-ID");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  }

  return (
    <div
      className="flex items-center justify-center gap-2 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="font-mono text-[22px] font-medium text-[#9E9B98] dark:text-[#4A4948]">
        Rp
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={formatDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={[
          "bg-transparent text-center outline-none",
          "font-mono text-[28px] font-medium",
          "text-[#1A1917] dark:text-[#F0EEE9]",
          "placeholder:text-[#C8C6C2] dark:placeholder:text-[#3A3938]",
          "w-full max-w-[220px]",
        ].join(" ")}
      />
    </div>
  );
}
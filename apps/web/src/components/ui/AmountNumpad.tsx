import { useState, useCallback, useMemo } from "react";

interface AmountNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmLabel?: string;
}

const OPERATORS = new Set(["+", "-", "*", "/"]);

function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return Math.round(n).toLocaleString("id-ID");
}

/** Safely evaluate a simple math expression (digits and +−×÷ only) */
function evalExpression(expr: string): number | null {
  // Remove all spaces
  const clean = expr.replace(/\s/g, "");
  if (!clean) return null;

  // Validate: only digits, operators, and dots allowed
  if (!/^[\d+\-*/]+$/.test(clean)) return null;

  // Split into tokens
  const tokens: (number | string)[] = [];
  let numBuf = "";
  for (const ch of clean) {
    if (OPERATORS.has(ch)) {
      if (!numBuf) return null; // operator at start or double operator
      tokens.push(Number(numBuf));
      tokens.push(ch);
      numBuf = "";
    } else {
      numBuf += ch;
    }
  }
  if (!numBuf) return null; // trailing operator
  tokens.push(Number(numBuf));

  // Evaluate: first pass for * and /, second pass for + and -
  // First pass: multiply & divide
  const addSub: (number | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (i + 2 < tokens.length && (tokens[i + 1] === "*" || tokens[i + 1] === "/")) {
      let acc = tokens[i] as number;
      while (i + 2 < tokens.length && (tokens[i + 1] === "*" || tokens[i + 1] === "/")) {
        const op = tokens[i + 1] as string;
        const right = tokens[i + 2] as number;
        acc = op === "*" ? acc * right : right !== 0 ? acc / right : 0;
        i += 2;
      }
      addSub.push(acc);
    } else {
      addSub.push(tokens[i]);
    }
    i++;
  }

  // Second pass: add & subtract
  let result = addSub[0] as number;
  for (let j = 1; j < addSub.length; j += 2) {
    const op = addSub[j] as string;
    const val = addSub[j + 1] as number;
    result = op === "+" ? result + val : result - val;
  }

  return Number.isFinite(result) ? result : null;
}

function hasOperator(expr: string): boolean {
  return /[+\-*/]/.test(expr);
}

function formatDisplay(raw: string): string {
  if (!raw) return "0";
  // Format each number segment while keeping operators
  return raw.replace(/\d+/g, (match) => {
    const n = Number(match);
    return n.toLocaleString("id-ID");
  });
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
      // Get the current number segment (after last operator)
      const lastOpIdx = Math.max(
        value.lastIndexOf("+"),
        value.lastIndexOf("-"),
        value.lastIndexOf("*"),
        value.lastIndexOf("/")
      );
      const currentSegment = lastOpIdx >= 0 ? value.slice(lastOpIdx + 1) : value;

      // Max 15 digits per segment
      if (currentSegment.length >= 15) return;

      if (!value || value === "0") {
        onChange(digit);
      } else {
        // Don't allow leading zeros in a segment
        if (currentSegment === "0") {
          onChange(value.slice(0, -1) + digit);
        } else {
          onChange(value + digit);
        }
      }
    },
    [value, onChange]
  );

  const handleDelete = useCallback(() => {
    if (value.length <= 1) {
      onChange("");
    } else {
      onChange(value.slice(0, -1));
    }
  }, [value, onChange]);

  const handleTripleZero = useCallback(() => {
    if (!value || value === "0") return;
    // Don't add 000 right after an operator
    const lastChar = value[value.length - 1];
    if (OPERATORS.has(lastChar)) return;

    const lastOpIdx = Math.max(
      value.lastIndexOf("+"),
      value.lastIndexOf("-"),
      value.lastIndexOf("*"),
      value.lastIndexOf("/")
    );
    const currentSegment = lastOpIdx >= 0 ? value.slice(lastOpIdx + 1) : value;
    if (currentSegment.length >= 13) return;

    onChange(value + "000");
  }, [value, onChange]);

  const handleOperator = useCallback(
    (op: string) => {
      if (!value) return;
      const lastChar = value[value.length - 1];
      // Replace last operator if pressing a different one
      if (OPERATORS.has(lastChar)) {
        onChange(value.slice(0, -1) + op);
      } else {
        onChange(value + op);
      }
    },
    [value, onChange]
  );

  const showCalc = hasOperator(value);
  const calcResult = useMemo(() => (showCalc ? evalExpression(value) : null), [showCalc, value]);

  // When confirming, resolve expression to final number
  const handleConfirm = useCallback(() => {
    if (showCalc && calcResult !== null && calcResult > 0) {
      onChange(String(Math.round(calcResult)));
    }
    // Small delay to let state update before parent reads it
    setTimeout(() => onConfirm?.(), 10);
  }, [showCalc, calcResult, onChange, onConfirm]);

  const displayValue = formatDisplay(value);
  const numericValue = showCalc
    ? (calcResult ?? 0)
    : Number(value.replace(/\D/g, "") || "0");

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

  const operatorClass = [
    "flex items-center justify-center rounded-full",
    "w-[42px] h-[42px]",
    "text-[18px] font-bold select-none",
    "transition-all duration-100 active:scale-90",
    "bg-[var(--accent)]/15 text-[var(--accent)]",
    "hover:bg-[var(--accent)]/25",
    "active:bg-[var(--accent)]/35",
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
      <div className="flex flex-col items-center justify-center py-3 px-4 min-h-[56px]">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="font-mono text-[18px] font-medium text-[#9E9B98] dark:text-[#4A4948]">
            Rp
          </span>
          <span
            className={[
              "font-mono font-bold text-center transition-all",
              numericValue > 0
                ? "text-[#1A1917] dark:text-[#F0EEE9]"
                : "text-[#C8C6C2] dark:text-[#3A3938]",
              displayValue.length > 16 ? "text-[18px]" : displayValue.length > 12 ? "text-[22px]" : displayValue.length > 8 ? "text-[26px]" : "text-[32px]",
            ].join(" ")}
          >
            {displayValue}
          </span>
        </div>
        {/* Calculator result preview */}
        {showCalc && calcResult !== null && (
          <div className="mt-1 text-[14px] font-mono font-semibold" style={{ color: "var(--accent)" }}>
            = Rp {formatNumber(calcResult)}
          </div>
        )}
      </div>

      {/* Operator row */}
      <div className="flex items-center justify-center gap-3 mb-1">
        {["+", "-", "*", "/"].map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => handleOperator(op)}
            className={operatorClass}
          >
            {op === "*" ? "×" : op === "/" ? "÷" : op}
          </button>
        ))}
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
          onClick={handleConfirm}
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

import { useState } from "react";
import type { Account } from "@dompetaing/shared";
import { Button } from "@/components/ui/Button";

interface AccountFormProps {
  account?: Account;
  onSubmit: (data: AccountFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface AccountFormData {
  name: string;
  type: "bank" | "ewallet" | "cash";
  bank_name: string | null;
  initial_balance: number;
  color: string;
  icon: string;
}

const PRESET_COLORS = [
  "#2E7D5A",
  "#1A6BB5",
  "#9333EA",
  "#C94A1C",
  "#D4570B",
  "#0E7490",
  "#059669",
  "#64748B",
];

const PRESET_ICONS = [
  "🏦", "💳", "💰", "🏧", "💵",
  "🪙", "📱", "💎", "🌟", "🏠",
];

const TYPE_OPTIONS: Array<{ value: "bank" | "ewallet" | "cash"; label: string; emoji: string }> = [
  { value: "bank", label: "Bank", emoji: "🏦" },
  { value: "ewallet", label: "E-Wallet", emoji: "📱" },
  { value: "cash", label: "Tunai", emoji: "💵" },
];

function formatNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseNumberInput(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

export function AccountForm({ account, onSubmit, onCancel, loading = false }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<"bank" | "ewallet" | "cash">(account?.type ?? "bank");
  const [bankName, setBankName] = useState(account?.bank_name ?? "");
  const [balanceDisplay, setBalanceDisplay] = useState(
    account?.initial_balance != null
      ? Number(account.initial_balance).toLocaleString("id-ID")
      : ""
  );
  const [color, setColor] = useState(account?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(account?.icon ?? PRESET_ICONS[0]);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    if (!name.trim()) newErrors.name = "Nama akun wajib diisi";
    if (type === "bank" && !bankName.trim()) newErrors.bank_name = "Nama bank wajib diisi";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      type,
      bank_name: type === "bank" ? bankName.trim() : null,
      initial_balance: parseNumberInput(balanceDisplay),
      color,
      icon,
    });
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBalanceDisplay(formatNumberInput(e.target.value));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[10px] px-[18px] pt-2 pb-[18px]">
      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Nama Akun <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: BCA Tabungan"
          className={[
            "w-full px-3 py-2.5 rounded-[10px] border text-[12px] bg-[#F7F6F3] dark:bg-[#111210]",
            "text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948]",
            "focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-dark",
            errors.name
              ? "border-red-400 dark:border-red-600"
              : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]",
          ].join(" ")}
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Tipe Akun <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={[
                "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                type === opt.value
                  ? "border-accent-500 dark:border-accent-dark bg-accent-50 dark:bg-accent-100 text-accent-600 dark:text-accent-dark"
                  : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-[#F7F6F3] dark:bg-[#111210] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              <span className="text-xl">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bank Name (conditional) */}
      {type === "bank" && (
        <div>
          <label className="block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
            Nama Bank <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Contoh: BCA, Mandiri, BNI"
            className={[
              "w-full px-3 py-2.5 rounded-[10px] border text-[12px] bg-[#F7F6F3] dark:bg-[#111210]",
              "text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948]",
              "focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-dark",
              errors.bank_name
                ? "border-red-400 dark:border-red-600"
                : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]",
            ].join(" ")}
          />
          {errors.bank_name && (
            <p className="text-xs text-red-500 mt-1">{errors.bank_name}</p>
          )}
        </div>
      )}

      {/* Initial Balance */}
      <div>
        <label className="block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Saldo Awal
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#6B6864] dark:text-[#9E9B96] font-medium">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={balanceDisplay}
            onChange={handleBalanceChange}
            placeholder="0"
            className="w-full pl-9 pr-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[12px] bg-[#F7F6F3] dark:bg-[#111210] text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948] focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-dark"
          />
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Warna
        </label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={[
                "w-8 h-8 rounded-full transition-transform",
                color === c ? "ring-2 ring-offset-2 ring-[#9E9B98] dark:ring-offset-[#111210] scale-110" : "",
              ].join(" ")}
              style={{ backgroundColor: c }}
              aria-label={`Warna ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Icon Picker */}
      <div>
        <label className="block text-[11px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1.5">
          Ikon
        </label>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={[
                "h-10 rounded-xl text-xl transition-all",
                icon === ic
                  ? "bg-accent-50 dark:bg-accent-100 ring-2 ring-accent-500 dark:ring-accent-dark"
                  : "bg-[#F7F6F3] dark:bg-[#111210] hover:bg-[#F0EEE9] dark:hover:bg-[#242522]",
              ].join(" ")}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#111210] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
            {name || "Nama Akun"}
          </p>
          <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">
            {type === "bank" && bankName ? bankName : TYPE_OPTIONS.find((o) => o.value === type)?.label}
          </p>
        </div>
        <div
          className="ml-auto w-2 h-8 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" fullWidth type="button" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button variant="primary" fullWidth type="submit" loading={loading}>
          {account ? "Simpan" : "Tambah Akun"}
        </Button>
      </div>
    </form>
  );
}

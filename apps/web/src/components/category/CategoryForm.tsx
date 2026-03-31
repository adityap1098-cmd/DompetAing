import { useState } from "react";
import type { Category } from "@dompetaing/shared";
import { Button } from "@/components/ui/Button";

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income" | "both";
}

const PRESET_COLORS = [
  "#D4570B", "#C94A1C", "#9333EA", "#1A6BB5",
  "#2E7D5A", "#059669", "#047857", "#0E7490",
  "#0369A1", "#6C3FC5", "#64748B", "#78716C",
];

const PRESET_ICONS = [
  "🍜", "🛵", "💻", "🛒", "🏠", "🎮", "💊",
  "💼", "💰", "📈", "🔄", "📦", "✈️", "🎓",
  "👗", "🏋️", "🎁", "🐾", "📱", "🏷️", "💡",
  "🎵", "🍕", "☕", "🚗", "🏦", "💳", "🌿",
  "⚽", "📚", "🎨", "🏥",
];

const TYPE_OPTIONS: Array<{ value: "expense" | "income" | "both"; label: string; color: string }> = [
  { value: "expense", label: "Pengeluaran", color: "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
  { value: "income", label: "Pemasukan", color: "border-green-400 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
  { value: "both", label: "Keduanya", color: "border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
];

export function CategoryForm({ category, onSubmit, onCancel, loading = false }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? PRESET_ICONS[0]);
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);
  const [type, setType] = useState<"expense" | "income" | "both">(category?.type as "expense" | "income" | "both" ?? "expense");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    if (!name.trim()) newErrors.name = "Nama kategori wajib diisi";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ name: name.trim(), icon, color, type });
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-6 pt-2 space-y-5">
      {/* Name */}
      <div>
        <label className="block text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-1.5">
          Nama Kategori <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Makanan & Minuman"
          className={[
            "w-full px-3 py-2.5 rounded-[12px] border text-[12px] bg-[#F7F6F3] dark:bg-[#111210]",
            "text-[#1A1917] dark:text-[#F0EEE9] placeholder-[#9E9B98] dark:placeholder-[#4A4948]",
            "focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-dark",
            errors.name
              ? "border-red-400 dark:border-red-600"
              : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]",
          ].join(" ")}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Type */}
      <div>
        <label className="block text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-1.5">
          Tipe <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={[
                "py-2 rounded-xl border text-xs font-semibold transition-all",
                type === opt.value
                  ? opt.color
                  : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-[#F7F6F3] dark:bg-[#111210] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Picker */}
      <div>
        <label className="block text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-1.5">
          Ikon
        </label>
        <div className="grid grid-cols-8 gap-1.5">
          {PRESET_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={[
                "h-9 rounded-lg text-lg transition-all",
                icon === ic
                  ? "ring-2 ring-accent-500 dark:ring-accent-dark bg-accent-50 dark:bg-accent-100"
                  : "bg-[#F7F6F3] dark:bg-[#111210] hover:bg-[#F0EEE9] dark:hover:bg-[#242522]",
              ].join(" ")}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-1.5">
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
            {name || "Nama Kategori"}
          </p>
          <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">
            {TYPE_OPTIONS.find((o) => o.value === type)?.label}
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
          {category ? "Simpan" : "Tambah Kategori"}
        </Button>
      </div>
    </form>
  );
}

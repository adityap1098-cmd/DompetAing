// ── Currency Formatter ──
export function formatRupiah(amount: number, _opts: { compact?: boolean } = {}): string {
  // Always display full number with thousand separators — e.g. "Rp 1.850.000"
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Normalize Unicode space variants (U+202F, U+00A0) to regular space
  return formatted.replace(/\s+/g, " ").trim();
}

// ── Date Formatters ──
export function formatDate(
  date: string | Date,
  format: "short" | "long" | "relative" | "month-year" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "relative") {
    return formatRelative(d);
  }

  if (format === "month-year") {
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }

  if (format === "long") {
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
  return `${Math.floor(diffDays / 365)} tahun lalu`;
}

// ── Percentage ──
export function formatPercent(value: number, decimals = 0): string {
  return `${Math.min(100, value).toFixed(decimals)}%`;
}

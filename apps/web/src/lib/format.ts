// ── Currency Formatter ──
export function formatRupiah(amount: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toFixed(1)}Jt`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `Rp ${(amount / 1_000).toFixed(0)}rb`;
    }
    return `Rp ${amount}`;
  }

  // Intl formatter produces "Rp 20.658.152" with non-breaking space — normalize to regular space
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Replace any Unicode space variants (narrow no-break space U+202F, no-break space U+00A0) with regular space
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

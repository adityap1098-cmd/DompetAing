import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "/v1";

// ── Types ──
export interface CategoryBreakdown {
  category: { id: string | null; name: string; icon: string; color: string };
  amount: number;
  percentage: number;
  transaction_count: number;
}

export interface DailyBreakdown {
  date: string;
  income: number;
  expense: number;
}

export interface MonthlyReport {
  period: { month: number; year: number };
  income: number;
  expense: number;
  savings: number;
  expense_by_category: CategoryBreakdown[];
  income_by_category: CategoryBreakdown[];
  daily_breakdown: DailyBreakdown[];
}

export interface TrendReport {
  labels: string[];
  income: number[];
  expense: number[];
  savings: number[];
}

export interface YearlyMonth {
  month: number;
  label: string;
  income: number;
  expense: number;
  savings: number;
}

export interface YearlyReport {
  year: number;
  months: YearlyMonth[];
}

// ── Hooks ──
export function useMonthlyReport(month: number, year: number) {
  return useQuery<MonthlyReport>({
    queryKey: ["reports", "monthly", month, year],
    queryFn: () => api.get<MonthlyReport>(`/reports/monthly?month=${month}&year=${year}`),
    staleTime: 60 * 1000,
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 403) return false;
      return count < 2;
    },
  });
}

export function useTrendReport(months = 6) {
  return useQuery<TrendReport>({
    queryKey: ["reports", "trend", months],
    queryFn: () => api.get<TrendReport>(`/reports/trend?months=${months}`),
    staleTime: 60 * 1000,
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 403) return false;
      return count < 2;
    },
  });
}

export function useYearlyReport(year: number) {
  return useQuery<YearlyReport>({
    queryKey: ["reports", "yearly", year],
    queryFn: () => api.get<YearlyReport>(`/reports/yearly?year=${year}`),
    staleTime: 60 * 1000,
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 403) return false;
      return count < 2;
    },
  });
}

// ── Download util ──
export async function downloadExport(
  format: "csv" | "excel" | "pdf",
  body: { date_from: string; date_to: string }
): Promise<void> {
  const endpoint = format === "excel" ? "excel" : format;
  const res = await fetch(`${API_BASE}/export/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = await res.json() as { error?: string };
    throw new Error(json.error ?? "Export gagal");
  }

  if (format === "pdf") {
    // Open HTML in new window — user prints as PDF
    const html = await res.text();
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = body.date_from.replace(/-/g, "");
  a.download = format === "excel" ? `transaksi_${date}.xlsx` : `transaksi_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

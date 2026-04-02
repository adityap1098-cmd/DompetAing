import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { offlineDb } from "@/lib/offline/db";
import type { RecurringTransaction } from "@dompetaing/shared";

// ── Types ──
export interface RecurringSummary {
  total_expense_monthly: number;
  total_income_monthly: number;
}

export interface RecurringListResponse {
  items: RecurringTransaction[];
  summary: RecurringSummary;
}

export interface CreateRecurringInput {
  description: string;
  amount: number;
  type: "expense" | "income";
  category_id?: string;
  sub_category_id?: string;
  account_id: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_week?: number;
  day_of_month?: number;
  active_days?: string;
}

// ── Query Keys ──
const RECURRING_KEY = ["recurring"] as const;

// ── Fetch Hooks (with offline fallback) ──
export function useRecurring() {
  return useQuery<RecurringListResponse>({
    queryKey: RECURRING_KEY,
    queryFn: async () => {
      try {
        return await api.get<RecurringListResponse>("/recurring");
      } catch (err) {
        if (!navigator.onLine) {
          const items = await offlineDb.recurring.toArray();
          let totalExpense = 0;
          let totalIncome = 0;
          for (const r of items) {
            if (r.is_active) {
              const amount = r.monthly_total || Number(r.amount) || 0;
              if (r.type === "expense") totalExpense += amount;
              if (r.type === "income") totalIncome += amount;
            }
          }
          return {
            items: items as unknown as RecurringTransaction[],
            summary: {
              total_expense_monthly: totalExpense,
              total_income_monthly: totalIncome,
            },
          };
        }
        throw err;
      }
    },
  });
}

// ── Mutation Hooks ──
export function useCreateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecurringInput) =>
      api.post<RecurringTransaction>("/recurring", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: CreateRecurringInput & { id: string }) =>
      api.put<RecurringTransaction>(`/recurring/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/recurring/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useToggleRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<RecurringTransaction>(`/recurring/${id}/toggle`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useExecuteNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ created: number }>("/recurring/execute-now", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

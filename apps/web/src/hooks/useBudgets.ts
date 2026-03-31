import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Budget } from "@dompetaing/shared";

// ── Types ──
export interface SubBreakdown {
  sub_category_id: string | null;
  sub_category_name: string;
  spent: number;
  transaction_count: number;
  percentage: number;
}

export interface BudgetRecentTransaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  sub_category: { id: string; name: string } | null;
  account: { id: string; name: string; type: string; icon: string; color: string };
}

export interface BudgetDetail extends Budget {
  sub_breakdown: SubBreakdown[];
  recent_transactions: BudgetRecentTransaction[];
}

export interface BudgetListResponse {
  total_budget: number;
  total_spent: number;
  percentage: number;
  month: number;
  year: number;
  budgets: Budget[];
}

export interface CreateBudgetInput {
  category_id: string;
  amount: number;
  period_type: "monthly";
  period_month: number;
  period_year: number;
}

// ── Query Keys ──
const BUDGETS_KEY = ["budgets"] as const;

// ── Fetch Hooks ──
export function useBudgets(month: number, year: number) {
  return useQuery<BudgetListResponse>({
    queryKey: [...BUDGETS_KEY, { month, year }],
    queryFn: () =>
      api.get<BudgetListResponse>(`/budgets?month=${month}&year=${year}`),
  });
}

export function useBudgetDetail(id: string) {
  return useQuery<BudgetDetail>({
    queryKey: [...BUDGETS_KEY, id],
    queryFn: () => api.get<BudgetDetail>(`/budgets/${id}`),
    enabled: !!id,
  });
}

// ── Mutation Hooks ──
export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetInput) => api.post<Budget>("/budgets", data),
    onSuccess: () => {
      // resetQueries clears the cache immediately so the component shows a
      // loading spinner instead of stale empty data while the refetch runs
      void queryClient.resetQueries({ queryKey: BUDGETS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.put<Budget>(`/budgets/${id}`, { amount }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/budgets/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useCopyBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      from_month: number;
      from_year: number;
      to_month: number;
      to_year: number;
    }) => api.post<{ copied: number }>("/budgets/copy-previous", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

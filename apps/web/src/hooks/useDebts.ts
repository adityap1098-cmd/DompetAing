import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Debt } from "@dompetaing/shared";

// ── Types ──
export interface DebtSummary {
  total_hutang: number;
  total_piutang: number;
  hutang_active_count: number;
  piutang_active_count: number;
  overdue_count: number;
}

export interface DebtListResponse {
  summary: DebtSummary;
  debts: Debt[];
}

export interface CreateDebtInput {
  type: "hutang" | "piutang";
  person_name: string;
  amount: number;
  description?: string;
  borrow_date: string;
  due_date?: string;
  reminder_enabled?: boolean;
  auto_record?: boolean;
}

export interface PayDebtInput {
  auto_record: boolean;
  account_id?: string;
}

export interface PayDebtResponse {
  debt: Debt;
  transaction: {
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
  } | null;
}

export interface UnpayDebtResponse {
  debt: Debt;
  deleted_transaction_ids: string[];
}

// ── Query Keys ──
const DEBTS_KEY = ["debts"] as const;

// ── Fetch Hooks ──
export function useDebts(params?: {
  type?: "hutang" | "piutang";
  status?: "active" | "paid" | "all";
  sort?: string;
}) {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.status) query.set("status", params.status);
  if (params?.sort) query.set("sort", params.sort);
  const qs = query.toString();

  return useQuery<DebtListResponse>({
    queryKey: [...DEBTS_KEY, params],
    queryFn: () => api.get<DebtListResponse>(`/debts${qs ? `?${qs}` : ""}`),
  });
}

export function useDebt(id: string) {
  return useQuery<Debt>({
    queryKey: [...DEBTS_KEY, id],
    queryFn: () => api.get<Debt>(`/debts/${id}`),
    enabled: !!id,
  });
}

// ── Mutation Hooks ──
export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDebtInput) => api.post<Debt>("/debts", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: CreateDebtInput & { id: string }) =>
      api.put<Debt>(`/debts/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/debts/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
    },
  });
}

export function usePayDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: PayDebtInput & { id: string }) =>
      api.patch<PayDebtResponse>(`/debts/${id}/pay`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUnpayDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<UnpayDebtResponse>(`/debts/${id}/unpay`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

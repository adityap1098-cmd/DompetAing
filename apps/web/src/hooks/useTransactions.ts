import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Transaction, TransactionType } from "@dompetaing/shared";

// ── Types ──
export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  category_id?: string;
  sub_category_id?: string;
  account_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
}

export interface TransactionListResponse {
  items: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
  };
}

export interface TransactionEffects {
  transaction: Transaction;
  effects: {
    account_balance: number;
    to_account_balance?: number;
  };
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  category_id?: string;
  sub_category_id?: string;
  account_id: string;
  to_account_id?: string;
  description: string;
  notes?: string;
  date: string;
  debt_id?: string;
}

// ── Query Keys ──
const TRANSACTIONS_KEY = ["transactions"] as const;
const txnKey = (id: string) => ["transactions", id] as const;

function buildQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface TransactionTotalResponse {
  count: number;
  total_amount: number;
}

// ── Fetch Hooks ──
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionListResponse>({
    queryKey: [...TRANSACTIONS_KEY, filters],
    queryFn: () =>
      api.get<TransactionListResponse>(`/transactions${buildQueryString(filters)}`),
  });
}

export function useTransactionTotal(filters: Omit<TransactionFilters, "page" | "limit" | "sort">) {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");
  return useQuery<TransactionTotalResponse>({
    queryKey: [...TRANSACTIONS_KEY, "total", filters],
    queryFn: () =>
      api.get<TransactionTotalResponse>(
        `/transactions/search-total${buildQueryString(filters)}`
      ),
    enabled: hasFilters,
  });
}

export function useTransaction(id: string) {
  return useQuery<Transaction>({
    queryKey: txnKey(id),
    queryFn: () => api.get<Transaction>(`/transactions/${id}`),
    enabled: !!id,
  });
}

// ── Mutation Hooks ──
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation<TransactionEffects, Error, CreateTransactionInput>({
    mutationFn: (data) => api.post<TransactionEffects>("/transactions", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation<
    TransactionEffects,
    Error,
    { id: string } & Partial<CreateTransactionInput>
  >({
    mutationFn: ({ id, ...data }) =>
      api.put<TransactionEffects>(`/transactions/${id}`, data),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: txnKey(result.transaction.id) });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/transactions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

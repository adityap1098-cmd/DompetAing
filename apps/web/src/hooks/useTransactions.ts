import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, offlineMutate } from "@/lib/api";
import { offlineDb } from "@/lib/offline/db";
import { getOfflineTransactions } from "@/lib/offline/computed";
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

// ── Fetch Hooks (with offline fallback) ──
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionListResponse>({
    queryKey: [...TRANSACTIONS_KEY, filters],
    queryFn: async () => {
      try {
        return await api.get<TransactionListResponse>(
          `/transactions${buildQueryString(filters)}`
        );
      } catch (err) {
        // Offline fallback: serve from IndexedDB
        if (!navigator.onLine) {
          const items = await getOfflineTransactions(
            filters.limit || 50
          );
          return {
            items: items as unknown as Transaction[],
            meta: {
              total: items.length,
              page: 1,
              limit: filters.limit || 50,
              has_next: false,
            },
          };
        }
        throw err;
      }
    },
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

// ── Mutation Hooks (with offline queue support) ──
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation<TransactionEffects, Error, CreateTransactionInput>({
    mutationFn: async (data) => {
      if (!navigator.onLine) {
        // Queue for later sync + apply locally
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await offlineMutate({
          endpoint: "/transactions",
          method: "POST",
          payload: data as unknown as Record<string, unknown>,
          entity: "transaction",
          action: "create",
          tempId,
          localApply: async () => {
            await offlineDb.transactions.put({
              id: tempId,
              user_id: "",
              amount: data.amount,
              type: data.type,
              category_id: data.category_id || null,
              sub_category_id: data.sub_category_id || null,
              account_id: data.account_id,
              to_account_id: data.to_account_id || null,
              description: data.description,
              notes: data.notes || null,
              date: data.date,
              source: "manual",
              debt_id: data.debt_id || null,
              is_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              _offline: true,
            });
          },
        });

        return {
          transaction: {
            id: tempId,
            ...data,
            _offline: true,
          } as unknown as Transaction,
          effects: { account_balance: 0 },
        };
      }
      return api.post<TransactionEffects>("/transactions", data);
    },
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
    mutationFn: async ({ id, ...data }) => {
      if (!navigator.onLine) {
        await offlineMutate({
          endpoint: `/transactions/${id}`,
          method: "PUT",
          payload: data as unknown as Record<string, unknown>,
          entity: "transaction",
          action: "update",
          entityId: id,
          localApply: async () => {
            const existing = await offlineDb.transactions.get(id);
            if (existing) {
              await offlineDb.transactions.update(id, {
                ...data,
                updated_at: new Date().toISOString(),
                _offline: true,
              });
            }
          },
        });

        return {
          transaction: { id, ...data, _offline: true } as unknown as Transaction,
          effects: { account_balance: 0 },
        };
      }
      return api.put<TransactionEffects>(`/transactions/${id}`, data);
    },
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
    mutationFn: async (id) => {
      if (!navigator.onLine) {
        await offlineMutate({
          endpoint: `/transactions/${id}`,
          method: "DELETE",
          entity: "transaction",
          action: "delete",
          entityId: id,
          localApply: async () => {
            await offlineDb.transactions.delete(id);
          },
        });
        return;
      }
      return api.delete<void>(`/transactions/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

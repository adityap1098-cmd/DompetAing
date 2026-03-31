import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Account } from "@dompetaing/shared";

// ── Query Keys ──
const ACCOUNTS_KEY = ["accounts"] as const;
const accountKey = (id: string) => ["accounts", id] as const;

// ── Fetch Hooks ──
export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ACCOUNTS_KEY,
    queryFn: () => api.get<Account[]>("/accounts"),
  });
}

export function useAccount(id: string) {
  return useQuery<Account>({
    queryKey: accountKey(id),
    queryFn: () => api.get<Account>(`/accounts/${id}`),
    enabled: !!id,
  });
}

// ── Mutation Input Types ──
interface CreateAccountInput {
  name: string;
  type: "bank" | "ewallet" | "cash";
  bank_name?: string | null;
  initial_balance?: number;
  color?: string;
  icon?: string;
}

interface UpdateAccountInput {
  id: string;
  name?: string;
  type?: "bank" | "ewallet" | "cash";
  bank_name?: string | null;
  initial_balance?: number;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

interface ReorderAccountInput {
  id: string;
  sort_order: number;
}

// ── Mutation Hooks ──
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, CreateAccountInput>({
    mutationFn: (data) => api.post<Account>("/accounts", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, UpdateAccountInput>({
    mutationFn: ({ id, ...data }) => api.put<Account>(`/accounts/${id}`, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      void queryClient.invalidateQueries({ queryKey: accountKey(updated.id) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/accounts/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

export function useReorderAccount() {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, ReorderAccountInput>({
    mutationFn: ({ id, sort_order }) =>
      api.patch<Account>(`/accounts/${id}/reorder`, { sort_order }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

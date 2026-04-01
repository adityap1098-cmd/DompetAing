import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AdminStats {
  total_users: number;
  premium_users: number;
  trial_users: number;
  free_users: number;
  total_transactions: number;
  total_revenue: number;
  monthly_signups: Record<string, number>;
  recent_signups: AdminUser[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  effective_plan: string;
  plan: string;
  trial_end: string | null;
  premium_end: string | null;
  gmail_connected: boolean;
  transaction_count: number;
  account_count: number;
  created_at: string;
  subscription?: unknown;
}

interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });
}

export function useAdminUsers(params: { search?: string; status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status && params.status !== "all") qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));

  return useQuery<AdminUsersResponse>({
    queryKey: ["admin", "users", params],
    queryFn: () => api.get<AdminUsersResponse>(`/admin/users?${qs.toString()}`),
  });
}

export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => api.get(`/admin/users/${id}`),
    enabled: !!id,
  });
}

export function useGrantPremium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; duration: string }) =>
      api.post("/admin/grant-premium", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useRevokePremium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.post("/admin/revoke-premium", { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

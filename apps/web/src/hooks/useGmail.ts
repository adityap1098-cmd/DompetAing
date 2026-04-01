import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ──

export interface GmailSource {
  id: string;
  bank_name: string;
  sender_email: string;
  is_active: boolean;
  total_detected: number;
  created_at: string;
}

export interface MarketplaceSource {
  id: string;
  marketplace_name: string;
  sender_email: string;
  is_active: boolean;
  total_detected: number;
  created_at: string;
}

export interface GmailStatus {
  connected: boolean;
  email: string;
  emails_processed: number;
  transactions_detected: number;
  accuracy: number;
  pending_count: number;
  enriched_count: number;
  last_sync: string | null;
  auto_sync: boolean;
  sync_interval: number;
  review_before_save: boolean;
  auto_categorize: boolean;
  sources: GmailSource[];
  marketplace_sources: MarketplaceSource[];
}

export interface PendingReview {
  id: string;
  gmail_message_id: string;
  raw_subject: string;
  parsed_amount: number | null;
  parsed_merchant: string | null;
  parsed_date: string | null;
  parsed_type: "expense" | "income" | null;
  bank_name: string | null;
  status: "pending" | "approved" | "skipped";
  suggested_category: { id: string; name: string; icon: string; color: string } | null;
  suggested_account: { id: string; name: string; type: string; icon: string; color: string } | null;
  created_at: string;
}

export interface SyncResult {
  emails_processed: number;
  transactions_found: number;
  pending_review: number;
  enriched: number;
  banks_detected: { bank_name: string; sender_email: string; count: number }[];
  marketplaces_detected: { marketplace_name: string; sender_email: string; count: number }[];
  summary: string;
}

export interface ApprovePayload {
  amount: number;
  type: string;
  category_id?: string;
  sub_category_id?: string;
  account_id: string;
  description: string;
  date: string;
}

// ── Hooks ──

export function useGmailStatus() {
  return useQuery({
    queryKey: ["gmail", "status"],
    queryFn: () => api.get<GmailStatus>("/gmail/status"),
    staleTime: 30 * 1000,
  });
}

export function usePendingReviews() {
  return useQuery({
    queryKey: ["gmail", "pending"],
    queryFn: () => api.get<PendingReview[]>("/gmail/pending"),
  });
}

export function useGmailConnect() {
  return useMutation({
    mutationFn: () => api.post<{ url: string }>("/gmail/connect"),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function useGmailDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/gmail/disconnect"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useGmailSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<SyncResult>("/gmail/sync"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail"] });
    },
  });
}

export function useToggleSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/gmail/sources/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gmail", "status"] }),
  });
}

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApprovePayload }) =>
      api.patch(`/gmail/pending/${id}/approve`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail", "pending"] });
      qc.invalidateQueries({ queryKey: ["gmail", "status"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useSkipReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/gmail/pending/${id}/skip`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail", "pending"] });
      qc.invalidateQueries({ queryKey: ["gmail", "status"] });
    },
  });
}

export function useApproveAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ approved: number; skipped: number; total: number }>("/gmail/pending/approve-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateGmailSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: {
      gmail_auto_sync?: boolean;
      gmail_sync_interval?: number;
      gmail_auto_categorize?: boolean;
      gmail_review_before_save?: boolean;
    }) => api.patch("/gmail/settings", settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail", "status"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

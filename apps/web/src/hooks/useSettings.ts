import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UpdateProfilePayload {
  name?: string;
  avatar_url?: string;
}

interface UpdatePreferencesPayload {
  theme?: string;
  color_scheme?: string;
  hide_balance?: boolean;
  currency?: string;
  locale?: string;
}

interface UpdateNotificationsPayload {
  notif_budget_threshold?: number;
  notif_weekly_report?: boolean;
  notif_transaction?: boolean;
  notif_debt_reminder?: boolean;
  notif_push?: boolean;
}

interface SecurityPayload {
  action: "set_pin" | "remove_pin" | "verify_pin";
  pin?: string;
  current_pin?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfilePayload) => api.put("/settings/profile", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferencesPayload) => api.put("/settings/preferences", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useUpdateNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateNotificationsPayload) => api.put("/settings/notifications", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useSecurityAction() {
  return useMutation({
    mutationFn: (data: SecurityPayload) => api.put("/settings/security", data),
  });
}

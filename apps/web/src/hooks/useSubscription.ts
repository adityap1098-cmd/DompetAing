import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Subscription, Feature } from "@dompetaing/shared";

// ── Subscription Status ──
export function useSubscription() {
  const { data, isLoading } = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: () => api.get<Subscription>("/subscription"),
    staleTime: 60 * 1000,
  });

  return {
    subscription: data,
    isLoading,
    plan: data?.effective_plan ?? "free",
    isTrialActive: data?.is_trial_active ?? false,
    trialDaysLeft: data?.trial_days_left ?? 0,
    isPremium:
      data?.effective_plan === "premium" || data?.effective_plan === "trial",
    canUse: (feature: Feature): boolean => {
      if (!data) return false;
      if (data.effective_plan !== "free") return true;
      return !data.locked_features.includes(feature);
    },
    limits: {
      maxAccounts: data?.limits.max_accounts ?? Infinity,
      maxBudgets: data?.limits.max_budgets ?? Infinity,
      currentAccounts: data?.limits.current_accounts ?? 0,
      currentBudgets: data?.limits.current_budgets ?? 0,
    },
  };
}

// ── Checkout ──
interface CheckoutResponse {
  snap_token: string;
  redirect_url: string;
  order_id: string;
  amount: number;
  plan_type: "monthly" | "yearly";
  period_start: string;
  period_end: string;
}

export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planType: "monthly" | "yearly") =>
      api.post<CheckoutResponse>("/subscription/checkout", { plan_type: planType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

// ── Payment History ──
interface Payment {
  id: string;
  midtrans_order_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

export function usePaymentHistory() {
  return useQuery<{ payments: Payment[] }>({
    queryKey: ["subscription", "payments"],
    queryFn: () => api.get<{ payments: Payment[] }>("/subscription/payments"),
  });
}

// ── Toggle Auto-Renew ──
export function useToggleAutoRenew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (autoRenew: boolean) =>
      api.patch<{ auto_renew: boolean }>("/subscription/auto-renew", { auto_renew: autoRenew }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

// ── Cancel Subscription ──
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ message: string; premium_end: string }>("/subscription/cancel"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

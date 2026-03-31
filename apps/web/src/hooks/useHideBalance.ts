import { useAuth } from "./useAuth";
import { formatRupiah } from "@/lib/format";

export function useHideBalance() {
  const { user } = useAuth();
  const hideBalance = user?.hide_balance ?? false;

  function formatAmount(
    amount: number,
    opts: { compact?: boolean } = {}
  ): string {
    if (hideBalance) return "Rp ****";
    return formatRupiah(amount, opts);
  }

  return { hideBalance, formatAmount };
}

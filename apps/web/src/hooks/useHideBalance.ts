import { useAuth } from "./useAuth";
import { formatRupiah } from "@/lib/format";

export function useHideBalance() {
  const { user } = useAuth();
  const hideBalance = user?.hide_balance ?? false;

  function formatAmount(
    amount: number,
    _opts: { compact?: boolean } = {}
  ): string {
    if (hideBalance) return "Rp ****";
    return formatRupiah(amount);
  }

  return { hideBalance, formatAmount };
}

import { useHideBalance } from "@/hooks/useHideBalance";

interface BalanceCardProps {
  netWorth: number;
  accountCount: number;
}

export function BalanceCard({ netWorth, accountCount }: BalanceCardProps) {
  const { formatAmount } = useHideBalance();
  return (
    <div className="mx-[17px] mb-3 bg-accent-500 dark:bg-accent-dark rounded-[18px] p-4 text-white relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-[100px] h-[100px] rounded-full bg-white/[0.07]" />
      <p className="text-[9px] font-semibold opacity-80 tracking-[0.04em] uppercase mb-1">
        Kekayaan Bersih
      </p>
      <p className="font-mono text-[26px] font-semibold tracking-[-0.02em] mb-1">
        {formatAmount(netWorth)}
      </p>
      <p className="text-[10px] opacity-70">
        {accountCount === 0 ? "Belum ada aset" : `Dari ${accountCount} aset`}
      </p>
    </div>
  );
}

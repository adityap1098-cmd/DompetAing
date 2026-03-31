import type { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import type { Feature } from "@dompetaing/shared";

interface PremiumGateProps {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PremiumGate({ feature, children, fallback }: PremiumGateProps) {
  const { canUse } = useSubscription();

  if (!canUse(feature)) {
    return <>{fallback ?? <DefaultUpgradePrompt feature={feature} />}</>;
  }

  return <>{children}</>;
}

interface DefaultUpgradePromptProps {
  feature: Feature;
}

const featureLabels: Record<Feature, string> = {
  gmail_sync: "Gmail Sync",
  export: "Export Data",
  unlimited_accounts: "Akun Tak Terbatas",
  unlimited_budgets: "Budget Tak Terbatas",
  full_reports: "Laporan Lengkap",
};

function DefaultUpgradePrompt({ feature }: DefaultUpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <span className="text-4xl mb-3">🔒</span>
      <h3 className="font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-1">
        Fitur Premium
      </h3>
      <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-4">
        {featureLabels[feature]} tersedia untuk pengguna Premium.
      </p>
      <a
        href="/subscription"
        className="inline-flex items-center gap-2 bg-accent-500 dark:bg-accent-dark text-white px-5 py-2.5 rounded-btn font-semibold text-sm hover:bg-accent-600 transition-colors"
      >
        ✨ Upgrade ke Premium
      </a>
    </div>
  );
}

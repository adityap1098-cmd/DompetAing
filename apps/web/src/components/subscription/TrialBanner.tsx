import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";

export function TrialBanner() {
  const { isTrialActive, trialDaysLeft, plan } = useSubscription();

  if (!isTrialActive || plan !== "trial") return null;

  const isUrgent = trialDaysLeft <= 5;

  return (
    <Link
      to="/subscription"
      className={[
        "mx-[17px] mt-3 mb-1 flex items-center justify-between",
        "px-3 py-2 rounded-[12px] border",
        isUrgent
          ? "bg-[#FDF0E8] dark:bg-[#2A1A10] border-[rgba(212,87,11,0.2)] dark:border-[rgba(232,115,64,0.2)]"
          : "bg-[#E8F4EE] dark:bg-[#162A1E] border-[rgba(46,125,90,0.15)] dark:border-[rgba(76,175,122,0.15)]",
      ].join(" ")}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-sm">✨</span>
        <span className={[
          "text-[11px] font-semibold",
          isUrgent
            ? "text-[#D4570B] dark:text-[#E87340]"
            : "text-[#2E7D5A] dark:text-[#4CAF7A]",
        ].join(" ")}>
          Trial Premium — sisa <strong>{trialDaysLeft} hari</strong>
        </span>
      </span>
      <span className={[
        "text-[10px] font-semibold",
        isUrgent
          ? "text-[#D4570B] dark:text-[#E87340]"
          : "text-[#2E7D5A] dark:text-[#4CAF7A]",
      ].join(" ")}>
        Upgrade →
      </span>
    </Link>
  );
}

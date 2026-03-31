import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {/* Icon box — 88×88, rounded-2xl, bgc2 background, matches mockup */}
      <div className="w-[88px] h-[88px] rounded-[22px] bg-[#F0EEE9] dark:bg-[#242522] flex items-center justify-center text-4xl mb-4 shrink-0">
        {icon}
      </div>
      <h3 className="text-[14px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] mb-5 max-w-[220px] leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

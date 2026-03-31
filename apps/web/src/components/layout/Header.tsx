import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  subtitle?: string;
}

export function Header({ title, left, right, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[rgba(247,246,243,0.95)] dark:bg-[rgba(17,18,16,0.95)] backdrop-blur-xl border-b border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.08)] safe-pt">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0">
          {left}
          <div className="min-w-0">
            <h1 className="font-extrabold text-base text-[#1A1917] dark:text-[#F0EEE9] truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
      </div>
    </header>
  );
}

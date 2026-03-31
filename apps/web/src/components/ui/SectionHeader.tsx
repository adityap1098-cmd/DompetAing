import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  linkLabel?: string;
  linkTo?: string;
  onAction?: () => void;
  actionLabel?: string;
  right?: ReactNode;
  className?: string;
}

/**
 * Consistent section header — matches mockup:
 * title: 12px font-bold #1A1917
 * link/action: 10px font-semibold accent color
 */
export function SectionHeader({
  title,
  linkLabel,
  linkTo,
  onAction,
  actionLabel,
  right,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={["flex items-center justify-between px-[17px] pt-1 pb-2", className].join(" ")}>
      <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">{title}</p>
      <div className="flex items-center gap-3">
        {right}
        {linkTo && linkLabel && (
          <Link
            to={linkTo}
            className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark"
          >
            {linkLabel}
          </Link>
        )}
        {onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

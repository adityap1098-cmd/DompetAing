import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-500 hover:bg-accent-600 text-white active:scale-95 dark:bg-accent-dark dark:hover:bg-accent-600",
  secondary:
    "bg-[#F0EEE9] hover:bg-[#E8E6E0] text-[#1A1917] dark:bg-[#242522] dark:hover:bg-[#2C2D2A] dark:text-[#F0EEE9]",
  ghost:
    "bg-transparent hover:bg-[#F0EEE9] text-[#6B6864] dark:hover:bg-[#242522] dark:text-[#9E9B96]",
  danger:
    "bg-[#C94A1C] hover:bg-[#B03D14] text-white active:scale-95 dark:bg-[#E87340] dark:hover:bg-[#D4632E]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-semibold rounded-btn transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

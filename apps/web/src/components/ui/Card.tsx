import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "card" | "md" | "lg";
}

const paddings = {
  none: "",
  sm: "p-3",
  card: "p-3.5",   // standard card padding — matches mockup 13-14px
  md: "p-4",
  lg: "p-5",
};

export function Card({ children, padding = "card", className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        "bg-white dark:bg-[#1C1D1A] rounded-card border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]",
        paddings[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

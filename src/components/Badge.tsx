import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  "bg-[var(--color-line)] text-[var(--color-ink)]",
  neutral:  "bg-gray-100 text-gray-700",
  success:  "bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20",
  warning:  "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20",
  danger:   "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/20",
  info:     "bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/20",
  gold:     "bg-[var(--color-gold-light)] text-[var(--color-gold-dark)] border border-[var(--color-gold)]/20",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({ variant = "default", size = "md", children, className = "", dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

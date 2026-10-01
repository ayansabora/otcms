type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  "bg-[var(--color-status-neutral)]/10 text-[var(--color-status-neutral)]",
  neutral:  "bg-[var(--color-status-neutral)]/10 text-[var(--color-status-neutral)]",
  success:  "bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]",
  warning:  "bg-[var(--color-status-pending)]/10 text-[var(--color-status-pending)]",
  danger:   "bg-[var(--color-status-danger)]/10  text-[var(--color-status-danger)]",
  info:     "bg-[var(--color-status-active)]/10  text-[var(--color-status-active)]",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

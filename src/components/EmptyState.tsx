import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  culturalPattern?: boolean;
}

export function EmptyState({ icon, title, description, action, culturalPattern = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 px-6 text-center relative ${culturalPattern ? "gadaa-pattern" : ""}`}>
      {icon && (
        <div className="mb-5 text-[var(--color-muted)] opacity-40 [&>svg]:w-16 [&>svg]:h-16">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-[var(--color-ink)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-muted)] max-w-md leading-relaxed mb-5">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

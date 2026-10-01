import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "📋", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-4xl mb-4 opacity-40">{icon}</span>
      <p className="font-medium text-[var(--color-ink)] mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-muted)] max-w-sm mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

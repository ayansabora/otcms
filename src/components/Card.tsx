import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white border border-[var(--color-line)] rounded-sm ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between px-5 py-4 border-b border-[var(--color-line)] ${className}`}>
      <div>
        <h2 className="font-medium text-sm text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

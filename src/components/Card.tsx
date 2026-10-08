import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md shadow-[var(--shadow-card)] ${
        hover ? "transition-all hover:shadow-md hover:border-[var(--color-line-strong)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, icon, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between px-6 py-4 border-b border-[var(--color-line)] ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <div className="shrink-0 text-[var(--color-primary)] [&>svg]:w-5 [&>svg]:h-5 mt-0.5">{icon}</div>}
        <div>
          <h2 className="font-semibold text-base text-[var(--color-ink)] leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--color-muted)] mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function CardBody({ children, className = "", noPadding = false }: CardBodyProps) {
  return <div className={`${noPadding ? "" : "px-6 py-4"} ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-[var(--color-line)] bg-[var(--color-bg)] rounded-b-md ${className}`}>
      {children}
    </div>
  );
}

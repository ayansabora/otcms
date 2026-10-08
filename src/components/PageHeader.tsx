import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: Breadcrumb[];
  className?: string;
}

export function PageHeader({ title, subtitle, actions, breadcrumb, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-6 ${className}`}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-[var(--color-muted)] mb-1.5" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-[var(--color-faint)]" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-[var(--color-primary)] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--color-ink)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-2xl text-[var(--color-ink)] leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-muted)] mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 ml-4 shrink-0 mt-1">{actions}</div>}
    </div>
  );
}

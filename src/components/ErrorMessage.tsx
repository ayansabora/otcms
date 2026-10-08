import { AlertCircle, Info, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = "" }: ErrorMessageProps) {
  return (
    <div className={`rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--color-danger)]">{message}</p>
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={onRetry} className="shrink-0 text-[var(--color-danger)]">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = "Something went wrong. We couldn't load this information.", onRetry }: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-[var(--color-danger-bg)] flex items-center justify-center mb-5">
        <AlertCircle className="w-8 h-8 text-[var(--color-danger)]" />
      </div>
      <h3 className="font-display text-xl text-[var(--color-ink)] mb-2">Something went wrong</h3>
      <p className="text-sm text-[var(--color-muted)] max-w-sm leading-relaxed mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" leftIcon={<RefreshCw size={15} />} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertMessageProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
}

const ALERT_CONFIG: Record<AlertVariant, { icon: React.ElementType; cls: string }> = {
  info:    { icon: Info,          cls: "border-[var(--color-info)]/30 bg-[var(--color-info-bg)] text-[var(--color-info)]" },
  success: { icon: CheckCircle,   cls: "border-[var(--color-success)]/30 bg-[var(--color-success-bg)] text-[var(--color-success)]" },
  warning: { icon: AlertTriangle, cls: "border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  danger:  { icon: AlertCircle,   cls: "border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
};

export function AlertMessage({ variant = "info", message, className = "" }: AlertMessageProps) {
  const { icon: Icon, cls } = ALERT_CONFIG[variant];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm font-medium ${cls} ${className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

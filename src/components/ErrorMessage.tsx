interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = "" }: ErrorMessageProps) {
  return (
    <div
      className={`rounded-sm border border-[var(--color-status-danger)]/30 bg-[var(--color-status-danger)]/5 px-4 py-3 ${className}`}
    >
      <p className="text-sm text-[var(--color-status-danger)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-[var(--color-status-danger)] underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function AlertMessage({
  variant = "info",
  message,
  className = "",
}: {
  variant?: "info" | "success" | "warning" | "danger";
  message: string;
  className?: string;
}) {
  const styles = {
    info:    "border-[var(--color-status-active)]/30 bg-[var(--color-status-active)]/5 text-[var(--color-status-active)]",
    success: "border-[var(--color-status-success)]/30 bg-[var(--color-status-success)]/5 text-[var(--color-status-success)]",
    warning: "border-[var(--color-status-pending)]/30 bg-[var(--color-status-pending)]/5 text-[var(--color-status-pending)]",
    danger:  "border-[var(--color-status-danger)]/30 bg-[var(--color-status-danger)]/5 text-[var(--color-status-danger)]",
  };
  return (
    <div className={`rounded-sm border px-4 py-3 text-sm ${styles[variant]} ${className}`}>
      {message}
    </div>
  );
}

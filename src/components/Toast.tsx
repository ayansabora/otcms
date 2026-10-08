import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: "border-[var(--color-success)]/30 bg-[var(--color-success-bg)] text-[var(--color-success)]",
  error:   "border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  info:    "border-[var(--color-info)]/30 bg-[var(--color-info-bg)] text-[var(--color-info)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const ctx: ToastContextValue = {
    toast: add,
    success: (m) => add(m, "success"),
    error:   (m) => add(m, "error"),
    warning: (m) => add(m, "warning"),
    info:    (m) => add(m, "info"),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border shadow-lg text-sm font-medium animate-slide-down ${STYLES[t.variant]}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

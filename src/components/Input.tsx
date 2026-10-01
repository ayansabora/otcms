import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputBase =
  "w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] bg-white disabled:bg-[var(--color-paper)] disabled:text-[var(--color-muted)]";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)] mb-1">
          {label}
          {props.required && <span className="text-[var(--color-status-danger)] ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`${inputBase} ${error ? "border-[var(--color-status-danger)]" : ""}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-[var(--color-status-danger)]">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, id, children, className = "", ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)] mb-1">
          {label}
          {props.required && <span className="text-[var(--color-status-danger)] ml-0.5">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`${inputBase} ${error ? "border-[var(--color-status-danger)]" : ""}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-[var(--color-status-danger)]">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextArea({ label, error, hint, id, className = "", ...props }: TextAreaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)] mb-1">
          {label}
          {props.required && <span className="text-[var(--color-status-danger)] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`${inputBase} resize-y ${error ? "border-[var(--color-status-danger)]" : ""}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-[var(--color-status-danger)]">{error}</p>}
    </div>
  );
}

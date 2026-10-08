import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const inputBase =
  "w-full rounded-md border border-[var(--color-line)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] bg-[var(--color-surface)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:bg-[var(--color-bg)] disabled:text-[var(--color-muted)] disabled:cursor-not-allowed";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({ label, error, hint, id, className = "", leftIcon, rightIcon, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {label}
          {props.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] [&>svg]:w-4 [&>svg]:h-4 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`${inputBase} ${error ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/10" : ""} ${leftIcon ? "pl-9" : ""} ${rightIcon ? "pr-9" : ""}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] [&>svg]:w-4 [&>svg]:h-4 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-[var(--color-danger)] flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 9.75h-1.5v-1.5h1.5v1.5zm0-3h-1.5V4.25h1.5v3.5z"/></svg>
        {error}
      </p>}
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
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {label}
          {props.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`${inputBase} cursor-pointer ${error ? "border-[var(--color-danger)]" : ""}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{error}</p>}
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
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {label}
          {props.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`${inputBase} resize-y min-h-[100px] ${error ? "border-[var(--color-danger)]" : ""}`}
        {...props}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

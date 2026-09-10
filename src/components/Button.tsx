import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)]",
    secondary: "bg-white text-[var(--color-ink)] border border-[var(--color-line)] hover:bg-[var(--color-paper)]",
    danger: "bg-[var(--color-status-danger)] text-white hover:opacity-90",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

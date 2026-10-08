import type { ReactNode } from "react";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };

export function LoadingSpinner({ message = "Loading…", className = "", size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center gap-2.5 text-sm text-[var(--color-muted)] ${className}`}>
      <svg
        className={`animate-spin shrink-0 ${SIZES[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {message && <span>{message}</span>}
    </div>
  );
}

export function PageLoading({ message = "Loading page…" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-24 animate-fade-in">
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
}

/** Skeleton components for building loading states */
interface SkeletonProps { className?: string; }

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton h-4 w-full ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? "w-3/4" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonCard({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md p-6 space-y-4 animate-fade-in">
      {children ?? (
        <>
          <Skeleton className="h-6 w-2/3" />
          <SkeletonText lines={2} />
        </>
      )}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md overflow-hidden animate-fade-in">
      <div className="grid gap-px bg-[var(--color-line)]">
        {/* Header */}
        <div className="grid bg-[var(--color-bg)] px-5 py-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }, (_, i) => <Skeleton key={i} className="h-3 w-20" />)}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }, (_, rowIdx) => (
          <div key={rowIdx} className="grid bg-white px-5 py-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }, (_, colIdx) => <Skeleton key={colIdx} className="h-4" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

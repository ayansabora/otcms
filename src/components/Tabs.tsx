import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-0 border-b border-[var(--color-line)] mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors
              ${isActive
                ? "border-[var(--color-forest)] text-[var(--color-forest)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-line)]"
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                  isActive
                    ? "bg-[var(--color-forest)] text-white"
                    : "bg-[var(--color-line)] text-[var(--color-muted)]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  active: string;
  children: ReactNode;
}

export function TabPanel({ id, active, children }: TabPanelProps) {
  if (id !== active) return null;
  return <div>{children}</div>;
}

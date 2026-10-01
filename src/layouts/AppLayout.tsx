import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { notificationsApi } from "../api/notifications";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  permission?: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app",                label: "Dashboard",        icon: "⊞",  end: true },
  // Court operations
  { to: "/app/cases",          label: "Cases",            icon: "⚖",  group: "Court" },
  { to: "/app/hearings",       label: "Hearings",         icon: "📅",  group: "Court", permission: "case:view_all" },
  { to: "/app/decisions",      label: "Decisions",        icon: "📜",  group: "Court", permission: "decision:record" },
  // Community
  { to: "/app/members",        label: "Community Members", icon: "👥",  group: "Community", permission: "member:view" },
  // Documents
  { to: "/app/documents",      label: "Documents",        icon: "📁",  group: "Documents", permission: "document:read" },
  // Administration
  { to: "/app/reports",        label: "Reports",          icon: "📊",  group: "Administration", permission: "report:generate" },
  { to: "/app/users",          label: "Users",            icon: "🔑",  group: "Administration", permission: "user:manage" },
  { to: "/app/audit-logs",     label: "Audit Log",        icon: "🔍",  group: "Administration", permission: "audit:read" },
];

const NAV_GROUPS = ["", "Court", "Community", "Documents", "Administration"] as const;

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.list({ pageSize: 1, unreadOnly: true }),
    refetchInterval: 60_000,
  });
  const count = data?.total ?? 0;

  return (
    <Link
      to="/app/notifications"
      className="relative flex items-center justify-center w-8 h-8 rounded-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-status-danger)] text-white text-[10px] font-bold leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function NavSection({ group, items, onClose }: { group: string; items: NavItem[]; onClose?: () => void }) {
  return (
    <div className="mb-2">
      {group && (
        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {group}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-white/10 text-white font-medium"
                : "text-white/75 hover:bg-white/5 hover:text-white"
            }`
          }
        >
          <span className="text-base leading-none opacity-80">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || user?.permissions.includes(item.permission),
  );

  const itemsByGroup = NAV_GROUPS.reduce<Record<string, NavItem[]>>((acc, group) => {
    acc[group] = visibleItems.filter((item) => (item.group ?? "") === group);
    return acc;
  }, {});

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-[var(--color-gold)] flex items-center justify-center shrink-0">
            <span className="text-[var(--color-forest)] text-xs font-bold">⚖</span>
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight text-white">OTCMS</p>
            <p className="text-[10px] text-white/50 leading-tight">Bale Robe Traditional Court</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {NAV_GROUPS.map((group) =>
          itemsByGroup[group]?.length > 0 ? (
            <NavSection key={group} group={group} items={itemsByGroup[group]} onClose={onClose} />
          ) : null,
        )}
      </nav>

      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs text-white/50 truncate">{user?.fullName || user?.email}</p>
        <p className="text-[11px] text-white/35 mt-0.5">{user?.roles.join(", ")}</p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-paper)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-[var(--color-forest)] text-white flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 h-full bg-[var(--color-forest)] text-white flex flex-col z-50">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-56">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-line)] bg-white px-4 py-3 h-14">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-sm text-[var(--color-muted)] hover:bg-[var(--color-paper)]"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="hidden lg:block" />

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            <div className="h-5 w-px bg-[var(--color-line)] mx-1" />

            {/* User info */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <span className="truncate max-w-[160px]">{user?.fullName || user?.email}</span>
            </div>

            <Button variant="secondary" onClick={() => void logout()} className="text-xs px-3 py-1.5">
              Sign out
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

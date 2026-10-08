import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Scale, Calendar, ScrollText, Users, FolderOpen,
  BarChart3, ShieldCheck, ClipboardList, Bell, Menu, X, LogOut,
  ChevronDown, User, KeyRound, Settings,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { notificationsApi } from "../api/notifications";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  permission?: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app",           label: "Dashboard",        icon: <LayoutDashboard size={16} />, end: true },
  { to: "/app/cases",     label: "Cases",            icon: <Scale size={16} />,           group: "Case Management" },
  { to: "/app/hearings",  label: "Hearings",         icon: <Calendar size={16} />,        group: "Case Management", permission: "case:view_all" },
  { to: "/app/decisions", label: "Decisions",        icon: <ScrollText size={16} />,      group: "Case Management", permission: "decision:record" },
  { to: "/app/members",   label: "Community Members",icon: <Users size={16} />,           group: "Community",       permission: "member:view" },
  { to: "/app/documents", label: "Documents",        icon: <FolderOpen size={16} />,      group: "Documents",       permission: "document:read" },
  { to: "/app/reports",   label: "Reports",          icon: <BarChart3 size={16} />,       group: "System",          permission: "report:generate" },
  { to: "/app/users",     label: "Users",            icon: <ShieldCheck size={16} />,     group: "System",          permission: "user:manage" },
  { to: "/app/audit-logs",label: "Audit Log",        icon: <ClipboardList size={16} />,   group: "System",          permission: "audit:read" },
];

const NAV_GROUPS = ["", "Case Management", "Community", "Documents", "System"] as const;

/* ── Notification Bell ─────────────────────────────────────────────────────── */
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
      className="relative flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors"
      aria-label={`Notifications${count > 0 ? ` — ${count} unread` : ""}`}
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

/* ── User Profile Dropdown ──────────────────────────────────────────────────── */
function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = user?.fullName
    ? user.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--color-bg)] transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-[var(--color-ink)] leading-tight truncate max-w-[120px]">
            {user?.fullName || user?.email}
          </p>
          <p className="text-[11px] text-[var(--color-muted)] leading-tight">{user?.roles[0] ?? ""}</p>
        </div>
        <ChevronDown size={14} className="text-[var(--color-muted)] hidden md:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl shadow-[var(--shadow-modal)] z-50 animate-slide-down overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-[var(--color-line)] bg-[var(--color-bg)]">
            <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{user?.fullName}</p>
            <p className="text-xs text-[var(--color-muted)] truncate">{user?.email}</p>
            <p className="text-xs text-[var(--color-primary)] font-medium mt-1">{user?.roles.join(", ")}</p>
          </div>
          {/* Actions */}
          <div className="py-1.5">
            <DropdownItem icon={<User size={15} />} label="Profile" to="/app/settings" onClick={() => setOpen(false)} />
            <DropdownItem icon={<KeyRound size={15} />} label="Change Password" to="/app/settings/password" onClick={() => setOpen(false)} />
            <DropdownItem icon={<Settings size={15} />} label="Settings" to="/app/settings" onClick={() => setOpen(false)} />
          </div>
          <div className="border-t border-[var(--color-line)] py-1.5">
            <button
              onClick={() => { setOpen(false); void logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, to, onClick }: { icon: React.ReactNode; label: string; to: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors"
    >
      <span className="text-[var(--color-muted)]">{icon}</span>
      {label}
    </Link>
  );
}

/* ── Sidebar Nav Section ────────────────────────────────────────────────────── */
function NavSection({ group, items, onClose }: { group: string; items: NavItem[]; onClose?: () => void }) {
  return (
    <div className="mb-1">
      {group && (
        <p className="px-4 pt-5 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/35 select-none">
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
            `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? "bg-white/15 text-white font-semibold shadow-sm"
                : "text-white/65 hover:bg-white/8 hover:text-white/90"
            }`
          }
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

/* ── OTCMS Logo Mark ────────────────────────────────────────────────────────── */
function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      {/* Gadaa-inspired diamond icon */}
      <div className="relative w-9 h-9 shrink-0">
        <div className="absolute inset-0 bg-[var(--color-gold)] rotate-45 rounded-sm opacity-90" />
        <div className="absolute inset-1.5 bg-[var(--color-primary-dark)] rotate-45 rounded-sm" />
        <Scale size={14} className="absolute inset-0 m-auto text-[var(--color-gold)] z-10" />
      </div>
      <div>
        <p className="font-display text-sm font-bold leading-tight text-white tracking-wide">OTCMS</p>
        <p className="text-[9px] text-white/45 leading-tight tracking-wide uppercase">Oromo Traditional Court</p>
      </div>
    </div>
  );
}

/* ── Main Layout ────────────────────────────────────────────────────────────── */
export function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || user?.permissions.includes(item.permission),
  );

  const itemsByGroup = NAV_GROUPS.reduce<Record<string, NavItem[]>>((acc, group) => {
    acc[group] = visibleItems.filter((item) => (item.group ?? "") === group);
    return acc;
  }, {});

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo area with subtle gadaa pattern */}
      <div className="relative px-4 py-5 border-b border-white/10 overflow-hidden shrink-0">
        <div className="absolute inset-0 gadaa-pattern opacity-30" />
        <div className="relative flex items-center justify-between">
          <LogoMark />
          {onClose && (
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors lg:hidden p-1">
              <X size={18} />
            </button>
          )}
        </div>
        <p className="relative text-[10px] text-white/35 mt-3 leading-relaxed tracking-wide">
          Justice · Community · Reconciliation
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) =>
          itemsByGroup[group]?.length > 0 ? (
            <NavSection key={group} group={group} items={itemsByGroup[group]} onClose={onClose} />
          ) : null,
        )}
      </nav>

      {/* Bottom user info */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.fullName?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/80 font-medium truncate">{user?.fullName || user?.email}</p>
            <p className="text-[10px] text-white/40 truncate">{user?.roles[0] ?? ""}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-[var(--color-primary-dark)] text-white flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <aside className="relative w-64 h-full bg-[var(--color-primary-dark)] text-white flex flex-col z-50 shadow-2xl">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 h-14 shadow-[var(--shadow-sm)]">
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-1">
            <NotificationBell />
            <div className="w-px h-6 bg-[var(--color-line)] mx-2" />
            <UserMenu />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6 min-w-0 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

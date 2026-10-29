import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Scale, Calendar, ScrollText, Users, FolderOpen,
  BarChart3, ShieldCheck, Bell, Menu, X, LogOut,
  ChevronDown, ChevronRight, User, KeyRound, Settings, FilePlus,
  FileSearch, FileEdit, Upload, Eye, UserCog, History,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { notificationsApi } from "../api/notifications";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
interface NavLeaf {
  kind: "leaf";
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  permission?: string;
}

interface NavGroup {
  kind: "group";
  id: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;  // if set, whole group hidden unless user has it
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

/* ─────────────────────────────────────────────────────────────────────────────
   Navigation definition
   Rules:
   • A "leaf" with no permission is always visible.
   • A "leaf" with a permission is shown only if the user has it.
   • A "group" is shown only if ≥1 child is visible.
   • If a group has only 1 child after filtering, it stays as a group
     (keeps the UI consistent rather than randomly flattening).
───────────────────────────────────────────────────────────────────────────── */
const NAV_CONFIG: NavEntry[] = [
  // ── Always visible ───────────────────────────────────────────────────────
  {
    kind: "leaf",
    to: "/app",
    label: "Dashboard",
    icon: <LayoutDashboard size={16} />,
    end: true,
  },

  // ── Case Management ───────────────────────────────────────────────────────
  {
    kind: "group",
    id: "cases",
    label: "Case Management",
    icon: <Scale size={16} />,
    children: [
      {
        kind: "leaf",
        to: "/app/cases/new",
        label: "Register Case",
        icon: <FilePlus size={15} />,
        permission: "case:create",
      },
      {
        kind: "leaf",
        to: "/app/cases",
        label: "View All Cases",
        icon: <FileSearch size={15} />,
        permission: "case:view_all",
      },
      {
        kind: "leaf",
        to: "/app/cases",
        label: "Assigned Cases",
        icon: <FileEdit size={15} />,
        permission: "case:view_assigned",
      },
    ],
  },

  // ── Hearings ──────────────────────────────────────────────────────────────
  {
    kind: "group",
    id: "hearings",
    label: "Hearings",
    icon: <Calendar size={16} />,
    children: [
      {
        kind: "leaf",
        to: "/app/hearings/schedule",
        label: "Schedule Hearing",
        icon: <FilePlus size={15} />,
        permission: "hearing:manage",
      },
      {
        kind: "leaf",
        to: "/app/hearings",
        label: "View Hearings",
        icon: <Eye size={15} />,
        permission: "case:view_all",
      },
    ],
  },

  // ── Decisions ─────────────────────────────────────────────────────────────
  {
    kind: "group",
    id: "decisions",
    label: "Decisions",
    icon: <ScrollText size={16} />,
    children: [
      {
        kind: "leaf",
        to: "/app/decisions/record",
        label: "Record Decision",
        icon: <FilePlus size={15} />,
        permission: "decision:record",
      },
      {
        kind: "leaf",
        to: "/app/decisions",
        label: "View Decisions",
        icon: <Eye size={15} />,
        permission: "decision:record",
      },
    ],
  },

  // ── Community ─────────────────────────────────────────────────────────────
  {
    kind: "group",
    id: "community",
    label: "Community",
    icon: <Users size={16} />,
    children: [
      {
        kind: "leaf",
        to: "/app/members/new",
        label: "Register Member",
        icon: <FilePlus size={15} />,
        permission: "member:register",
      },
      {
        kind: "leaf",
        to: "/app/members",
        label: "View Members",
        icon: <Eye size={15} />,
        permission: "member:view",
      },
    ],
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  {
    kind: "group",
    id: "documents",
    label: "Documents",
    icon: <FolderOpen size={16} />,
    children: [
      {
        kind: "leaf",
        to: "/app/documents",
        label: "Upload Document",
        icon: <Upload size={15} />,
        permission: "document:upload",
      },
      {
        kind: "leaf",
        to: "/app/documents",
        label: "View Documents",
        icon: <Eye size={15} />,
        permission: "document:read",
      },
    ],
  },

  // ── Notifications — visible to all ───────────────────────────────────────
  {
    kind: "leaf",
    to: "/app/notifications",
    label: "Notifications",
    icon: <Bell size={16} />,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    kind: "leaf",
    to: "/app/reports",
    label: "Reports",
    icon: <BarChart3 size={16} />,
    permission: "report:generate",
  },

  // ── Administration ────────────────────────────────────────────────────────
  {
    kind: "group",
    id: "admin",
    label: "Administration",
    icon: <ShieldCheck size={16} />,
    children: [
      {
        kind: "leaf",
        to: "/app/users",
        label: "User Management",
        icon: <UserCog size={15} />,
        permission: "user:manage",
      },
      {
        kind: "leaf",
        to: "/app/role-management",
        label: "Role Management",
        icon: <ShieldCheck size={15} />,
        permission: "role:manage",
      },
      {
        kind: "leaf",
        to: "/app/audit-logs",
        label: "Audit Logs",
        icon: <History size={15} />,
        permission: "audit:read",
      },
      {
        kind: "leaf",
        to: "/app/settings",
        label: "System Settings",
        icon: <Settings size={15} />,
        permission: "user:manage",
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Permission filtering helpers
───────────────────────────────────────────────────────────────────────────── */
function filterEntries(entries: NavEntry[], permissions: string[]): NavEntry[] {
  const result: NavEntry[] = [];
  for (const entry of entries) {
    if (entry.kind === "leaf") {
      if (!entry.permission || permissions.includes(entry.permission)) {
        result.push(entry);
      }
    } else {
      // Deduplicate children by `to` + `permission` combo, then filter
      const seen = new Set<string>();
      const visibleChildren = entry.children.filter((child) => {
        const key = `${child.to}__${child.permission ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return !child.permission || permissions.includes(child.permission);
      });
      if (visibleChildren.length > 0) {
        result.push({ ...entry, children: visibleChildren });
      }
    }
  }
  return result;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Notification Bell
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   User Profile Dropdown (unchanged from original)
───────────────────────────────────────────────────────────────────────────── */
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
          <div className="px-4 py-3.5 border-b border-[var(--color-line)] bg-[var(--color-bg)]">
            <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{user?.fullName}</p>
            <p className="text-xs text-[var(--color-muted)] truncate">{user?.email}</p>
            <p className="text-xs text-[var(--color-primary)] font-medium mt-1">{user?.roles.join(", ")}</p>
          </div>
          <div className="py-1.5">
            <ProfileLink icon={<User size={15} />}    label="Profile"         to="/app/settings"          onClose={() => setOpen(false)} />
            <ProfileLink icon={<KeyRound size={15} />} label="Change Password" to="/app/settings/password" onClose={() => setOpen(false)} />
            <ProfileLink icon={<Settings size={15} />} label="Settings"        to="/app/settings"          onClose={() => setOpen(false)} />
          </div>
          <div className="border-t border-[var(--color-line)] py-1.5">
            <button
              onClick={() => { setOpen(false); void logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
            >
              <LogOut size={15} />Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileLink({ icon, label, to, onClose }: { icon: React.ReactNode; label: string; to: string; onClose?: () => void }) {
  return (
    <Link to={to} onClick={onClose} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors">
      <span className="text-[var(--color-muted)]">{icon}</span>
      {label}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Collapsible NavGroup
───────────────────────────────────────────────────────────────────────────── */
interface NavGroupItemProps {
  group: NavGroup & { children: NavLeaf[] };
  defaultOpen: boolean;
  onClose?: () => void;
}

function NavGroupItem({ group, defaultOpen, onClose }: NavGroupItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const location = useLocation();

  // Re-open automatically when navigating to a child route
  useEffect(() => {
    const childActive = group.children.some((c) => {
      if (c.end) return location.pathname === c.to;
      return location.pathname.startsWith(c.to);
    });
    if (childActive) setOpen(true);
  }, [location.pathname, group.children]);

  // Is any child the current active route?
  const groupActive = group.children.some((c) => {
    if (c.end) return location.pathname === c.to;
    return location.pathname.startsWith(c.to);
  });

  return (
    <div className="mx-2 mb-0.5">
      {/* Group header button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
          ${groupActive
            ? "bg-white/12 text-white"
            : "text-white/65 hover:bg-white/8 hover:text-white/90"
          }
        `}
        aria-expanded={open}
      >
        <span className="shrink-0">{group.icon}</span>
        <span className="flex-1 text-left truncate font-medium">{group.label}</span>
        <ChevronRight
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""} ${groupActive ? "text-white/80" : "text-white/35"}`}
        />
      </button>

      {/* Children — animated expand/collapse via max-height */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? `${group.children.length * 44}px` : "0px" }}
      >
        <div className="pt-0.5 pb-1">
          {group.children.map((child) => (
            <NavLink
              key={`${child.to}-${child.label}`}
              to={child.to}
              end={child.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 ml-3 mr-0 pl-6 pr-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative
                before:absolute before:left-3 before:top-1/2 before:-translate-y-1/2 before:w-px before:h-4 before:rounded-full before:bg-white/20
                ${isActive
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/55 hover:bg-white/6 hover:text-white/85"
                }`
              }
            >
              <span className="shrink-0 opacity-75">{child.icon}</span>
              <span className="truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Logo Mark (unchanged)
───────────────────────────────────────────────────────────────────────────── */
function LogoMark() {
  return (
    <div className="flex items-center gap-3">
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

/* ─────────────────────────────────────────────────────────────────────────────
   Main Layout
───────────────────────────────────────────────────────────────────────────── */
export function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const permissions = user?.permissions ?? [];
  const visibleEntries = filterEntries(NAV_CONFIG, permissions);

  // Determine which groups should start open (any child matches current path)
  function isGroupDefaultOpen(group: NavGroup): boolean {
    return group.children.some((c) => {
      if (c.end) return location.pathname === c.to;
      return location.pathname.startsWith(c.to);
    });
  }

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
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
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        {visibleEntries.map((entry) => {
          if (entry.kind === "leaf") {
            return (
              <NavLink
                key={entry.to + entry.label}
                to={entry.to}
                end={entry.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-0.5 ${
                    isActive
                      ? "bg-white/15 text-white font-semibold shadow-sm"
                      : "text-white/65 hover:bg-white/8 hover:text-white/90"
                  }`
                }
              >
                <span className="shrink-0">{entry.icon}</span>
                <span className="truncate">{entry.label}</span>
              </NavLink>
            );
          }
          // Group
          return (
            <NavGroupItem
              key={entry.id}
              group={entry as NavGroup & { children: NavLeaf[] }}
              defaultOpen={isGroupDefaultOpen(entry)}
              onClose={onClose}
            />
          );
        })}
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
        <main className="flex-1 p-4 md:p-6 min-w-0 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

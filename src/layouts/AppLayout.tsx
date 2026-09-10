import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", end: true, permission: undefined },
  { to: "/app/cases", label: "Cases", permission: undefined },
  { to: "/app/members", label: "Community members", permission: "member:view" },
  { to: "/app/users", label: "Users", permission: "user:manage" },
  { to: "/app/audit-logs", label: "Audit logs", permission: "audit:read" },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  const visibleNav = NAV_ITEMS.filter((item) => !item.permission || user?.permissions.includes(item.permission));

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-[var(--color-forest)] text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="font-display text-lg leading-tight">OTCMS</p>
          <p className="text-xs text-white/60 mt-1">Bale Robe City Traditional Court</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-sm px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-white/10 text-white font-medium" : "text-white/75 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/60">
          {user?.roles.join(", ") || "—"}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper-raised)] px-6 py-3">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-muted)]">{user?.email}</span>
            <Button variant="secondary" onClick={() => logout()}>
              Log out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

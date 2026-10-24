import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, CheckCircle, Users } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { PageError, AlertMessage } from "../../components/ErrorMessage";
import { api } from "../../api/client";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Permission {
  id: string;
  code: string;
  description?: string | null;
}

interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string | null;
  permissions: { permission: Permission }[];
}

/* ── Permission matrix table ─────────────────────────────────────────────── */
// Role display names
const ROLE_LABELS: Record<string, string> = {
  ADMIN:            "System Admin",
  COURT_MANAGER:    "Court Manager",
  RECORD_OFFICER:   "Record Officer",
  COMMUNITY_MEMBER: "Community Member",
};

// Permission group labels for readability
const PERMISSION_GROUPS: { label: string; codes: string[] }[] = [
  {
    label: "User & Role Management",
    codes: ["user:manage", "role:manage"],
  },
  {
    label: "Audit & Reporting",
    codes: ["audit:read", "report:generate"],
  },
  {
    label: "Community Members",
    codes: ["member:register", "member:verify", "member:view"],
  },
  {
    label: "Cases",
    codes: [
      "case:create", "case:view_all", "case:view_assigned",
      "case:view_own", "case:update", "case:assign", "case:transition",
    ],
  },
  {
    label: "Hearings",
    codes: ["hearing:manage"],
  },
  {
    label: "Decisions",
    codes: ["decision:record", "decision:approve"],
  },
  {
    label: "Documents",
    codes: ["document:upload", "document:read"],
  },
];

export function PermissionsPage() {
  const { data: rolesData, isLoading, isError, refetch } = useQuery({
    queryKey: ["roles-with-permissions"],
    queryFn: () => api.get<{ roles: RoleWithPermissions[] }>("/roles"),
  });

  const roles = rolesData?.roles ?? [];

  // Build a set for quick lookup: roleId → Set of permission codes
  const rolePermSet = new Map<string, Set<string>>();
  for (const role of roles) {
    rolePermSet.set(role.name, new Set(role.permissions.map((rp) => rp.permission.code)));
  }

  if (isLoading) return <SkeletonTable rows={10} cols={5} />;
  if (isError)   return <PageError onRetry={() => refetch()} />;

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Roles & Permissions"
        subtitle="View which permissions each system role has. Role assignments are managed from User Management."
        breadcrumb={[{ label: "Admin" }, { label: "Roles & Permissions" }]}
      />

      <AlertMessage
        variant="info"
        message="Permissions are enforced server-side. This matrix is read-only — changes to role definitions require a backend update."
        className="mb-6"
      />

      {/* Permission matrix */}
      <Card className="mb-6">
        <CardHeader title="Permission Matrix" icon={<ShieldCheck />}
          subtitle="✓ = permitted   —  = not granted" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide w-64">
                  Permission
                </th>
                {roles.map((r) => (
                  <th key={r.id} className="px-4 py-3.5 text-center text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide whitespace-nowrap">
                    {ROLE_LABELS[r.name] ?? r.name.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <>
                  {/* Group header row */}
                  <tr key={`group-${group.label}`} className="bg-[var(--color-primary-subtle)]">
                    <td
                      colSpan={roles.length + 1}
                      className="px-5 py-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {/* Permission rows */}
                  {group.codes.map((code) => (
                    <tr key={code} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs text-[var(--color-ink)] font-semibold">{code}</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {describePermission(code)}
                        </p>
                      </td>
                      {roles.map((r) => {
                        const has = rolePermSet.get(r.name)?.has(code) ?? false;
                        return (
                          <td key={r.id} className="px-4 py-3 text-center">
                            {has
                              ? <CheckCircle size={18} className="text-[var(--color-success)] mx-auto" />
                              : <span className="text-[var(--color-faint)] text-lg font-light mx-auto block text-center">—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {roles.map((role) => {
          const permCount = role.permissions.length;
          const label = ROLE_LABELS[role.name] ?? role.name.replace(/_/g, " ");
          return (
            <Card key={role.id} hover>
              <CardBody>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
                    <Users size={18} className="text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-ink)] text-sm">{label}</p>
                    <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5">{role.name}</p>
                  </div>
                </div>
                <p className="text-2xl font-display font-bold text-[var(--color-primary)]">{permCount}</p>
                <p className="text-xs text-[var(--color-muted)]">permission{permCount !== 1 ? "s" : ""} granted</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Security note */}
      <div className="mt-6 border border-[var(--color-line)] rounded-xl px-5 py-4 bg-[var(--color-bg)] flex items-start gap-3">
        <ShieldCheck size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">
          Users cannot assign themselves additional roles or permissions.
          All permission checks are enforced by the backend on every API request,
          regardless of what the frontend shows.
          To assign a role to a user, go to{" "}
          <a href="/app/users" className="text-[var(--color-primary)] hover:underline font-medium">
            User Management
          </a>.
        </p>
      </div>
    </div>
  );
}

function describePermission(code: string): string {
  const MAP: Record<string, string> = {
    "user:manage":        "Create, update, activate/deactivate users",
    "role:manage":        "Manage roles and permissions",
    "audit:read":         "View audit logs",
    "report:generate":    "Generate system reports",
    "member:register":    "Register a community member",
    "member:verify":      "Verify a community member",
    "member:view":        "View community member records",
    "case:create":        "Register a new case",
    "case:view_all":      "View all cases",
    "case:view_assigned": "View cases assigned to self",
    "case:view_own":      "View own submitted cases",
    "case:update":        "Update case details",
    "case:assign":        "Assign/reassign a case to a panel",
    "case:transition":    "Move a case through workflow states",
    "hearing:manage":     "Schedule and manage hearings",
    "decision:record":    "Record a decision",
    "decision:approve":   "Approve/finalize a decision",
    "document:upload":    "Upload a document",
    "document:read":      "Download/view an authorized document",
  };
  return MAP[code] ?? code;
}

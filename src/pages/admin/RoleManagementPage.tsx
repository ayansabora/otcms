import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ShieldCheck, CheckCircle,
  ChevronDown, ChevronRight, Lock,
} from "lucide-react";
import { usersApi } from "../../api/users";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Modal, ConfirmModal } from "../../components/Modal";
import { AlertMessage } from "../../components/ErrorMessage";
import { SkeletonCard } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import type { Role } from "../../types/api";

/* ─── All 19 permission codes from rbacSeedData (source of truth) ────────── */
const PERMISSION_GROUPS: { label: string; codes: string[] }[] = [
  {
    label: "User & Role Management",
    codes: ["user:manage", "role:manage"],
  },
  {
    label: "Audit & Reports",
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

const ALL_CODES = PERMISSION_GROUPS.flatMap((g) => g.codes);

const PERMISSION_DESC: Record<string, string> = {
  "user:manage":        "Create, update, activate/deactivate users",
  "role:manage":        "Manage roles and permissions",
  "audit:read":         "View audit logs",
  "report:generate":    "Generate reports",
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

// System roles cannot have their permissions changed or be deleted
const SYSTEM_ROLES = ["ADMIN", "COURT_MANAGER", "RECORD_OFFICER", "COMMUNITY_MEMBER"];

/* ─── Permission picker ──────────────────────────────────────────────────── */
function PermissionPicker({
  selected,
  onChange,
  disabled = false,
}: {
  selected: Set<string>;
  onChange: (codes: Set<string>) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(PERMISSION_GROUPS.map((g) => g.label)),
  );

  function toggle(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  }

  function toggleGroup(codes: string[], allSelected: boolean) {
    const next = new Set(selected);
    if (allSelected) codes.forEach((c) => next.delete(c));
    else codes.forEach((c) => next.add(c));
    onChange(next);
  }

  function toggleExpand(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {PERMISSION_GROUPS.map((group) => {
        const allSelected = group.codes.every((c) => selected.has(c));
        const someSelected = group.codes.some((c) => selected.has(c));
        const isOpen = expanded.has(group.label);
        return (
          <div key={group.label} className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleExpand(group.label)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg)] hover:bg-[var(--color-line)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => toggleGroup(group.codes, allSelected)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                />
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  {group.label}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  ({group.codes.filter((c) => selected.has(c)).length}/{group.codes.length})
                </span>
              </div>
              {isOpen
                ? <ChevronDown size={15} className="text-[var(--color-muted)]" />
                : <ChevronRight size={15} className="text-[var(--color-muted)]" />
              }
            </button>

            {/* Permission rows */}
            {isOpen && (
              <div className="divide-y divide-[var(--color-line)]">
                {group.codes.map((code) => (
                  <label
                    key={code}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(code)}
                      onChange={() => toggle(code)}
                      className="mt-0.5 w-4 h-4 accent-[var(--color-primary)] cursor-pointer shrink-0"
                    />
                    <div>
                      <p className="font-mono text-xs font-semibold text-[var(--color-ink)]">{code}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">{PERMISSION_DESC[code] ?? code}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Role card ──────────────────────────────────────────────────────────── */
function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: Role;
  onEdit: (r: Role) => void;
  onDelete: (r: Role) => void;
}) {
  const isSystem = SYSTEM_ROLES.includes(role.name);
  const permCount = role.permissions?.length ?? 0;

  return (
    <Card hover className="flex flex-col">
      <CardBody className="flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="font-bold text-[var(--color-ink)] text-sm font-mono">{role.name}</p>
              {isSystem && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-muted)] mt-0.5">
                  <Lock size={9} /> System role
                </span>
              )}
            </div>
          </div>
          {!isSystem && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />} onClick={() => onEdit(role)}>Edit</Button>
              <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />}
                className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                onClick={() => onDelete(role)}>
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-muted)] mb-3 min-h-[32px]">
          {role.description || <span className="italic">No description</span>}
        </p>

        {/* Permission count */}
        <div className="flex items-center gap-1.5 mb-3">
          <CheckCircle size={13} className="text-[var(--color-success)]" />
          <span className="text-xs text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">{permCount}</span> permission{permCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Permission badges */}
        {role.permissions && role.permissions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {role.permissions.slice(0, 6).map((rp) => (
              <span key={rp.permission.code}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                {rp.permission.code}
              </span>
            ))}
            {role.permissions.length > 6 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-muted)]">
                +{role.permissions.length - 6} more
              </span>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export function RoleManagementPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  /* modals */
  const [createOpen, setCreateOpen]   = useState(false);
  const [editRole, setEditRole]       = useState<Role | null>(null);
  const [deleteRole, setDeleteRole]   = useState<Role | null>(null);

  /* create form */
  const [newName, setNewName]           = useState("");
  const [newDesc, setNewDesc]           = useState("");
  const [newPerms, setNewPerms]         = useState<Set<string>>(new Set());
  const [createError, setCreateError]   = useState<string | null>(null);

  /* edit form */
  const [editDesc, setEditDesc]         = useState("");
  const [editPerms, setEditPerms]       = useState<Set<string>>(new Set());
  const [editError, setEditError]       = useState<string | null>(null);

  /* ── Queries ──────────────────────────────────────────────────────────── */
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => usersApi.listRoles(),
  });

  const roles: Role[] = rolesData?.roles ?? [];

  /* ── Mutations ────────────────────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.createRole({
        name: newName.toUpperCase().replace(/\s+/g, "_"),
        description: newDesc || undefined,
        permissionCodes: Array.from(newPerms),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success(`Role "${newName.toUpperCase()}" created.`);
      setCreateOpen(false); resetCreateForm();
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "Failed to create role."),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      usersApi.updateRole(editRole!.id, {
        description: editDesc || undefined,
        permissionCodes: Array.from(editPerms),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role updated.");
      setEditRole(null); setEditError(null);
    },
    onError: (err) => setEditError(err instanceof ApiError ? err.message : "Failed to update role."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteRole(deleteRole!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success(`Role "${deleteRole?.name}" deleted.`);
      setDeleteRole(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete role.");
      setDeleteRole(null);
    },
  });

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function resetCreateForm() {
    setNewName(""); setNewDesc(""); setNewPerms(new Set()); setCreateError(null);
  }

  function openEdit(role: Role) {
    setEditDesc(role.description ?? "");
    setEditPerms(new Set(role.permissions?.map((rp) => rp.permission.code) ?? []));
    setEditError(null);
    setEditRole(role);
  }

  const isSystem = (r: Role) => SYSTEM_ROLES.includes(r.name);
  const customRoles = roles.filter((r) => !isSystem(r));
  const systemRoles = roles.filter((r) => isSystem(r));

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Role Management"
        subtitle="Create and manage roles. System roles are protected and cannot be deleted."
        breadcrumb={[{ label: "Administration" }, { label: "Role Management" }]}
        actions={
          <Button leftIcon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            Create Role
          </Button>
        }
      />

      <AlertMessage
        variant="info"
        message="System roles (ADMIN, COURT_MANAGER, RECORD_OFFICER, COMMUNITY_MEMBER) are protected. You can view their permissions but cannot modify or delete them."
        className="mb-6"
      />

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Custom roles */}
      {!isLoading && customRoles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-3">
            Custom Roles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {customRoles.map((r) => (
              <RoleCard key={r.id} role={r} onEdit={openEdit} onDelete={setDeleteRole} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && customRoles.length === 0 && (
        <div className="mb-8">
          <EmptyState
            icon={<ShieldCheck />}
            title="No custom roles yet"
            description="Create a custom role to assign unique permission sets beyond the four system roles."
            action={<Button leftIcon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Create Role</Button>}
          />
        </div>
      )}

      {/* System roles — read-only */}
      {!isLoading && systemRoles.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-3">
            System Roles (Read-Only)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {systemRoles.map((r) => (
              <RoleCard key={r.id} role={r} onEdit={() => {}} onDelete={() => {}} />
            ))}
          </div>
        </div>
      )}

      {/* ════════════ CREATE ROLE MODAL ════════════ */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetCreateForm(); }}
        title="Create New Role"
        description="Roles created here can be assigned to users via User Management."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              disabled={!newName.trim()}
              leftIcon={<Plus size={14} />}
              onClick={() => createMutation.mutate()}
            >
              Create Role
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Role Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
            required
            placeholder="e.g. FINANCE_OFFICER"
            hint="Uppercase letters, numbers and underscores only. Will be stored as-is."
          />
          <Input
            label="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Brief description of this role's responsibilities"
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)] mb-2">
              Permissions <span className="text-[var(--color-muted)] font-normal">({newPerms.size} of {ALL_CODES.length} selected)</span>
            </p>
            <PermissionPicker selected={newPerms} onChange={setNewPerms} />
          </div>
          {createError && <AlertMessage variant="danger" message={createError} />}
        </div>
      </Modal>

      {/* ════════════ EDIT ROLE MODAL ════════════ */}
      <Modal
        isOpen={!!editRole}
        onClose={() => { setEditRole(null); setEditError(null); }}
        title={`Edit Role: ${editRole?.name ?? ""}`}
        description="You can update the description and permissions for this custom role."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditRole(null); setEditError(null); }}>Cancel</Button>
            <Button
              loading={editMutation.isPending}
              leftIcon={<Pencil size={14} />}
              onClick={() => editMutation.mutate()}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Description (optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)] mb-2">
              Permissions <span className="text-[var(--color-muted)] font-normal">({editPerms.size} of {ALL_CODES.length} selected)</span>
            </p>
            {editRole && SYSTEM_ROLES.includes(editRole.name) ? (
              <AlertMessage
                variant="warning"
                message="System role permissions are managed through the seed file and cannot be changed here."
              />
            ) : (
              <PermissionPicker selected={editPerms} onChange={setEditPerms} />
            )}
          </div>
          {editError && <AlertMessage variant="danger" message={editError} />}
        </div>
      </Modal>

      {/* ════════════ DELETE CONFIRM ════════════ */}
      <ConfirmModal
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${deleteRole?.name}"? This cannot be undone. The role must have no users assigned.`}
        confirmLabel="Delete Role"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

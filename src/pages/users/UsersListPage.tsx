import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, ShieldCheck, ChevronLeft, ChevronRight,
  UserCog, UserCheck, UserX, MoreVertical, RefreshCw,
  Pencil, KeyRound, Eye, EyeOff,
} from "lucide-react";
import { usersApi } from "../../api/users";
import { ApiError } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Modal, ConfirmModal } from "../../components/Modal";
import { Input, Select } from "../../components/Input";
import { AlertMessage } from "../../components/ErrorMessage";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../auth/AuthContext";
import type { User, Role } from "../../types/api";

/* ─── Role badge ──────────────────────────────────────────────────────────── */
function RoleBadge({ name }: { name: string }) {
  const variants: Record<string, "info" | "warning" | "neutral" | "success"> = {
    COURT_MANAGER:    "info",
    RECORD_OFFICER:   "warning",
    COMMUNITY_MEMBER: "neutral",
  };
  if (name === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--color-primary)] text-white">
        <ShieldCheck size={11} />{name.replace(/_/g, " ")}
      </span>
    );
  }
  return <Badge variant={variants[name] ?? "neutral"} size="sm">{name.replace(/_/g, " ")}</Badge>;
}

/* ─── Row action dropdown ────────────────────────────────────────────────── */
function RowActions({
  user, currentUserId,
  onEdit, onChangeRole, onResetPw, onChangeStatus,
}: {
  user: User;
  currentUserId: string;
  onEdit: (u: User) => void;
  onChangeRole: (u: User) => void;
  onResetPw: (u: User) => void;
  onChangeStatus: (u: User, s: "ACTIVE" | "INACTIVE") => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelf = user.id === currentUserId;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-ink)] transition-colors"
        aria-label="Row actions" aria-haspopup="true" aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl shadow-[var(--shadow-modal)] z-20 overflow-hidden animate-slide-down">
            <div className="py-1">
              <ActionBtn icon={<Pencil size={14} />}   label="Edit Details"   color="ink"     onClick={() => { setOpen(false); onEdit(user); }} />
              <ActionBtn icon={<UserCog size={14} />}  label="Change Role"    color="primary" onClick={() => { setOpen(false); onChangeRole(user); }} />
              <ActionBtn icon={<KeyRound size={14} />} label="Reset Password" color="warning" onClick={() => { setOpen(false); onResetPw(user); }} />
            </div>
            <div className="border-t border-[var(--color-line)] py-1">
              {user.status === "ACTIVE" ? (
                <ActionBtn
                  icon={<UserX size={14} />} label="Deactivate" color="danger"
                  disabled={isSelf} title={isSelf ? "Cannot deactivate your own account" : undefined}
                  onClick={() => { setOpen(false); onChangeStatus(user, "INACTIVE"); }}
                />
              ) : (
                <ActionBtn icon={<UserCheck size={14} />} label="Activate" color="success"
                  onClick={() => { setOpen(false); onChangeStatus(user, "ACTIVE"); }} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActionBtn({
  icon, label, color, disabled, title, onClick,
}: {
  icon: React.ReactNode; label: string;
  color: "ink" | "primary" | "warning" | "danger" | "success";
  disabled?: boolean; title?: string; onClick: () => void;
}) {
  const colors = {
    ink:     "text-[var(--color-ink)]    hover:bg-[var(--color-bg)]",
    primary: "text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]",
    warning: "text-[var(--color-warning)] hover:bg-[var(--color-warning-bg)]",
    danger:  "text-[var(--color-danger)]  hover:bg-[var(--color-danger-bg)]",
    success: "text-[var(--color-success)] hover:bg-[var(--color-success-bg)]",
  };
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      <span className="shrink-0">{icon}</span>{label}
    </button>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export function UsersListPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user: currentUser } = useAuth();

  /* filters */
  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<"" | "ACTIVE" | "INACTIVE" | "SUSPENDED">("");
  const [filterRoleId, setFilterRoleId]   = useState("");

  /* ── Create modal ─────────────────────────────────────────────────────── */
  const [createOpen, setCreateOpen]       = useState(false);
  const [createError, setCreateError]     = useState<string | null>(null);
  const [newEmail, setNewEmail]           = useState("");
  const [newFullName, setNewFullName]     = useState("");
  const [newPhone, setNewPhone]           = useState("");
  const [newRoleId, setNewRoleId]         = useState("");
  const [tempPassword, setTempPassword]   = useState("");
  const [showTempPw, setShowTempPw]       = useState(false);
  const [createdUser, setCreatedUser]     = useState<{ user: User; temporaryPassword?: string } | null>(null);

  /* ── Edit modal ───────────────────────────────────────────────────────── */
  const [editUser, setEditUser]           = useState<User | null>(null);
  const [editFullName, setEditFullName]   = useState("");
  const [editPhone, setEditPhone]         = useState("");
  const [editError, setEditError]         = useState<string | null>(null);

  /* ── Change role modal ────────────────────────────────────────────────── */
  const [roleModal, setRoleModal]         = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleError, setRoleError]         = useState<string | null>(null);

  /* ── Reset password modal ─────────────────────────────────────────────── */
  const [resetPwUser, setResetPwUser]     = useState<User | null>(null);
  const [newPw, setNewPw]                 = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [showNewPw, setShowNewPw]         = useState(false);
  const [resetPwError, setResetPwError]   = useState<string | null>(null);

  /* ── Confirm status change ────────────────────────────────────────────── */
  const [confirmStatus, setConfirmStatus] = useState<{ user: User; status: "ACTIVE" | "INACTIVE" } | null>(null);

  /* ── Queries ──────────────────────────────────────────────────────────── */
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", { page, search, filterStatus, filterRoleId }],
    queryFn: () =>
      usersApi.list({
        page, pageSize: 15,
        search: search || undefined,
        status: filterStatus || undefined,
        roleId: filterRoleId || undefined,
      }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => usersApi.listRoles(),
  });

  const roles: Role[] = rolesData?.roles ?? [];

  /* ── Mutations ────────────────────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.create({ email: newEmail, fullName: newFullName,
        phone: newPhone || undefined, roleIds: [newRoleId],
        temporaryPassword: tempPassword || undefined }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreatedUser(res); setCreateError(null);
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "Failed to create user."),
  });

  const editMutation = useMutation({
    mutationFn: () => usersApi.update(editUser!.id, {
      fullName: editFullName || undefined,
      phone: editPhone || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User details updated.");
      setEditUser(null); setEditError(null);
    },
    onError: (err) => setEditError(err instanceof ApiError ? err.message : "Failed to update user."),
  });

  const roleMutation = useMutation({
    mutationFn: () => usersApi.assignRoles(roleModal!.id, [selectedRoleId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role updated successfully.");
      setRoleModal(null); setRoleError(null);
    },
    onError: (err) => setRoleError(err instanceof ApiError ? err.message : "Failed to update role."),
  });

  const resetPwMutation = useMutation({
    mutationFn: () => usersApi.adminResetPassword(resetPwUser!.id, newPw),
    onSuccess: () => {
      toast.success(`Password reset for ${resetPwUser?.fullName}. Their active sessions have been revoked.`);
      setResetPwUser(null); setNewPw(""); setConfirmPw(""); setResetPwError(null);
    },
    onError: (err) => setResetPwError(err instanceof ApiError ? err.message : "Failed to reset password."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      usersApi.setStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Account ${status === "ACTIVE" ? "activated" : "deactivated"} successfully.`);
      setConfirmStatus(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update account status.");
      setConfirmStatus(null);
    },
  });

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function resetCreateForm() {
    setNewEmail(""); setNewFullName(""); setNewPhone(""); setNewRoleId("");
    setTempPassword(""); setCreatedUser(null); setCreateError(null); setShowTempPw(false);
  }

  function validateCreatePassword(): string | null {
    if (!tempPassword) return null;
    if (tempPassword.length < 12) return "Password must be at least 12 characters.";
    if (!/[A-Za-z]/.test(tempPassword)) return "Password must include at least one letter.";
    if (!/\d/.test(tempPassword)) return "Password must include at least one number.";
    return null;
  }

  function validateResetPassword(): string | null {
    if (!newPw) return "New password is required.";
    if (newPw.length < 12) return "Password must be at least 12 characters.";
    if (!/[A-Za-z]/.test(newPw)) return "Password must include at least one letter.";
    if (!/\d/.test(newPw)) return "Password must include at least one number.";
    if (newPw !== confirmPw) return "Passwords do not match.";
    return null;
  }

  function openEdit(u: User) {
    setEditUser(u); setEditFullName(u.fullName); setEditPhone(u.phone ?? ""); setEditError(null);
  }

  function openChangeRole(u: User) {
    setSelectedRoleId(u.roles?.[0]?.role.id ?? ""); setRoleError(null); setRoleModal(u);
  }

  function openResetPw(u: User) {
    setResetPwUser(u); setNewPw(""); setConfirmPw(""); setResetPwError(null); setShowNewPw(false);
  }

  function handleSaveRole() {
    if (!roleModal || !selectedRoleId) return;
    if (roleModal.id === currentUser?.id) {
      const chosen = roles.find((r) => r.id === selectedRoleId);
      if (chosen?.name !== "ADMIN") { setRoleError("You cannot remove your own ADMIN role."); return; }
    }
    roleMutation.mutate();
  }

  function handleResetPassword() {
    const err = validateResetPassword();
    if (err) { setResetPwError(err); return; }
    resetPwMutation.mutate();
  }

  const activeFilters = !!(search || filterStatus || filterRoleId);

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl">
      <PageHeader
        title="User Management"
        subtitle={data ? `${data.total} user${data.total === 1 ? "" : "s"} in the system` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => refetch()}>Refresh</Button>
            <Button leftIcon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Create User</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
        <select value={filterRoleId} onChange={(e) => { setFilterRoleId(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10">
          <option value="">All Roles</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        {activeFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterStatus(""); setFilterRoleId(""); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={7} cols={6} />}
        {isError && (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm text-[var(--color-danger)]">Failed to load users.</p>
            <Button variant="secondary" leftIcon={<RefreshCw size={14} />} onClick={() => refetch()}>Try Again</Button>
          </div>
        )}
        {!isLoading && !isError && data?.items.length === 0 && (
          <EmptyState icon={<ShieldCheck />} title="No users found"
            description={activeFilters ? "No users match your filters." : "Create the first user account."}
            action={activeFilters
              ? <Button variant="secondary" onClick={() => { setSearch(""); setFilterStatus(""); setFilterRoleId(""); }}>Clear Filters</Button>
              : undefined}
          />
        )}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">User</th>
                  <th className="px-5 py-3.5 font-semibold">Email</th>
                  <th className="px-5 py-3.5 font-semibold">Role</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                  <th className="px-5 py-3.5 font-semibold">Last Login</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}
                    className={`border-t border-[var(--color-line)] transition-colors ${u.id === currentUser?.id ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-bg)]"}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                          {u.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--color-ink)] leading-tight">
                            {u.fullName}
                            {u.id === currentUser?.id && (
                              <span className="ml-1.5 text-[10px] text-[var(--color-primary)] font-normal">(you)</span>
                            )}
                          </p>
                          {u.phone && <p className="text-xs text-[var(--color-faint)] mt-0.5">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{u.email}</td>
                    <td className="px-5 py-4">
                      {u.roles && u.roles.length > 0
                        ? u.roles.map((r) => <RoleBadge key={r.role.id} name={r.role.name} />)
                        : <span className="text-xs text-[var(--color-faint)]">No role</span>}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : <span className="text-[var(--color-faint)]">Never</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <RowActions
                        user={u} currentUserId={currentUser?.id ?? ""}
                        onEdit={openEdit}
                        onChangeRole={openChangeRole}
                        onResetPw={openResetPw}
                        onChangeStatus={(u, s) => setConfirmStatus({ user: u, status: s })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <Button variant="secondary" leftIcon={<ChevronLeft size={15} />} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" rightIcon={<ChevronRight size={15} />} disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Edit User */}
      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); setEditError(null); }}
        title="Edit User Details" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditUser(null); setEditError(null); }}>Cancel</Button>
            <Button loading={editMutation.isPending} disabled={!editFullName} leftIcon={<Pencil size={14} />} onClick={() => editMutation.mutate()}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
          <Input label="Phone (optional)" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          {editError && <AlertMessage variant="danger" message={editError} />}
        </div>
      </Modal>

      {/* Change Role */}
      <Modal isOpen={!!roleModal} onClose={() => { setRoleModal(null); setRoleError(null); }}
        title="Change User Role" size="sm"
        description={roleModal ? `Assign a new role to ${roleModal.fullName}.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRoleModal(null); setRoleError(null); }}>Cancel</Button>
            <Button loading={roleMutation.isPending} disabled={!selectedRoleId} leftIcon={<UserCog size={14} />} onClick={handleSaveRole}>Save Role</Button>
          </>
        }
      >
        <div className="space-y-4">
          {roleModal && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-line)]">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                {roleModal.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{roleModal.fullName}</p>
                <p className="text-xs text-[var(--color-muted)]">Current: {roleModal.roles?.[0]?.role.name.replace(/_/g, " ") ?? "No role"}</p>
              </div>
            </div>
          )}
          <Select label="New Role" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} required>
            <option value="">Select a role…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>)}
          </Select>
          {roleModal?.id === currentUser?.id && (
            <AlertMessage variant="warning" message="You are changing your own role. You may lose admin access." />
          )}
          {roleError && <AlertMessage variant="danger" message={roleError} />}
        </div>
      </Modal>

      {/* Reset Password */}
      <Modal isOpen={!!resetPwUser} onClose={() => { setResetPwUser(null); setResetPwError(null); }}
        title="Reset User Password" size="sm"
        description={resetPwUser ? `Set a new temporary password for ${resetPwUser.fullName}. Their active sessions will be revoked.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setResetPwUser(null); setResetPwError(null); }}>Cancel</Button>
            <Button variant="danger" loading={resetPwMutation.isPending} leftIcon={<KeyRound size={14} />} onClick={handleResetPassword}>Reset Password</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="New Password"
              type={showNewPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              hint="Min 12 characters, at least one letter and one number."
            />
            <button
              type="button"
              onClick={() => setShowNewPw((v) => !v)}
              className="absolute right-3 top-9 text-[var(--color-faint)] hover:text-[var(--color-muted)]"
              aria-label="Toggle password visibility"
            >
              {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            required
          />
          {resetPwError && <AlertMessage variant="danger" message={resetPwError} />}
        </div>
      </Modal>

      {/* Confirm Activate / Deactivate */}
      <ConfirmModal
        isOpen={!!confirmStatus}
        onClose={() => setConfirmStatus(null)}
        onConfirm={() => confirmStatus && statusMutation.mutate({ id: confirmStatus.user.id, status: confirmStatus.status })}
        title={confirmStatus?.status === "ACTIVE" ? "Activate Account" : "Deactivate Account"}
        description={
          confirmStatus?.status === "ACTIVE"
            ? `Activate ${confirmStatus.user.fullName}'s account? They will be able to log in immediately.`
            : `Deactivate ${confirmStatus?.user.fullName}'s account? They will no longer be able to log in.`
        }
        confirmLabel={confirmStatus?.status === "ACTIVE" ? "Activate" : "Deactivate"}
        variant={confirmStatus?.status === "ACTIVE" ? "primary" : "danger"}
        loading={statusMutation.isPending}
      />

      {/* Create User */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }}
        title={createdUser ? "User Created" : "Create User"}
        description={createdUser ? undefined : "Create a new court system user account."}
        size="md"
        footer={
          createdUser
            ? <Button onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Done</Button>
            : <>
                <Button variant="secondary" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
                <Button loading={createMutation.isPending} disabled={!newEmail || !newFullName || !newRoleId}
                  leftIcon={<Plus size={14} />}
                  onClick={() => {
                    setCreateError(null);
                    const err = validateCreatePassword();
                    if (err) { setCreateError(err); return; }
                    createMutation.mutate();
                  }}>
                  Create User
                </Button>
              </>
        }
      >
        {createdUser ? (
          <div className="space-y-4">
            <AlertMessage variant="success" message={`User "${createdUser.user.fullName}" was created successfully.`} />
            {createdUser.temporaryPassword && (
              <div className="border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] rounded-xl p-5">
                <p className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide mb-2">Temporary Password — Share In Person Only</p>
                <p className="font-mono text-2xl tracking-[0.15em] text-[var(--color-ink)] font-bold py-2 select-all">{createdUser.temporaryPassword}</p>
                <p className="text-xs text-[var(--color-muted)] mt-2">This will not be shown again. The user must change it after first login.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required />
              <Input label="Email Address" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <Input label="Phone (optional)" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Select label="Role" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} required>
              <option value="">Select a role…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>)}
            </Select>
            <div className="relative">
              <Input
                label="Temporary Password (optional)"
                type={showTempPw ? "text" : "password"}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                hint="Leave blank to auto-generate. Min 12 chars, one letter and one number."
              />
              <button type="button" onClick={() => setShowTempPw((v) => !v)}
                className="absolute right-3 top-9 text-[var(--color-faint)] hover:text-[var(--color-muted)]">
                {showTempPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {createError && <AlertMessage variant="danger" message={createError} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

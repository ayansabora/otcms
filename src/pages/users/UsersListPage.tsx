import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { usersApi } from "../../api/users";
import { ApiError } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
import { Input, Select } from "../../components/Input";
import { AlertMessage } from "../../components/ErrorMessage";
import { useToast } from "../../components/Toast";
import type { User } from "../../types/api";

export function UsersListPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen]   = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newEmail, setNewEmail]         = useState("");
  const [newFullName, setNewFullName]   = useState("");
  const [newPhone, setNewPhone]         = useState("");
  const [newRoleId, setNewRoleId]       = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [createdUser, setCreatedUser]   = useState<{ user: User; temporaryPassword?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", { page, search }],
    queryFn: () => usersApi.list({ page, pageSize: 20, search: search || undefined }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => usersApi.listRoles(),
  });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ email: newEmail, fullName: newFullName, phone: newPhone || undefined, roleIds: [newRoleId], temporaryPassword: tempPassword || undefined }),
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["users"] }); setCreatedUser(data); setActionError(null); },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to create user."),
  });

  function handleCreate() {
    setActionError(null);
    // Mirror the backend password policy before hitting the API
    if (tempPassword) {
      if (tempPassword.length < 12) {
        setActionError("Password must be at least 12 characters long.");
        return;
      }
      if (!/[A-Za-z]/.test(tempPassword)) {
        setActionError("Password must contain at least one letter.");
        return;
      }
      if (!/\d/.test(tempPassword)) {
        setActionError("Password must contain at least one number.");
        return;
      }
    }
    createMutation.mutate();
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" }) =>
      usersApi.setStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`User ${status === "ACTIVE" ? "activated" : "deactivated"} successfully.`);
    },
    onError: () => toast.error("Failed to update user status."),
  });

  function resetForm() {
    setNewEmail(""); setNewFullName(""); setNewPhone(""); setNewRoleId("");
    setTempPassword(""); setCreatedUser(null); setActionError(null);
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Users"
        subtitle={data ? `${data.total} user${data.total === 1 ? "" : "s"}` : undefined}
        actions={<Button leftIcon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>Create User</Button>}
      />

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={6} cols={5} />}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState icon={<ShieldCheck />} title="No users found" />
        )}
        {!isLoading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Name</th>
                  <th className="px-5 py-3.5 font-semibold">Email</th>
                  <th className="px-5 py-3.5 font-semibold">Roles</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                          {u.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </div>
                        <span className="font-semibold text-[var(--color-ink)]">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{u.email}</td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
                      {u.roles?.map((r) => r.role.name).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-4">
                      {u.status === "ACTIVE" ? (
                        <Button variant="ghost" size="sm" className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                          onClick={() => statusMutation.mutate({ id: u.id, status: "INACTIVE" })}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-[var(--color-success)] hover:text-[var(--color-success)]"
                          onClick={() => statusMutation.mutate({ id: u.id, status: "ACTIVE" })}>
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <Button variant="secondary" leftIcon={<ChevronLeft size={15} />} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" rightIcon={<ChevronRight size={15} />} disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create user modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title={createdUser ? "User Created" : "Create User"}
        description={createdUser ? undefined : "Create a new court system user account."}
        footer={createdUser
          ? <Button onClick={() => { setCreateOpen(false); resetForm(); }}>Done</Button>
          : <>
              <Button variant="secondary" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button loading={createMutation.isPending} disabled={!newEmail || !newFullName || !newRoleId} onClick={handleCreate}>Create User</Button>
            </>
        }
      >
        {createdUser ? (
          <div className="space-y-4">
            <AlertMessage variant="success" message={`User "${createdUser.user.fullName}" was created successfully.`} />
            {createdUser.temporaryPassword && (
              <div className="border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] rounded-xl p-5">
                <p className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-wide mb-2">
                  Temporary Password — Share Securely & In Person
                </p>
                <p className="font-mono text-2xl tracking-[0.15em] text-[var(--color-ink)] font-bold py-2">
                  {createdUser.temporaryPassword}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  This password will not be shown again. The user should change it on first login.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="Full Name" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required />
            <Input label="Email Address" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <Input label="Phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Select label="Role" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} required>
              <option value="">Select a role…</option>
              {rolesData?.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            <Input
              label="Temporary Password (optional)"
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              hint="Leave blank to auto-generate. If set: min 12 characters, must include at least one letter and one number (e.g. Court2024!)."
            />
            {actionError && <AlertMessage variant="danger" message={actionError} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

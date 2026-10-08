import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { communityMembersApi } from "../../api/communityMembers";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";

export function MembersListPage() {
  const { user } = useAuth();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["community-members", { page, search, verificationStatus }],
    queryFn: () => communityMembersApi.list({ page, pageSize: 20,
      search: search || undefined,
      verificationStatus: verificationStatus || undefined }),
  });

  const canRegister = user?.permissions.includes("member:register");

  const selectCls = "rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10";

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Community Members"
        subtitle={data ? `${data.total} member${data.total === 1 ? "" : "s"}` : undefined}
        actions={canRegister ? (
          <Link to="/app/members/new">
            <Button leftIcon={<Plus size={15} />}>Register Member</Button>
          </Link>
        ) : undefined}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
        <select value={verificationStatus} onChange={(e) => { setVerificationStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={6} cols={5} />}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState icon={<Users />} title="No members found"
            description="Register the first community member."
            action={canRegister ? <Link to="/app/members/new"><Button leftIcon={<Plus size={15} />}>Register Member</Button></Link> : undefined}
          />
        )}
        {!isLoading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Name</th>
                  <th className="px-5 py-3.5 font-semibold">Phone</th>
                  <th className="px-5 py-3.5 font-semibold">Kebele</th>
                  <th className="px-5 py-3.5 font-semibold">Verification</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-5 py-4">
                      <Link to={`/app/members/${m.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                        {m.fullName}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{m.phone || "—"}</td>
                    <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{m.kebele || "—"}</td>
                    <td className="px-5 py-4"><StatusBadge status={`${m.verificationStatus}_MEMBER`} /></td>
                    <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
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
    </div>
  );
}

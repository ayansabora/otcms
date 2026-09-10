import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { casesApi } from "../api/cases";
import { useAuth } from "../auth/AuthContext";
import { StatusBadge } from "../components/StatusBadge";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["cases", "dashboard"],
    queryFn: () => casesApi.list({ page: 1, pageSize: 8 }),
  });

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Dashboard</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">
        Welcome back{user?.fullName ? `, ${user.fullName}` : ""}.
      </p>

      <div className="bg-white border border-[var(--color-line)] rounded-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
          <h2 className="font-medium text-sm">Recent cases</h2>
          <Link to="/app/cases" className="text-sm text-[var(--color-forest)] hover:underline">
            View all
          </Link>
        </div>

        {isLoading && <p className="px-5 py-6 text-sm text-[var(--color-muted)]">Loading…</p>}

        {!isLoading && data?.items.length === 0 && (
          <p className="px-5 py-6 text-sm text-[var(--color-muted)]">
            No cases yet. Register the first case to get started.
          </p>
        )}

        {!isLoading && data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-muted)] text-xs uppercase tracking-wide">
                <th className="px-5 py-2 font-medium">Case</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-paper)]">
                  <td className="px-5 py-3">
                    <Link to={`/app/cases/${c.id}`} className="font-medium text-[var(--color-forest)] hover:underline">
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">{c.caseType.replace("_", " ").toLowerCase()}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

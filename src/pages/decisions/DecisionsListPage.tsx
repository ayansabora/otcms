import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

export function DecisionsListPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Decisions"
        subtitle="Decisions are accessed from their cases"
      />
      <EmptyState
        icon="📜"
        title="Decisions are case-specific"
        description="Navigate to a case to view or record a decision."
        action={<Link to="/app/cases" className="text-sm text-[var(--color-forest)] hover:underline">View Cases →</Link>}
      />
    </div>
  );
}

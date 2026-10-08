import { Link } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

export function DocumentsListPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Documents"
        subtitle="Documents are accessed from their cases"
      />
      <EmptyState
        icon="📁"
        title="Documents are case-specific"
        description="Navigate to a case to view, upload, or download documents."
        action={<Link to="/app/cases" className="text-sm text-[var(--color-forest)] hover:underline">View Cases →</Link>}
      />
    </div>
  );
}

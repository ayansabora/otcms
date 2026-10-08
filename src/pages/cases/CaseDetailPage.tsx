import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { casesApi } from "../../api/cases";
import { hearingsApi } from "../../api/hearings";
import { decisionsApi } from "../../api/decisions";
import { documentsApi } from "../../api/documents";
import { ApiError } from "../../api/client";
import { StatusBadge, PriorityBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { Tabs, TabPanel } from "../../components/Tabs";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage } from "../../components/ErrorMessage";
import { EmptyState } from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import type { CaseStatus } from "../../types/api";

// Mirrors backend workflow — frontend only shows available transitions
const NEXT_STATUS_OPTIONS: Record<CaseStatus, CaseStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED", "WITHDRAWN"],
  VERIFIED: ["ASSIGNED", "WITHDRAWN"],
  ASSIGNED: ["HEARING_SCHEDULED", "WITHDRAWN"],
  HEARING_SCHEDULED: ["HEARING_IN_PROGRESS", "WITHDRAWN"],
  HEARING_IN_PROGRESS: ["DECISION_PENDING", "HEARING_SCHEDULED", "WITHDRAWN"],
  DECISION_PENDING: ["DECIDED", "HEARING_IN_PROGRESS"],
  DECIDED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["case", id],
    queryFn: () => casesApi.get(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ["case", id, "history"],
    queryFn: () => casesApi.history(id!),
    enabled: !!id,
  });

  const { data: hearingsData } = useQuery({
    queryKey: ["hearings", "by-case", id],
    queryFn: () => hearingsApi.list({ caseId: id, pageSize: 50 }),
    enabled: !!id && activeTab === "hearings",
  });

  const { data: decisionsData } = useQuery({
    queryKey: ["decisions", "by-case", id],
    queryFn: () => decisionsApi.listByCase(id!),
    enabled: !!id && activeTab === "decision",
  });

  const { data: documentsData } = useQuery({
    queryKey: ["documents", "by-case", id],
    queryFn: () => documentsApi.listByCase(id!),
    enabled: !!id && activeTab === "documents",
  });

  const transitionMutation = useMutation({
    mutationFn: ({ toStatus }: { toStatus: CaseStatus }) => casesApi.transition(id!, toStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      queryClient.invalidateQueries({ queryKey: ["case", id, "history"] });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Could not update case status.");
    },
  });

  if (isLoading) return <PageLoading message="Loading case…" />;
  if (isError || !data) return <ErrorMessage message="Case not found." />;

  const { case: c } = data;
  const nextOptions = NEXT_STATUS_OPTIONS[c.status] ?? [];
  const canTransition = user?.permissions.some((p) =>
    ["case:transition", "case:assign", "hearing:manage", "decision:record", "decision:approve"].includes(p),
  );

  const complainant = c.parties.find((p) => p.roleInCase === "COMPLAINANT");
  const respondent = c.parties.find((p) => p.roleInCase === "RESPONDENT");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "witnesses", label: "Witnesses", count: c.witnesses?.length ?? 0 },
    { id: "panel", label: "Elder Panel", count: c.assignments.length },
    { id: "hearings", label: "Hearings", count: hearingsData?.total ?? 0 },
    { id: "documents", label: "Documents", count: documentsData?.documents.length ?? 0 },
    { id: "decision", label: "Decision" },
    { id: "history", label: "History", count: historyData?.history.length ?? 0 },
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={c.caseNumber}
        breadcrumb={[{ label: "Cases", to: "/app/cases" }, { label: c.caseNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
          </div>
        }
      />

      {error && <ErrorMessage message={error} className="mb-4" />}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Overview */}
      <TabPanel id="overview" active={activeTab}>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Case Information" />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Type</p>
                  <p className="font-medium capitalize">{c.caseType.replace(/_/g, " ").toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Location</p>
                  <p className="font-medium">{c.location || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Registered</p>
                  <p className="font-medium">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Last Updated</p>
                  <p className="font-medium">{new Date(c.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">{c.description}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parties" />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complainant && (
                  <div className="border border-[var(--color-line)] rounded-sm p-4">
                    <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Complainant</p>
                    <Link
                      to={`/app/members/${complainant.communityMemberId}`}
                      className="font-medium text-[var(--color-forest)] hover:underline"
                    >
                      {complainant.communityMember.fullName}
                    </Link>
                    {complainant.communityMember.phone && (
                      <p className="text-xs text-[var(--color-muted)] mt-1">{complainant.communityMember.phone}</p>
                    )}
                  </div>
                )}
                {respondent && (
                  <div className="border border-[var(--color-line)] rounded-sm p-4">
                    <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">Respondent</p>
                    <Link
                      to={`/app/members/${respondent.communityMemberId}`}
                      className="font-medium text-[var(--color-forest)] hover:underline"
                    >
                      {respondent.communityMember.fullName}
                    </Link>
                    {respondent.communityMember.phone && (
                      <p className="text-xs text-[var(--color-muted)] mt-1">{respondent.communityMember.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {canTransition && nextOptions.length > 0 && (
            <Card>
              <CardHeader title="Actions" subtitle="Move this case forward" />
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {nextOptions.map((toStatus) => (
                    <Button
                      key={toStatus}
                      variant={toStatus === "REJECTED" || toStatus === "WITHDRAWN" ? "danger" : "primary"}
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate({ toStatus })}
                    >
                      {transitionMutation.isPending ? "Updating…" : `→ ${toStatus.replace(/_/g, " ")}`}
                    </Button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </TabPanel>

      {/* Witnesses */}
      <TabPanel id="witnesses" active={activeTab}>
        <Card>
          <CardHeader
            title="Witnesses"
            subtitle={`${c.minWitnessesRequired} witness${c.minWitnessesRequired === 1 ? "" : "es"} required`}
          />
          {!c.witnesses || c.witnesses.length === 0 ? (
            <EmptyState
              icon="👤"
              title="No witnesses recorded"
              description="Witnesses will be added during case proceedings."
            />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {c.witnesses.map((w) => (
                <div key={w.id} className="px-5 py-4">
                  <p className="font-medium text-sm">{w.witness.fullName}</p>
                  {w.witness.phone && <p className="text-xs text-[var(--color-muted)] mt-0.5">{w.witness.phone}</p>}
                  {w.testimonySummary && (
                    <p className="text-xs text-[var(--color-ink)] mt-2 leading-relaxed">{w.testimonySummary}</p>
                  )}
                  {w.testifiedAt && (
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      Testified: {new Date(w.testifiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Elder Panel */}
      <TabPanel id="panel" active={activeTab}>
        <Card>
          <CardHeader title="Elder Panel" subtitle="Assigned elders reviewing this case" />
          {c.assignments.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No panel assigned"
              description="A panel of elders will be assigned once the case is verified."
            />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {c.assignments.map((a) => (
                <div key={a.id} className="px-5 py-4 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.user.fullName}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{a.user.email}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-sm ${
                      a.roleInPanel === "LEAD"
                        ? "bg-[var(--color-gold-light)] text-[var(--color-gold)]"
                        : "bg-[var(--color-paper)] text-[var(--color-muted)]"
                    }`}
                  >
                    {a.roleInPanel === "LEAD" ? "Lead Elder" : "Panel Member"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Hearings */}
      <TabPanel id="hearings" active={activeTab}>
        <Card>
          <CardHeader
            title="Hearings"
            action={
              user?.permissions.includes("hearing:manage") ? (
                <Link to={`/app/hearings/schedule?caseId=${id}`}>
                  <Button>+ Schedule Hearing</Button>
                </Link>
              ) : undefined
            }
          />
          {!hearingsData?.items.length ? (
            <EmptyState
              icon="📅"
              title="No hearings scheduled"
              description="Hearings will be scheduled once the case is assigned to an elder panel."
            />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {hearingsData.items.map((h) => (
                <Link
                  key={h.id}
                  to={`/app/hearings/${h.id}`}
                  className="block px-5 py-4 hover:bg-[var(--color-paper)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(h.startTime).toLocaleDateString()} at{" "}
                        {new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">{h.location}</p>
                      {h.purpose && <p className="text-xs text-[var(--color-ink)] mt-1">{h.purpose}</p>}
                    </div>
                    <StatusBadge status={h.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Documents */}
      <TabPanel id="documents" active={activeTab}>
        <Card>
          <CardHeader
            title="Documents"
            action={
              user?.permissions.includes("document:upload") ? (
                <Button disabled>+ Upload (Coming Soon)</Button>
              ) : undefined
            }
          />
          {!documentsData?.documents.length ? (
            <EmptyState icon="📄" title="No documents" description="Documents will appear here once uploaded." />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {documentsData.documents.map((doc) => (
                <div key={doc.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{doc.filename}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {(doc.sizeBytes / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="secondary" className="text-xs px-3 py-1.5">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Decision */}
      <TabPanel id="decision" active={activeTab}>
        <Card>
          <CardHeader
            title="Decision"
            action={
              user?.permissions.includes("decision:record") &&
              !decisionsData?.decisions.length &&
              c.status === "DECISION_PENDING" ? (
                <Link to={`/app/decisions/record?caseId=${id}`}>
                  <Button>+ Record Decision</Button>
                </Link>
              ) : undefined
            }
          />
          {!decisionsData?.decisions.length ? (
            <EmptyState
              icon="📜"
              title="No decision recorded"
              description="A decision will be recorded once the hearing process is complete."
            />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {decisionsData.decisions.map((dec) => (
                <Link
                  key={dec.id}
                  to={`/app/decisions/${dec.id}`}
                  className="block px-5 py-4 hover:bg-[var(--color-paper)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{dec.outcome}</p>
                    <StatusBadge status={dec.approvalStatus} />
                  </div>
                  <p className="text-sm text-[var(--color-ink)] leading-relaxed">{dec.description}</p>
                  {dec.approvals && dec.approvals.length > 0 && (
                    <p className="text-xs text-[var(--color-muted)] mt-2">
                      {dec.approvals.filter((a) => a.approved).length} / {dec.requiredApprovals} approvals
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* History */}
      <TabPanel id="history" active={activeTab}>
        <Card>
          <CardHeader title="Case History" subtitle="Timeline of all status changes" />
          {!historyData?.history.length ? (
            <EmptyState icon="📋" title="No history yet" />
          ) : (
            <div className="px-5 py-4">
              <ol className="relative border-l-2 border-[var(--color-line)] space-y-6">
                {historyData.history.map((h) => (
                  <li key={h.id} className="ml-4">
                    <div className="absolute -left-2 w-3 h-3 bg-[var(--color-forest)] border-2 border-white rounded-full" />
                    <p className="text-sm font-medium text-[var(--color-ink)] mb-0.5">
                      {h.toStatus.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                    {h.note && (
                      <p className="text-sm text-[var(--color-ink)] mt-1 bg-[var(--color-paper)] rounded-sm px-2 py-1.5">
                        {h.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      </TabPanel>
    </div>
  );
}

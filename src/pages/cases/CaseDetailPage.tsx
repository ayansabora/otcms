import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { casesApi } from "../../api/cases";
import { hearingsApi } from "../../api/hearings";
import { decisionsApi } from "../../api/decisions";
import { documentsApi } from "../../api/documents";
import { summonsApi } from "../../api/summons";
import { consentApi } from "../../api/consent";
import { appealsApi } from "../../api/appeals";
import { ApiError } from "../../api/client";
import { StatusBadge, PriorityBadge } from "../../components/StatusBadge";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { Select } from "../../components/Input";
import { Tabs, TabPanel } from "../../components/Tabs";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage, AlertMessage } from "../../components/ErrorMessage";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
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
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  // Document upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState("evidence");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const { data: summonsData } = useQuery({
    queryKey: ["summons", "by-case", id],
    queryFn: () => summonsApi.list({ caseId: id }),
    enabled: !!id && activeTab === "summons",
  });

  const { data: consentData } = useQuery({
    queryKey: ["consent", "by-case", id],
    queryFn: () => consentApi.listByCase(id!),
    enabled: !!id && activeTab === "consent",
  });

  const { data: appealsData } = useQuery({
    queryKey: ["appeals", "by-case", id],
    queryFn: () => appealsApi.list({ caseId: id }),
    enabled: !!id && activeTab === "appeals",
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

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(id!, file, uploadCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "by-case", id] });
      toast.success("Document uploaded successfully.");
      setShowUploadModal(false);
      setUploadError(null);
      setUploadCategory("evidence");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
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
    { id: "overview",  label: "Overview" },
    { id: "witnesses", label: "Witnesses",   count: c.witnesses?.length ?? 0 },
    { id: "panel",     label: "Elder Panel", count: c.assignments.length },
    { id: "hearings",  label: "Hearings",    count: hearingsData?.total ?? 0 },
    { id: "documents", label: "Documents",   count: documentsData?.documents.length ?? 0 },
    { id: "decision",  label: "Decision" },
    { id: "summons",   label: "Summons",     count: summonsData?.total ?? 0 },
    { id: "consent",   label: "Consent",     count: consentData?.consents.length ?? 0 },
    { id: "appeals",   label: "Appeals",     count: appealsData?.total ?? 0 },
    { id: "history",   label: "History",     count: historyData?.history.length ?? 0 },
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
                <Button leftIcon={<span>+</span>} onClick={() => { setUploadError(null); setShowUploadModal(true); }}>
                  Upload Document
                </Button>
              ) : undefined
            }
          />
          {!documentsData?.documents.length ? (
            <EmptyState
              icon="📄"
              title="No documents"
              description="Upload plaintiff documents, defendant documents, witness statements, and evidence files using the Upload button."
              action={
                user?.permissions.includes("document:upload") ? (
                  <Button size="sm" onClick={() => { setUploadError(null); setShowUploadModal(true); }}>
                    Upload First Document
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {documentsData.documents.map((doc) => (
                <div key={doc.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{doc.filename}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {doc.category && <span className="mr-2 capitalize">{doc.category}</span>}
                      {(doc.sizeBytes / 1024).toFixed(1)} KB · {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        const blob = await documentsApi.download(doc.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = doc.filename;
                        document.body.appendChild(a); a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch {
                        toast.error("Download failed.");
                      }
                    }}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upload modal */}
        <Modal
          isOpen={showUploadModal}
          onClose={() => { setShowUploadModal(false); setUploadError(null); }}
          title="Upload Document"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button
                loading={uploadMutation.isPending}
                onClick={() => {
                  const file = fileInputRef.current?.files?.[0];
                  if (!file) { setUploadError("Please select a file."); return; }
                  uploadMutation.mutate(file);
                }}
              >
                Upload
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Document Category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            >
              <option value="evidence">Evidence</option>
              <option value="plaintiff_document">Plaintiff Document</option>
              <option value="defendant_document">Defendant Document</option>
              <option value="witness_statement">Witness Statement</option>
              <option value="court_order">Court Order</option>
              <option value="other">Other</option>
            </Select>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1.5">
                File <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                className="block w-full text-sm text-[var(--color-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[var(--color-primary-subtle)] file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/20 cursor-pointer"
              />
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Accepted: PDF, Word, JPG, PNG, TXT. Max 15 MB.
              </p>
            </div>
            {uploadError && <AlertMessage variant="danger" message={uploadError} />}
          </div>
        </Modal>
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

      {/* Summons */}
      <TabPanel id="summons" active={activeTab}>
        <Card>
          <CardHeader title="Summons" subtitle="Formal notices issued to the respondent" />
          {!summonsData?.items.length ? (
            <EmptyState title="No summons issued yet" description="Issue a summons to the respondent after case review." />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {summonsData.items.map((s) => (
                <div key={s.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm">Attempt {s.attemptNumber} — {s.serviceMethod.replace(/_/g, " ")}</p>
                    {s.servedAt
                      ? <Badge variant="success">Served</Badge>
                      : <Badge variant="warning">Pending Service</Badge>
                    }
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">Issued: {new Date(s.issuedAt).toLocaleDateString()}</p>
                  {s.servedAt && <p className="text-xs text-[var(--color-muted)]">Served to: {s.servedToName} on {new Date(s.servedAt).toLocaleDateString()}</p>}
                  {s.notes && <p className="text-xs text-[var(--color-muted)] mt-1">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Consent */}
      <TabPanel id="consent" active={activeTab}>
        <Card>
          <CardHeader title="Party Consent" subtitle="Consent of each party to OTC jurisdiction (required per Proclamation 240/2021 Art. 13)" />
          {!consentData?.consents.length ? (
            <EmptyState title="No consent recorded" description="Record the consent of both parties before proceeding." />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {consentData.consents.map((cr) => (
                <div key={cr.id} className="px-5 py-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{cr.communityMember?.fullName ?? "Unknown"}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{new Date(cr.consentDate).toLocaleDateString()}</p>
                    {cr.withdrawnAt && <p className="text-xs text-[var(--color-danger)] mt-1">Withdrawn: {cr.withdrawalReason}</p>}
                    {cr.notes && <p className="text-xs text-[var(--color-muted)] mt-1">{cr.notes}</p>}
                  </div>
                  {cr.withdrawnAt
                    ? <Badge variant="danger">Withdrawn</Badge>
                    : cr.consentGiven
                      ? <Badge variant="success">Consented</Badge>
                      : <Badge variant="danger">Refused</Badge>
                  }
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Appeals */}
      <TabPanel id="appeals" active={activeTab}>
        <Card>
          <CardHeader title="Appeals" subtitle="Appeals filed to the Woreda/Zone Appellate Customary Court" />
          {!appealsData?.items.length ? (
            <EmptyState title="No appeals filed" description="Appeals may be filed after a decision is finalized." />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {appealsData.items.map((ap) => (
                <div key={ap.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm">{ap.appellantPartyRole} — {ap.appellateCourtName}</p>
                    {ap.outcome
                      ? <Badge variant="success">Outcome Received</Badge>
                      : ap.transferredAt
                        ? <Badge variant="info">Transferred</Badge>
                        : <Badge variant="warning">Pending Transfer</Badge>
                    }
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">Filed: {new Date(ap.filedAt).toLocaleDateString()}</p>
                  <p className="text-sm text-[var(--color-ink)] mt-1 leading-relaxed">{ap.groundsForAppeal}</p>
                  {ap.outcome && <p className="text-sm font-medium text-[var(--color-success)] mt-2">Outcome: {ap.outcome}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>
    </div>
  );
}

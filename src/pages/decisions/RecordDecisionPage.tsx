import { useState, useMemo, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Scale, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { decisionsApi } from "../../api/decisions";
import { casesApi } from "../../api/cases";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Input, Select, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import type { Case } from "../../types/api";

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Build a human-readable label for a case dropdown option. */
function caseLabel(c: Case): string {
  const complainant = c.parties.find((p) => p.roleInCase === "COMPLAINANT")?.communityMember.fullName;
  const respondent  = c.parties.find((p) => p.roleInCase === "RESPONDENT")?.communityMember.fullName;
  const type        = c.caseType.replace(/_/g, " ").toLowerCase();
  const parties =
    complainant && respondent
      ? `${complainant} vs. ${respondent}`
      : complainant ?? respondent ?? "No parties";
  return `${c.caseNumber} — ${parties} (${type})`;
}

/* ── Case selector ─────────────────────────────────────────────────────── */
function CaseSelector({
  cases,
  loading,
  loadError,
  selected,
  onSelect,
  onRetry,
}: {
  cases: Case[];
  loading: boolean;
  loadError: boolean;
  selected: string;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      !search
        ? cases
        : cases.filter(
            (c) =>
              caseLabel(c).toLowerCase().includes(search.toLowerCase()) ||
              c.caseNumber.toLowerCase().includes(search.toLowerCase()),
          ),
    [cases, search],
  );

  const selectedCase = cases.find((c) => c.id === selected) ?? null;

  if (loadError) {
    return (
      <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={15} className="text-[var(--color-danger)] shrink-0" />
          <p className="text-sm font-semibold text-[var(--color-danger)]">Could not load cases</p>
        </div>
        <p className="text-xs text-[var(--color-danger)]/80">
          Make sure the backend server is running, then try again.
        </p>
        <Button variant="ghost" size="sm" onClick={onRetry} className="text-[var(--color-danger)]">
          Retry
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="h-10 rounded-lg bg-[var(--color-bg)] animate-pulse" />;
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-[var(--color-warning-dark)] shrink-0" />
          <p className="text-sm font-semibold text-[var(--color-warning-dark)]">No cases pending decision</p>
        </div>
        <p className="text-xs text-[var(--color-warning-dark)]/80 leading-relaxed">
          There are no cases in the DECISION_PENDING status assigned to you.
          Cases must go through the full hearing workflow before a decision can be recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search box */}
      {cases.length > 6 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case number, party name, or type…"
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-8 pr-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
      )}

      {/* Select */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1.5">
          Case <span className="text-[var(--color-danger)]">*</span>
        </label>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
        >
          <option value="">— Select a case ({filtered.length} available) —</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {caseLabel(c)}
            </option>
          ))}
        </select>
        {search && filtered.length === 0 && (
          <p className="text-xs text-[var(--color-muted)] mt-1.5">
            No cases match "{search}".{" "}
            <button type="button" onClick={() => setSearch("")} className="text-[var(--color-primary)] underline">
              Clear search
            </button>
          </p>
        )}
      </div>

      {/* Selected case preview */}
      {selectedCase && (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale size={15} className="text-[var(--color-primary)] shrink-0" />
              <span className="font-semibold text-sm text-[var(--color-ink)]">{selectedCase.caseNumber}</span>
              {selectedCase.title && (
                <span className="text-xs text-[var(--color-muted)] truncate max-w-48">{selectedCase.title}</span>
              )}
            </div>
            <StatusBadge status={selectedCase.status} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[var(--color-muted)]">
            {selectedCase.parties.filter((p) => p.roleInCase === "COMPLAINANT").map((p) => (
              <span key={p.id}>
                <span className="font-medium text-[var(--color-ink)]">Plaintiff:</span>{" "}
                {p.communityMember.fullName}
              </span>
            ))}
            {selectedCase.parties.filter((p) => p.roleInCase === "RESPONDENT").map((p) => (
              <span key={p.id}>
                <span className="font-medium text-[var(--color-ink)]">Defendant:</span>{" "}
                {p.communityMember.fullName}
              </span>
            ))}
            <span>
              <span className="font-medium text-[var(--color-ink)]">Type:</span>{" "}
              {selectedCase.caseType.replace(/_/g, " ").toLowerCase()}
            </span>
            <span>
              <span className="font-medium text-[var(--color-ink)]">Panel:</span>{" "}
              {selectedCase.assignments.length} elder{selectedCase.assignments.length !== 1 ? "s" : ""}
            </span>
          </div>
          {selectedCase.assignments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedCase.assignments.map((a) => (
                <span key={a.id} className="text-xs px-2 py-0.5 rounded bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                  {a.user.fullName}{a.roleInPanel === "LEAD" && " (Lead)"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export function RecordDecisionPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const toast        = useToast();
  const { user }     = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId") ?? "";

  const [caseId,            setCaseId]            = useState(preselectedCaseId);
  const [outcome,           setOutcome]           = useState("");
  const [description,       setDescription]       = useState("");
  const [remarks,           setRemarks]           = useState("");
  const [decisionDate,      setDecisionDate]      = useState(new Date().toISOString().slice(0, 10));
  const [requiredApprovals, setRequiredApprovals]  = useState(2);
  const [decisionType,      setDecisionType]      = useState<"RECONCILIATION" | "RULING">("RULING");
  const [error,             setError]             = useState<string | null>(null);

  /* ── Load eligible cases (DECISION_PENDING only) ──────────────────── */
  // The backend enforces that a decision can only be recorded when the case
  // is in DECISION_PENDING status. We filter on that status so the dropdown
  // only shows cases that are actually eligible.
  // For COURT_MANAGER (case:view_assigned), the backend scopes results to
  // cases assigned to their panel. For ADMIN (case:view_all), all cases show.
  const {
    data: casesData,
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ["cases", "for-decision-dropdown"],
    queryFn: () => casesApi.list({ pageSize: 100, status: "DECISION_PENDING" }),
    enabled: !!user,
    staleTime: 30_000,
  });

  /* ── If preselected, load that case's details ──────────────────────── */
  const { data: preselectedCase } = useQuery({
    queryKey: ["case", preselectedCaseId],
    queryFn: () => casesApi.get(preselectedCaseId),
    enabled: !!preselectedCaseId,
    staleTime: Infinity,
  });

  /* ── Record decision mutation ──────────────────────────────────────── */
  const recordMutation = useMutation({
    mutationFn: decisionsApi.record,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Decision recorded successfully. Pending elder panel approval.");
      navigate(`/app/decisions/${result.decision.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to record decision. Please try again.");
    },
  });

  /* ── Validation & submit ───────────────────────────────────────────── */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!caseId)                  { setError("Please select a case.");                          return; }
    if (!outcome.trim())          { setError("Outcome is required.");                          return; }
    if (description.trim().length < 10) { setError("Decision details must be at least 10 characters."); return; }

    recordMutation.mutate({
      caseId,
      decisionType,
      outcome: outcome.trim(),
      description: description.trim(),
      remarks: remarks.trim() || undefined,
      decisionDate,
      requiredApprovals,
    });
  }

  const submitting = recordMutation.isPending;
  const allCases = casesData?.items ?? [];

  // When preselected, merge it into the list so it appears even if the
  // status-filtered query hasn't loaded it yet.
  const mergedCases = useMemo(() => {
    if (!preselectedCase?.case) return allCases;
    if (allCases.find((c) => c.id === preselectedCase.case.id)) return allCases;
    return [preselectedCase.case, ...allCases];
  }, [allCases, preselectedCase]);

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Record Decision"
        subtitle="Record the elder panel's decision for a case awaiting resolution."
        breadcrumb={[
          { label: "Decisions", to: "/app/decisions" },
          { label: "Record Decision" },
        ]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Case selection ─────────────────────────────────────────── */}
        <Card className="mb-4">
          <CardHeader title="Select Case" icon={<Scale size={15} />} />
          <CardBody className="space-y-4">
            {preselectedCaseId ? (
              <>
                <input type="hidden" name="caseId" value={caseId} />
                <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-subtle)] px-4 py-3">
                  <CheckCircle2 size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--color-primary)]">
                    Case <span className="font-mono font-semibold">{preselectedCase?.case?.caseNumber ?? "loading…"}</span>{" "}
                    is pre-selected from the case detail page. You can change it below if needed.
                  </p>
                </div>
                <CaseSelector
                  cases={mergedCases}
                  loading={casesLoading && !preselectedCase}
                  loadError={casesError}
                  selected={caseId}
                  onSelect={setCaseId}
                  onRetry={refetchCases}
                />
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-subtle)] px-4 py-3">
                  <Info size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--color-primary)]">
                    Only cases in <strong>Decision Pending</strong> status are eligible for decision recording.
                    If no cases appear below, no cases have reached the decision stage yet.
                  </p>
                </div>
                <CaseSelector
                  cases={allCases}
                  loading={casesLoading}
                  loadError={casesError}
                  selected={caseId}
                  onSelect={setCaseId}
                  onRetry={refetchCases}
                />
              </>
            )}
          </CardBody>
        </Card>

        {/* ── Decision details ───────────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader title="Decision Details" />
          <CardBody className="space-y-4">
            <Input
              label="Outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              required
              placeholder="e.g. Land returned to complainant, Reconciliation agreed"
              hint="A short summary of the decision reached"
            />

            <Select
              label="Decision Type"
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value as "RECONCILIATION" | "RULING")}
              required
              hint="Reconciliation = mutually agreed resolution; Ruling = elder panel judgment"
            >
              <option value="RULING">Ruling (Elder Panel Judgment)</option>
              <option value="RECONCILIATION">Reconciliation (Mutual Agreement)</option>
            </Select>

            <TextArea
              label="Decision Details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              minLength={10}
              placeholder="Full description of the decision reached by the elder panel…"
              hint="Minimum 10 characters"
            />

            <TextArea
              label="Additional Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Any conditions, timeline, or implementation notes…"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Decision Date"
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
              />
              <Input
                label="Elder Approvals Required"
                type="number"
                min={1}
                max={10}
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(Number(e.target.value))}
                hint="Number of elders who must approve"
              />
            </div>
          </CardBody>
        </Card>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={submitting || !caseId}
            leftIcon={<CheckCircle2 size={15} />}
          >
            {submitting ? "Recording…" : "Record Decision"}
          </Button>
        </div>
      </form>
    </div>
  );
}

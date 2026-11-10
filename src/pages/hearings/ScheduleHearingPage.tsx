import { useState, useMemo, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Search, Users, Scale, Info, AlertCircle } from "lucide-react";
import { hearingsApi } from "../../api/hearings";
import { casesApi } from "../../api/cases";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
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
      : complainant
        ? complainant
        : respondent
          ? respondent
          : "No parties";
  return `${c.caseNumber} — ${parties} (${type})`;
}

/** Cases that are eligible for a hearing:
 *  - Formally registered (isRequest = false)
 *  - Not in a terminal or pre-review status
 *  - i.e. from SUBMITTED all the way through to DECISION_PENDING
 *  We deliberately do NOT restrict to only ASSIGNED so that:
 *  (a) Record Officers can schedule hearings for cases at any active stage
 *  (b) The system doesn't silently produce an empty dropdown for new installs
 */
const ELIGIBLE_STATUSES = new Set([
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "ASSIGNED",
  "HEARING_SCHEDULED",
  "HEARING_IN_PROGRESS",
  "DECISION_PENDING",
]);

function isEligible(c: Case): boolean {
  return !c.isRequest && ELIGIBLE_STATUSES.has(c.status);
}

/* ── Case selector component ──────────────────────────────────────────── */
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

  const eligible = useMemo(() => cases.filter(isEligible), [cases]);

  const filtered = useMemo(
    () =>
      !search
        ? eligible
        : eligible.filter((c) =>
            caseLabel(c).toLowerCase().includes(search.toLowerCase()) ||
            c.caseNumber.toLowerCase().includes(search.toLowerCase()),
          ),
    [eligible, search],
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
    return (
      <div className="h-10 rounded-lg bg-[var(--color-bg)] animate-pulse" />
    );
  }

  if (eligible.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-[var(--color-warning-dark)] shrink-0" />
          <p className="text-sm font-semibold text-[var(--color-warning-dark)]">No eligible cases</p>
        </div>
        <p className="text-xs text-[var(--color-warning-dark)]/80 leading-relaxed">
          There are no formally registered cases available to schedule a hearing for.{" "}
          <Link to="/app/cases/new" className="underline font-medium">
            Register a case first →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search box */}
      {eligible.length > 6 && (
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

      {/* Selected case preview card */}
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
              <span className="font-medium text-[var(--color-ink)]">Registered:</span>{" "}
              {new Date(selectedCase.createdAt).toLocaleDateString()}
            </span>
          </div>
          {selectedCase.status === "ASSIGNED" && selectedCase.assignments.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-success)]">
              <Users size={12} />
              <span>Elder panel assigned ({selectedCase.assignments.length} member{selectedCase.assignments.length !== 1 ? "s" : ""})</span>
            </div>
          )}
          {selectedCase.status !== "ASSIGNED" && (
            <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
              <Info size={12} className="shrink-0" />
              Status is <strong>{selectedCase.status.replace(/_/g, " ")}</strong>.
              {selectedCase.status === "SUBMITTED" || selectedCase.status === "UNDER_REVIEW"
                ? " The case has not been assigned to an elder panel yet — you can still schedule a hearing but elders won't be auto-added as participants."
                : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export function ScheduleHearingPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const toast        = useToast();
  const { user }     = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId") ?? "";

  const [caseId,    setCaseId]    = useState(preselectedCaseId);
  const [startTime, setStartTime] = useState("");
  const [endTime,   setEndTime]   = useState("");
  const [location,  setLocation]  = useState("");
  const [purpose,   setPurpose]   = useState("");
  const [error,     setError]     = useState<string | null>(null);

  /* ── Load all active formal cases ─────────────────────────────────── */
  const {
    data: casesData,
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useQuery({
    queryKey: ["cases", "for-hearing-dropdown"],
    // Fetch up to 100 non-request cases. The CaseSelector component filters
    // further by status to show only hearing-eligible cases.
    queryFn: () => casesApi.list({ pageSize: 100, isRequest: false }),
    enabled: !!user,
    staleTime: 30_000,
  });

  /* ── Schedule mutation ────────────────────────────────────────────── */
  const scheduleMutation = useMutation({
    mutationFn: hearingsApi.schedule,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hearings"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success(`Hearing scheduled for ${new Date(result.hearing.startTime).toLocaleDateString()}.`);
      // Navigate to the new hearing detail page
      navigate(`/app/hearings/${result.hearing.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to schedule hearing. Please try again.");
    },
  });

  /* ── Validation & submit ──────────────────────────────────────────── */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!caseId)      { setError("Please select a case.");                           return; }
    if (!startTime)   { setError("Start date and time is required.");                return; }
    if (!endTime)     { setError("End date and time is required.");                  return; }
    if (!location.trim()) { setError("Location is required.");                       return; }
    if (new Date(endTime) <= new Date(startTime)) {
      setError("End time must be after start time.");
      return;
    }

    scheduleMutation.mutate({
      caseId,
      startTime,
      endTime,
      location: location.trim(),
      purpose: purpose.trim() || undefined,
    });
  }

  const submitting = scheduleMutation.isPending;

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Schedule Hearing"
        subtitle="Schedule a formal hearing session for a registered case."
        breadcrumb={[{ label: "Hearings", to: "/app/hearings" }, { label: "Schedule" }]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Case selection ─────────────────────────────────────────── */}
        <Card className="mb-4">
          <CardBody className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-subtle)] px-4 py-3">
              <Info size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--color-primary)]">
                Select a registered case to associate with this hearing.
                Cases already with hearings can be selected again for additional sessions.
              </p>
            </div>

            {preselectedCaseId ? (
              /* When navigated from Case Detail page — case is pre-selected */
              <div>
                <input type="hidden" name="caseId" value={caseId} />
                {casesData && (
                  <CaseSelector
                    cases={casesData.items}
                    loading={false}
                    loadError={false}
                    selected={caseId}
                    onSelect={setCaseId}
                    onRetry={refetchCases}
                  />
                )}
              </div>
            ) : (
              <CaseSelector
                cases={casesData?.items ?? []}
                loading={casesLoading}
                loadError={casesError}
                selected={caseId}
                onSelect={setCaseId}
                onRetry={refetchCases}
              />
            )}
          </CardBody>
        </Card>

        {/* ── Date, time, and venue ──────────────────────────────────── */}
        <Card className="mb-6">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={15} className="text-[var(--color-primary)]" />
              <span className="font-semibold text-sm text-[var(--color-ink)]">Hearing Date, Time & Venue</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date & Time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                hint="When the hearing session begins"
              />
              <Input
                label="End Date & Time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                hint="When the hearing session ends"
              />
            </div>

            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g. Court Room 1, Bale Robe City Hall"
              hint="Must be unique for the selected time slot (double-booking check is enforced)"
            />

            <Input
              label="Purpose (optional)"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Initial hearing, Witness testimony, Mediation session"
            />
          </CardBody>
        </Card>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/hearings")} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={submitting}
            leftIcon={<Calendar size={15} />}
          >
            {submitting ? "Scheduling…" : "Schedule Hearing"}
          </Button>
        </div>

      </form>
    </div>
  );
}

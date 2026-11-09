import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search, ClipboardList, CheckCircle, XCircle,
  RotateCcw, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { casesApi } from "../../api/cases";
import { api, ApiError } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { Badge } from "../../components/Badge";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Modal, ConfirmModal } from "../../components/Modal";
import { TextArea } from "../../components/Input";
import { AlertMessage } from "../../components/ErrorMessage";
import { useToast } from "../../components/Toast";
import type { Case, CaseType } from "../../types/api";

const CASE_TYPES: Record<CaseType, string> = {
  MARRIAGE: "Marriage Dispute", DIVORCE: "Divorce",
  LAND_DISPUTE: "Land Dispute", PROPERTY_DISPUTE: "Property Dispute",
  DEBT: "Debt", ASSAULT: "Assault", DEFAMATION: "Defamation", OTHER: "Other",
};

/* ── Parse opposing party from description ─────────────────────────────── */
function parseOpposingParty(description: string): { name?: string; phone?: string; kebele?: string; address?: string; body: string } {
  const lines = description.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("--- Opposing Party ---"));
  if (idx === -1) return { body: description };
  const body   = lines.slice(0, idx).join("\n").trim();
  const rest   = lines.slice(idx + 1);
  const get    = (prefix: string) => rest.find((l) => l.startsWith(prefix))?.replace(prefix, "").trim();
  return {
    body,
    name:    get("Name:"),
    phone:   get("Phone:"),
    kebele:  get("Kebele:"),
    address: get("Address:"),
  };
}

/* ── Request row expandable ─────────────────────────────────────────────── */
function RequestRow({
  req,
  onAccept,
  onReturn,
  onReject,
}: {
  req: Case;
  onAccept: (r: Case) => void;
  onReturn: (r: Case) => void;
  onReject: (r: Case) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseOpposingParty(req.description);

  return (
    <>
      <tr className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
        <td className="px-5 py-4">
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 text-[var(--color-primary)] hover:underline font-semibold text-sm">
            {req.caseNumber}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
        </td>
        <td className="px-5 py-4 text-xs text-[var(--color-muted)] capitalize">
          {CASE_TYPES[req.caseType] ?? req.caseType.replace(/_/g, " ")}
        </td>
        <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
          {parsed.name || <span className="text-[var(--color-faint)] italic">Unknown</span>}
          {parsed.phone && <p className="text-[var(--color-faint)]">{parsed.phone}</p>}
        </td>
        <td className="px-5 py-4"><StatusBadge status={req.status} /></td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="primary" size="sm" leftIcon={<CheckCircle size={13} />} onClick={() => onAccept(req)}>
              Accept
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={13} />} onClick={() => onReturn(req)}>
              Return
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<XCircle size={13} />}
              className="text-[var(--color-danger)]" onClick={() => onReject(req)}>
              Reject
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-[var(--color-bg)] border-t border-[var(--color-line)]">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide mb-2">Dispute Description</p>
                <p className="text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">{parsed.body}</p>
                {req.location && <p className="text-xs text-[var(--color-muted)] mt-2">Location: {req.location}</p>}
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wide mb-2">Opposing Party Details</p>
                {parsed.name || parsed.phone || parsed.kebele || parsed.address ? (
                  <div className="space-y-1 text-[var(--color-ink)]">
                    {parsed.name    && <p><span className="text-[var(--color-muted)] w-16 inline-block">Name:</span> {parsed.name}</p>}
                    {parsed.phone   && <p><span className="text-[var(--color-muted)] w-16 inline-block">Phone:</span> {parsed.phone}</p>}
                    {parsed.kebele  && <p><span className="text-[var(--color-muted)] w-16 inline-block">Kebele:</span> {parsed.kebele}</p>}
                    {parsed.address && <p><span className="text-[var(--color-muted)] w-16 inline-block">Address:</span> {parsed.address}</p>}
                  </div>
                ) : (
                  <p className="text-[var(--color-muted)] italic">No opposing party information provided.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export function CaseRequestsPage() {
  const queryClient = useQueryClient();
  const toast       = useToast();
  const navigate    = useNavigate();

  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [noteModal, setNoteModal] = useState<{ req: Case; action: "return" | "reject" } | null>(null);
  const [note,      setNote]      = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [acceptConfirm, setAcceptConfirm] = useState<Case | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["case-requests", { page, search }],
    queryFn: () => casesApi.list({ page, pageSize: 20, isRequest: true, search: search || undefined }),
  });

  /* ── Mutations ─────────────────────────────────────────────────────── */
  const transitionMutation = useMutation({
    mutationFn: ({ id, toStatus, note }: { id: string; toStatus: string; note?: string }) =>
      api.post<{ case: Case }>(`/cases/${id}/transition`, { toStatus, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-requests"] });
    },
    onError: (err) => setNoteError(err instanceof ApiError ? err.message : "Action failed."),
  });

  function handleAccept(req: Case) {
    // Transition to UNDER_REVIEW then redirect to Register Case pre-filled
    transitionMutation.mutate(
      { id: req.id, toStatus: "UNDER_REVIEW", note: "Accepted by Record Officer for formal registration." },
      {
        onSuccess: () => {
          toast.success(`Request ${req.caseNumber} accepted. Opening formal registration…`);
          // Navigate to new case page with the request ID pre-filled via URL param
          setTimeout(() => navigate(`/app/cases/new?fromRequest=${req.id}`), 800);
        },
      },
    );
  }

  function handleNoteAction() {
    if (!noteModal) return;
    if (!note.trim()) { setNoteError("Please provide a reason."); return; }
    const toStatus = noteModal.action === "reject" ? "REJECTED" : "SUBMITTED";
    const noteText = noteModal.action === "reject"
      ? `REJECTED by Record Officer: ${note}`
      : `Returned for additional information: ${note}`;

    transitionMutation.mutate(
      { id: noteModal.req.id, toStatus, note: noteText },
      {
        onSuccess: () => {
          toast.success(noteModal.action === "reject" ? "Request rejected." : "Request returned to requester.");
          setNoteModal(null); setNote(""); setNoteError(null);
        },
      },
    );
  }

  const pending  = data?.items.filter((r) => r.status === "SUBMITTED").length ?? 0;

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="New Case Requests"
        subtitle="Community member dispute requests awaiting formal registration."
        actions={
          pending > 0
            ? <Badge variant="warning" dot>{pending} pending</Badge>
            : undefined
        }
      />

      {/* Info */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              These are requests submitted directly by community members. Review each request,
              then <strong>Accept</strong> to formally register it as a court case,
              <strong> Return</strong> to request more information, or <strong>Reject</strong> if the request is invalid.
              Only formally registered cases enter the Court Manager's review workflow.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by case number or description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={5} cols={5} />}

        {!isLoading && data?.items.length === 0 && (
          <EmptyState
            icon={<ClipboardList />}
            title="No case requests"
            description="No community member requests have been submitted yet."
          />
        )}

        {!isLoading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Request No.</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Opposing Party</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    onAccept={() => setAcceptConfirm(req)}
                    onReturn={(r) => { setNoteModal({ req: r, action: "return" }); setNote(""); setNoteError(null); }}
                    onReject={(r) => { setNoteModal({ req: r, action: "reject" }); setNote(""); setNoteError(null); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</Button>
          <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}

      {/* Accept confirm */}
      <ConfirmModal
        isOpen={!!acceptConfirm}
        onClose={() => setAcceptConfirm(null)}
        onConfirm={() => { if (acceptConfirm) handleAccept(acceptConfirm); setAcceptConfirm(null); }}
        title="Accept Case Request"
        description={`Accept request ${acceptConfirm?.caseNumber} for formal registration? This will transition the request to Under Review and open the Register Case form pre-filled with the request data.`}
        confirmLabel="Accept & Register"
        loading={transitionMutation.isPending}
      />

      {/* Return / Reject modal */}
      <Modal
        isOpen={!!noteModal}
        onClose={() => { setNoteModal(null); setNote(""); setNoteError(null); }}
        title={noteModal?.action === "reject" ? "Reject Request" : "Return for More Information"}
        description={`Request: ${noteModal?.req.caseNumber}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteModal(null)}>Cancel</Button>
            <Button
              variant={noteModal?.action === "reject" ? "danger" : "primary"}
              loading={transitionMutation.isPending}
              onClick={handleNoteAction}
            >
              {noteModal?.action === "reject" ? "Reject Request" : "Return Request"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextArea
            label={noteModal?.action === "reject" ? "Reason for rejection" : "What additional information is needed?"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            required
            placeholder={noteModal?.action === "reject"
              ? "Explain why this request is being rejected…"
              : "Describe what information the requester must provide…"
            }
          />
          {noteError && <AlertMessage variant="danger" message={noteError} />}
        </div>
      </Modal>
    </div>
  );
}

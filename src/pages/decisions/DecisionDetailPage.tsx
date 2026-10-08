import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { decisionsApi } from "../../api/decisions";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage, AlertMessage } from "../../components/ErrorMessage";
import { Modal } from "../../components/Modal";

export function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [approveModal, setApproveModal] = useState(false);
  const [approveVote, setApproveVote] = useState<boolean>(true);
  const [approveComment, setApproveComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["decision", id],
    queryFn: () => decisionsApi.get(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => decisionsApi.approve(id!, approveVote, approveComment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision", id] });
      setApproveModal(false);
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Approval action failed."),
  });

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <ErrorMessage message="Decision not found." />;

  const { decision: dec } = data;
  const canApprove = user?.permissions.includes("decision:approve");
  const approvals = dec.approvals ?? [];
  const approved = approvals.filter((a) => a.approved).length;
  const pct = Math.min(100, Math.round((approved / dec.requiredApprovals) * 100));
  const alreadyVoted = approvals.some((a) => a.userId === user?.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Decision"
        breadcrumb={[
          { label: "Cases", to: "/app/cases" },
          ...(dec.case ? [{ label: dec.case.caseNumber, to: `/app/cases/${dec.caseId}` }] : []),
          { label: "Decision" },
        ]}
        actions={
          canApprove && !alreadyVoted && dec.approvalStatus === "PENDING" ? (
            <Button onClick={() => setApproveModal(true)}>Submit Approval</Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Decision Details" />
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={dec.approvalStatus} />
              {dec.finalizedAt && (
                <span className="text-xs text-[var(--color-muted)]">
                  Finalized {new Date(dec.finalizedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Outcome</p>
              <p className="font-medium text-sm">{dec.outcome}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Description</p>
              <p className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">{dec.description}</p>
            </div>
            {dec.remarks && (
              <div>
                <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Remarks</p>
                <p className="text-sm text-[var(--color-ink)]">{dec.remarks}</p>
              </div>
            )}
            {dec.decisionDate && (
              <div>
                <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-sm">{new Date(dec.decisionDate).toLocaleDateString()}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Approval progress */}
        <Card>
          <CardHeader title="Elder Approvals" subtitle={`${approved} of ${dec.requiredApprovals} required`} />
          <CardBody>
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
                <span>{approved} / {dec.requiredApprovals} approvals</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 bg-[var(--color-paper)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-[var(--color-status-success)]" : "bg-[var(--color-forest)]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {approvals.length > 0 && (
              <div className="space-y-2">
                {approvals.map((a) => (
                  <div key={a.id} className="flex items-start justify-between text-sm border-t border-[var(--color-line)] pt-2">
                    <div>
                      <p className="font-medium text-xs">{a.user?.fullName ?? "Elder"}</p>
                      {a.comment && <p className="text-xs text-[var(--color-muted)] mt-0.5">{a.comment}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${a.approved ? "bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]" : "bg-[var(--color-status-danger)]/10 text-[var(--color-status-danger)]"}`}>
                      {a.approved ? "Approved" : "Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Approve modal */}
      <Modal
        isOpen={approveModal}
        onClose={() => setApproveModal(false)}
        title="Submit Approval"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveModal(false)}>Cancel</Button>
            <Button
              variant={approveVote ? "primary" : "danger"}
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              {approveMutation.isPending ? "Submitting…" : (approveVote ? "Approve Decision" : "Reject Decision")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Your vote</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setApproveVote(true)}
                className={`flex-1 py-2 rounded-sm text-sm border transition-colors ${approveVote ? "bg-[var(--color-forest)] text-white border-[var(--color-forest)]" : "border-[var(--color-line)] text-[var(--color-muted)]"}`}
              >
                ✓ Approve
              </button>
              <button
                type="button"
                onClick={() => setApproveVote(false)}
                className={`flex-1 py-2 rounded-sm text-sm border transition-colors ${!approveVote ? "bg-[var(--color-status-danger)] text-white border-[var(--color-status-danger)]" : "border-[var(--color-line)] text-[var(--color-muted)]"}`}
              >
                ✕ Reject
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comment (optional)</label>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
              placeholder="Your notes on this decision…"
            />
          </div>
          {actionError && <AlertMessage variant="danger" message={actionError} />}
        </div>
      </Modal>
    </div>
  );
}

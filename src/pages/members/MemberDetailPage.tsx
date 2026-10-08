import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage, AlertMessage } from "../../components/ErrorMessage";
import { Modal } from "../../components/Modal";

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["member", id],
    queryFn: () => communityMembersApi.get(id!),
    enabled: !!id,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ approve }: { approve: boolean }) =>
      communityMembersApi.verify(id!, approve, verifyNote || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      setVerifyModalOpen(false);
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Verification failed."),
  });

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <ErrorMessage message="Member not found." />;

  const { member: m } = data;
  const canVerify = user?.permissions.includes("member:verify");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={m.fullName}
        breadcrumb={[{ label: "Community Members", to: "/app/members" }, { label: m.fullName }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={`${m.verificationStatus}_MEMBER`} />
            {canVerify && m.verificationStatus === "PENDING" && (
              <Button onClick={() => setVerifyModalOpen(true)}>Verify Member</Button>
            )}
          </div>
        }
      />

      {actionError && <AlertMessage variant="danger" message={actionError} className="mb-4" />}

      <Card>
        <CardHeader title="Profile" />
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Gender</p>
              <p className="font-medium">{m.gender || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Phone</p>
              <p className="font-medium">{m.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Kebele</p>
              <p className="font-medium">{m.kebele || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Address</p>
              <p className="font-medium">{m.address || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">ID Reference</p>
              <p className="font-medium">{m.identificationRef || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Registered</p>
              <p className="font-medium">{new Date(m.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Verify modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Verify Community Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
            <Button variant="danger" disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate({ approve: false })}>
              Reject
            </Button>
            <Button disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate({ approve: true })}>
              {verifyMutation.isPending ? "Saving…" : "Approve & Verify"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Verify that <strong>{m.fullName}</strong>'s identity and information have been confirmed.
        </p>
        <label className="block text-sm font-medium mb-1">Note (optional)</label>
        <textarea
          value={verifyNote}
          onChange={(e) => setVerifyNote(e.target.value)}
          rows={3}
          className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
          placeholder="Record any notes about the verification…"
        />
        {actionError && <AlertMessage variant="danger" message={actionError} className="mt-3" />}
      </Modal>
    </div>
  );
}

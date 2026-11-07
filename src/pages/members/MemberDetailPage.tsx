import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { Input, Select } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage, AlertMessage } from "../../components/ErrorMessage";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

/* ── Small profile field ──────────────────────────────────────────────── */
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[var(--color-ink)]">{value || "—"}</p>
    </div>
  );
}

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modal states
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [editModalOpen,   setEditModalOpen]   = useState(false);
  const [verifyNote,      setVerifyNote]      = useState("");
  const [actionError,     setActionError]     = useState<string | null>(null);

  // Edit form state — populated when modal opens
  const [editFullName,   setEditFullName]   = useState("");
  const [editGender,     setEditGender]     = useState("");
  const [editDob,        setEditDob]        = useState("");
  const [editPhone,      setEditPhone]      = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editRegion,     setEditRegion]     = useState("");
  const [editZone,       setEditZone]       = useState("");
  const [editWoreda,     setEditWoreda]     = useState("");
  const [editKebele,     setEditKebele]     = useState("");
  const [editAddress,    setEditAddress]    = useState("");
  const [editIdRef,      setEditIdRef]      = useState("");
  const [editError,      setEditError]      = useState<string | null>(null);

  /* ── Queries ──────────────────────────────────────────────────────── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ["member", id],
    queryFn: () => communityMembersApi.get(id!),
    enabled: !!id,
  });

  /* ── Mutations ────────────────────────────────────────────────────── */
  const verifyMutation = useMutation({
    mutationFn: ({ approve }: { approve: boolean }) =>
      communityMembersApi.verify(id!, approve, verifyNote || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
      setVerifyModalOpen(false);
      setActionError(null);
      toast.success("Member verification updated.");
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Verification failed."),
  });

  const editMutation = useMutation({
    mutationFn: () => communityMembersApi.update(id!, {
      fullName:         editFullName   || undefined,
      gender:           editGender     || undefined,
      dateOfBirth:      editDob        || undefined,
      phone:            editPhone      || undefined,
      occupation:       editOccupation || undefined,
      region:           editRegion     || undefined,
      zone:             editZone       || undefined,
      woreda:           editWoreda     || undefined,
      kebele:           editKebele     || undefined,
      address:          editAddress    || undefined,
      identificationRef: editIdRef     || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
      setEditModalOpen(false);
      setEditError(null);
      toast.success("Member profile updated.");
    },
    onError: (err) => setEditError(err instanceof ApiError ? err.message : "Update failed."),
  });

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function openEdit() {
    if (!m) return;
    setEditFullName(m.fullName);
    setEditGender(m.gender ?? "");
    setEditDob(m.dateOfBirth ? m.dateOfBirth.slice(0, 10) : "");
    setEditPhone(m.phone ?? "");
    setEditOccupation(m.occupation ?? "");
    setEditRegion(m.region ?? "");
    setEditZone(m.zone ?? "");
    setEditWoreda(m.woreda ?? "");
    setEditKebele(m.kebele ?? "");
    setEditAddress(m.address ?? "");
    setEditIdRef(m.identificationRef ?? "");
    setEditError(null);
    setEditModalOpen(true);
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  if (isLoading) return <PageLoading />;
  if (isError || !data) return <ErrorMessage message="Member not found." />;

  const { member: m } = data;
  const canVerify = user?.permissions.includes("member:verify");
  const canEdit   = user?.permissions.includes("member:register"); // same permission covers update

  // Compute age from dateOfBirth if available
  const age = m.dateOfBirth
    ? Math.floor((Date.now() - new Date(m.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={m.fullName}
        breadcrumb={[{ label: "Community Members", to: "/app/members" }, { label: m.fullName }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={`${m.verificationStatus}_MEMBER`} />
            {canEdit && (
              <Button variant="secondary" size="sm" leftIcon={<Pencil size={14} />} onClick={openEdit}>
                Edit
              </Button>
            )}
            {canVerify && m.verificationStatus === "PENDING" && (
              <Button size="sm" onClick={() => setVerifyModalOpen(true)}>Verify Member</Button>
            )}
          </div>
        }
      />

      {actionError && <AlertMessage variant="danger" message={actionError} className="mb-4" />}

      {/* Personal information */}
      <Card className="mb-4">
        <CardHeader title="Personal Information" />
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Full Name"   value={m.fullName} />
            <Field label="Gender"      value={m.gender} />
            <Field label="Age"         value={age !== null ? `${age} years` : m.dateOfBirth ? new Date(m.dateOfBirth).toLocaleDateString() : null} />
            <Field label="Phone"       value={m.phone} />
            <Field label="Occupation"  value={m.occupation} />
            <Field label="ID Reference" value={m.identificationRef} />
          </div>
        </CardBody>
      </Card>

      {/* Address information */}
      <Card className="mb-4">
        <CardHeader title="Address Information" />
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Region" value={m.region} />
            <Field label="Zone"   value={m.zone} />
            <Field label="Woreda" value={m.woreda} />
            <Field label="Kebele" value={m.kebele} />
            <Field label="Address" value={m.address} />
          </div>
        </CardBody>
      </Card>

      {/* Registration info */}
      <Card className="mb-6">
        <CardHeader title="Registration" />
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Verification Status" value={m.verificationStatus} />
            <Field label="Registered"          value={new Date(m.createdAt).toLocaleDateString()} />
            <Field label="Last Updated"        value={new Date(m.updatedAt).toLocaleDateString()} />
          </div>
        </CardBody>
      </Card>

      {/* ── VERIFY MODAL ─────────────────────────────────────────────── */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => { setVerifyModalOpen(false); setActionError(null); }}
        title="Verify Community Member"
        description={`Confirm that ${m.fullName}'s identity and information have been checked.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate({ approve: false })}>
              Reject
            </Button>
            <Button loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate({ approve: true })}>
              Approve &amp; Verify
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium mb-1.5">Verification Note (optional)</label>
        <textarea
          value={verifyNote}
          onChange={(e) => setVerifyNote(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
          placeholder="Record any notes about the verification…"
        />
        {actionError && <AlertMessage variant="danger" message={actionError} className="mt-3" />}
      </Modal>

      {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditError(null); }}
        title="Edit Member Profile"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button loading={editMutation.isPending} disabled={!editFullName.trim()}
              leftIcon={<Pencil size={14} />}
              onClick={() => editMutation.mutate()}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Personal */}
          <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">Personal Information</p>
          <Input label="Full Name" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Gender" value={editGender} onChange={(e) => setEditGender(e.target.value)}>
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input label="Date of Birth" type="date" value={editDob}
              onChange={(e) => setEditDob(e.target.value)} className="sm:col-span-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            <Input label="Occupation" value={editOccupation} onChange={(e) => setEditOccupation(e.target.value)} />
          </div>

          {/* Address */}
          <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest pt-2">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Region" value={editRegion} onChange={(e) => setEditRegion(e.target.value)} />
            <Input label="Zone"   value={editZone}   onChange={(e) => setEditZone(e.target.value)} />
            <Input label="Woreda" value={editWoreda} onChange={(e) => setEditWoreda(e.target.value)} />
            <Input label="Kebele" value={editKebele} onChange={(e) => setEditKebele(e.target.value)} />
          </div>
          <Input label="Village / House Address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />

          {/* Identification */}
          <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest pt-2">Identification</p>
          <Input label="ID Reference (optional)" value={editIdRef} onChange={(e) => setEditIdRef(e.target.value)} />

          {editError && <AlertMessage variant="danger" message={editError} />}
        </div>
      </Modal>
    </div>
  );
}

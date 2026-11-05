import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Scale, MapPin, FileText, Users, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";
import { Badge } from "../../components/Badge";
import type { CaseType, CommunityMember } from "../../types/api";

/* ─── Static data ──────────────────────────────────────────────────────────── */
const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "MARRIAGE",         label: "Marriage Dispute" },
  { value: "DIVORCE",          label: "Divorce" },
  { value: "LAND_DISPUTE",     label: "Land Dispute" },
  { value: "PROPERTY_DISPUTE", label: "Property Dispute" },
  { value: "DEBT",             label: "Debt" },
  { value: "ASSAULT",          label: "Assault" },
  { value: "DEFAMATION",       label: "Defamation" },
  { value: "OTHER",            label: "Other" },
];

/* ─── Party profile card ────────────────────────────────────────────────────── */
function PartyCard({
  member,
  role,
}: {
  member: CommunityMember;
  role: "Complainant (Plaintiff)" | "Respondent (Defendant)";
}) {
  return (
    <div className="mt-2 border border-[var(--color-line)] rounded-lg p-4 bg-[var(--color-bg)]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
            {member.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--color-ink)]">{member.fullName}</p>
            <p className="text-xs text-[var(--color-muted)]">{role}</p>
          </div>
        </div>
        <Badge
          variant={
            member.verificationStatus === "VERIFIED" ? "success" :
            member.verificationStatus === "REJECTED" ? "danger" : "warning"
          }
          size="sm"
        >
          {member.verificationStatus}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] mt-2">
        {member.phone && (
          <span>📞 {member.phone}</span>
        )}
        {member.kebele && (
          <span>📍 {member.kebele}</span>
        )}
        {member.identificationRef && (
          <span className="col-span-2">🪪 ID: {member.identificationRef}</span>
        )}
      </div>
      {member.verificationStatus !== "VERIFIED" && (
        <p className="mt-2 text-xs text-[var(--color-warning)] flex items-center gap-1">
          <AlertTriangle size={12} />
          This member is not yet verified. Proceedings cannot begin until verification is complete.
        </p>
      )}
    </div>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────────── */
function SectionLabel({ icon, label, step }: { icon: React.ReactNode; label: string; step: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
        {step}
      </span>
      <div className="flex items-center gap-1.5 text-[var(--color-primary)] [&>svg]:w-4 [&>svg]:h-4">
        {icon}
        <span className="font-semibold text-sm uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────────── */
export function NewCasePage() {
  const navigate = useNavigate();

  // Section A — Case information
  const [caseType, setCaseType]           = useState<CaseType>("OTHER");
  const [priority, setPriority]           = useState("NORMAL");
  const [location, setLocation]           = useState("");
  const [description, setDescription]     = useState("");
  const [jurisdictionBasis, setJurisdictionBasis] = useState("");

  // Section B & C — Parties
  const [complainantId, setComplainantId] = useState("");
  const [respondentId, setRespondentId]   = useState("");
  const [memberSearch, setMemberSearch]   = useState("");

  // Section D — Additional
  const [witnessName, setWitnessName]   = useState("");
  const [witnessPhone, setWitnessPhone] = useState("");
  const [notes, setNotes]               = useState("");

  // UI state
  const [error, setError]                 = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting]       = useState(false);

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: membersData, isLoading: membersLoading, isError: membersError, refetch: refetchMembers } = useQuery({
    queryKey: ["community-members", { search: memberSearch }],
    queryFn: () => communityMembersApi.list({
      pageSize: 200,
      search: memberSearch || undefined,
    }),
    staleTime: 5_000,
    retry: 2,
  });

  const allMembers     = membersData?.items ?? [];
  const verifiedMembers = allMembers.filter((m) => m.verificationStatus === "VERIFIED");
  const pendingMembers  = allMembers.filter((m) => m.verificationStatus !== "VERIFIED");

  const complainantMember = allMembers.find((m) => m.id === complainantId) ?? null;
  const respondentMember  = allMembers.find((m) => m.id === respondentId) ?? null;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  /* ── Submit ───────────────────────────────────────────────────────────── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicateWarning(null);

    if (!complainantId) { setError("Complainant (plaintiff) is required."); return; }
    if (!respondentId)  { setError("Respondent (defendant) is required."); return; }
    if (complainantId === respondentId) {
      setError("The complainant and respondent must be different people.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await casesApi.create({
        caseType,
        description,
        location:         location || undefined,
        priority:         priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        jurisdictionBasis: jurisdictionBasis || undefined,
        parties: [
          { communityMemberId: complainantId, roleInCase: "COMPLAINANT" },
          { communityMemberId: respondentId,  roleInCase: "RESPONDENT" },
        ],
      });

      // Show duplicate warning but still navigate (registration succeeded)
      if (result.duplicateWarning) {
        setDuplicateWarning(result.duplicateWarning);
        // Short delay so user can read the warning before redirect
        setTimeout(() => navigate(`/app/cases/${result.case.id}`), 3500);
      } else {
        navigate(`/app/cases/${result.case.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register the case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Register Case"
        subtitle="Register a new dispute with the Oromo Traditional Court of Bale Robe City."
        breadcrumb={[{ label: "Cases", to: "/app/cases" }, { label: "Register Case" }]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}
      {duplicateWarning && (
        <AlertMessage variant="warning" message={duplicateWarning} className="mb-4" />
      )}

      <form onSubmit={handleSubmit} noValidate>

        {/* ── SECTION A: Case Information ──────────────────────────────── */}
        <Card className="mb-5">
          <CardBody className="space-y-4 pt-4">
            <SectionLabel icon={<Scale />} label="Case Information" step="A" />

            {/* Auto-generated case number info */}
            <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-subtle)] px-4 py-3">
              <Info size={15} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--color-primary)]">
                <span className="font-semibold">Case number</span> will be generated automatically
                in the format <span className="font-mono">OTCMS-{new Date().getFullYear()}-XXXX</span>.
              </div>
            </div>

            {/* Registration date (display only) */}
            <Input
              label="Registration Date"
              value={today}
              readOnly
              disabled
              hint="Set automatically to today's date."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Case Type"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value as CaseType)}
                required
              >
                {CASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>

              <Select
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>

            <Input
              label="Case Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Village, Kebele, or area where the dispute occurred"
              leftIcon={<MapPin size={14} />}
            />

            <Input
              label="Jurisdiction Basis (optional)"
              value={jurisdictionBasis}
              onChange={(e) => setJurisdictionBasis(e.target.value)}
              placeholder="Why this court has jurisdiction — e.g. both parties are in Bale Robe Kebele 03"
              hint="Records the legal basis for the court accepting this case (Proclamation 240/2021 Art. 10)."
            />

            <TextArea
              label="Case Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={5}
              placeholder="Describe the dispute in detail — background, what happened, what the complainant is requesting…"
              hint="Minimum 10 characters required."
            />
          </CardBody>
        </Card>

        {/* ── SECTION B: Complainant (Plaintiff) ──────────────────────── */}
        <Card className="mb-5">
          <CardBody className="space-y-4">
            <SectionLabel icon={<Users />} label="Complainant (Plaintiff)" step="B" />

            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              The complainant is the person bringing the dispute to the court.
              They must be a registered community member.
              {" "}
              <Link to="/app/members/new" className="text-[var(--color-primary)] hover:underline font-medium">
                Register a new member →
              </Link>
            </p>

            {/* Live search for members */}
            <Input
              label="Search Members"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Type name to search…"
              hint={
                membersLoading ? "Loading members…" :
                membersError   ? "Could not load members — see error below" :
                `${allMembers.length} member${allMembers.length !== 1 ? "s" : ""} found`
              }
            />

            <Select
              label="Select Complainant"
              value={complainantId}
              onChange={(e) => setComplainantId(e.target.value)}
              required
              error={
                complainantId && complainantId === respondentId
                  ? "Complainant and respondent must be different people"
                  : undefined
              }
            >
              <option value="">— Select complainant —</option>
              {verifiedMembers.length > 0 && (
                <optgroup label="✓ Verified Members">
                  {verifiedMembers
                    .filter((m) => m.id !== respondentId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}{m.kebele ? ` — ${m.kebele}` : ""}</option>
                    ))}
                </optgroup>
              )}
              {pendingMembers.length > 0 && (
                <optgroup label="⚠ Pending Verification">
                  {pendingMembers
                    .filter((m) => m.id !== respondentId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName} (not verified)</option>
                    ))}
                </optgroup>
              )}
            </Select>

    {allMembers.length === 0 && !membersLoading && !membersError && (
              <AlertMessage
                variant="warning"
                message="No community members found. Register a member before registering a case."
              />
            )}
            {membersError && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3">
                <p className="text-sm text-[var(--color-danger)]">
                  Could not load community members. Check that the backend is running and you are logged in.
                </p>
                <Button variant="ghost" size="sm" onClick={() => refetchMembers()} className="text-[var(--color-danger)] ml-3 shrink-0">
                  Retry
                </Button>
              </div>
            )}

            {/* Selected complainant profile card */}
            {complainantMember && (
              <PartyCard member={complainantMember} role="Complainant (Plaintiff)" />
            )}
          </CardBody>
        </Card>

        {/* ── SECTION C: Respondent (Defendant) ───────────────────────── */}
        <Card className="mb-5">
          <CardBody className="space-y-4">
            <SectionLabel icon={<Users />} label="Respondent (Defendant)" step="C" />

            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              The respondent is the person against whom the complaint is made.
              They must also be a registered community member.
            </p>

            <Select
              label="Select Respondent"
              value={respondentId}
              onChange={(e) => setRespondentId(e.target.value)}
              required
              error={
                respondentId && complainantId === respondentId
                  ? "Complainant and respondent must be different people"
                  : undefined
              }
            >
              <option value="">— Select respondent —</option>
              {verifiedMembers.length > 0 && (
                <optgroup label="✓ Verified Members">
                  {verifiedMembers
                    .filter((m) => m.id !== complainantId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}{m.kebele ? ` — ${m.kebele}` : ""}</option>
                    ))}
                </optgroup>
              )}
              {pendingMembers.length > 0 && (
                <optgroup label="⚠ Pending Verification">
                  {pendingMembers
                    .filter((m) => m.id !== complainantId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName} (not verified)</option>
                    ))}
                </optgroup>
              )}
            </Select>

            {/* Selected respondent profile card */}
            {respondentMember && (
              <PartyCard member={respondentMember} role="Respondent (Defendant)" />
            )}
          </CardBody>
        </Card>

        {/* ── SECTION D: Additional Information ───────────────────────── */}
        <Card className="mb-6">
          <CardBody className="space-y-4">
            <SectionLabel icon={<FileText />} label="Additional Information" step="D" />

            <p className="text-xs text-[var(--color-muted)]">
              All fields in this section are optional at registration time.
              Witnesses and documents can also be added after the case is created.
            </p>

            {/* Initial witness */}
            <div className="border border-[var(--color-line)] rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wide">
                Initial Witness (optional)
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                If a witness is already known at registration time, record their details here.
                Additional witnesses can be added from the Case Details page.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Witness Full Name"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  placeholder="Witness full name"
                />
                <Input
                  label="Witness Phone"
                  type="tel"
                  value={witnessPhone}
                  onChange={(e) => setWitnessPhone(e.target.value)}
                  placeholder="Phone number (optional)"
                />
              </div>
            </div>

            {/* Supporting documents note */}
            <div className="border border-[var(--color-line)] rounded-lg p-4">
              <p className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wide mb-1">
                Supporting Documents
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Documents can be uploaded from the <strong>Documents</strong> tab on the Case Details page
                after the case has been registered.
              </p>
            </div>

            {/* Registration notes */}
            <TextArea
              label="Registration Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes for the court record at the time of registration…"
            />
          </CardBody>
        </Card>

        {/* ── Summary before submitting ────────────────────────────────── */}
        {complainantMember && respondentMember && complainantId !== respondentId && (
          <Card className="mb-6 border-[var(--color-success)]/40 bg-[var(--color-success-bg)]">
            <CardBody>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-[var(--color-success)] mb-1">Ready to register</p>
                  <p className="text-[var(--color-ink)] text-xs">
                    <strong>{complainantMember.fullName}</strong> (complainant) vs.{" "}
                    <strong>{respondentMember.fullName}</strong> (respondent) —{" "}
                    {CASE_TYPES.find((t) => t.value === caseType)?.label} case
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/app/cases")}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[var(--color-muted)] hidden sm:block">
              Case number will be assigned automatically.
            </p>
            <Button
              type="submit"
              loading={submitting}
              disabled={
                submitting ||
                !complainantId ||
                !respondentId ||
                !description ||
                complainantId === respondentId
              }
              leftIcon={<Scale size={15} />}
            >
              {submitting ? "Registering…" : "Register Case"}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}

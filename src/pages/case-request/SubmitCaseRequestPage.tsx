import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Send, Info, CheckCircle2, User, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Input, Select, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";
import { useToast } from "../../components/Toast";
import { Badge } from "../../components/Badge";
import type { CaseType } from "../../types/api";

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

export function SubmitCaseRequestPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const { user }  = useAuth();

  // Section 1 — Dispute information
  const [caseType,    setCaseType]    = useState<CaseType>("OTHER");
  const [location,    setLocation]    = useState("");
  const [description, setDescription] = useState("");

  // Section 3 — Opposing party
  const [oppName,    setOppName]    = useState("");
  const [oppPhone,   setOppPhone]   = useState("");
  const [oppKebele,  setOppKebele]  = useState("");
  const [oppAddress, setOppAddress] = useState("");

  // Section 5 — Declaration
  const [declared, setDeclared] = useState(false);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState<{ caseNumber: string; caseId: string } | null>(null);

  // Load the CM's profile linked to this user account via the /me endpoint
  const { data: myProfileData } = useQuery({
    queryKey: ["community-members", "me"],
    queryFn: () => communityMembersApi.me(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const myProfile = myProfileData?.member ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 20) {
      setError("Please describe your dispute in at least 20 characters.");
      return;
    }
    if (!declared) {
      setError("Please confirm the declaration before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await casesApi.create({
        caseType,
        description: description.trim(),
        location:    location.trim() || undefined,
        priority:    "NORMAL",
        isRequest:   true,
        parties:     [],    // Record Officer links the parties during formal registration
        opposingParty: (oppName || oppPhone || oppKebele || oppAddress)
          ? { fullName: oppName || undefined, phone: oppPhone || undefined, kebele: oppKebele || undefined, address: oppAddress || undefined }
          : undefined,
      });

      setSubmitted({ caseNumber: result.case.caseNumber, caseId: result.case.id });
      toast.success("Case request submitted successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your request. Please try again or visit the court office in person.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Request Submitted" />
        <Card>
          <CardBody className="space-y-5 py-8 text-center">
            <CheckCircle2 size={48} className="text-[var(--color-success)] mx-auto" />
            <div>
              <p className="font-display text-xl text-[var(--color-ink)] mb-1">Your request has been received</p>
              <p className="text-sm text-[var(--color-muted)]">Request ID: <span className="font-mono font-semibold text-[var(--color-ink)]">{submitted.caseNumber}</span></p>
            </div>
            <div className="bg-[var(--color-bg)] rounded-lg px-5 py-4 text-sm text-[var(--color-muted)] leading-relaxed text-left">
              <p className="font-semibold text-[var(--color-ink)] mb-1">What happens next?</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>A Record Officer will review your request.</li>
                <li>You will receive a notification when your case is formally registered.</li>
                <li>If additional information is needed, you will be contacted.</li>
                <li>Once registered, the case enters the Court Manager's review process.</li>
              </ol>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => navigate("/app/my-cases")}>View My Cases</Button>
              <Button onClick={() => { setSubmitted(null); setDescription(""); setDeclared(false); }}>Submit Another</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Submit Case Request"
        subtitle="Request assistance from the Oromo Traditional Court of Bale Robe City."
        breadcrumb={[{ label: "My Cases", to: "/app/my-cases" }, { label: "Submit Request" }]}
      />

      {/* How it works */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-muted)] leading-relaxed">
              <p className="font-semibold text-[var(--color-ink)] mb-1">How case requests work</p>
              <p>
                This form sends your dispute request to the court office.
                A Record Officer will review your submission, contact both parties,
                and formally register the case. You will receive a notification when
                your case is registered. Submitting this form does <strong>not</strong> automatically open a court case.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} noValidate>

        {/* Section 1 — Dispute Information */}
        <Card className="mb-4">
          <CardHeader title="1. Dispute Information" icon={<MapPin />} />
          <CardBody className="space-y-4">
            <Select label="Case Type" value={caseType} onChange={(e) => setCaseType(e.target.value as CaseType)} required>
              {CASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>

            <Input
              label="Location of Dispute (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Kebele, village, or area where the dispute occurred"
            />

            <TextArea
              label="Describe Your Dispute"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
              rows={6}
              placeholder="Explain what happened, the background of the dispute, and what you are requesting the court to do. Be as detailed as possible."
              hint={`${description.length} characters${description.length < 20 ? ` — minimum 20` : ""}`}
            />
          </CardBody>
        </Card>

        {/* Section 2 — Requester Information (auto-filled) */}
        <Card className="mb-4">
          <CardHeader title="2. Your Information" icon={<User />} subtitle="Automatically retrieved from your registered profile." />
          <CardBody>
            {myProfile ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Full Name</p>
                  <p className="font-semibold text-[var(--color-ink)]">{myProfile.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Phone</p>
                  <p className="font-semibold text-[var(--color-ink)]">{myProfile.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Kebele</p>
                  <p className="font-semibold text-[var(--color-ink)]">{myProfile.kebele || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Address</p>
                  <p className="font-semibold text-[var(--color-ink)]">{myProfile.address || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Woreda</p>
                  <p className="font-semibold text-[var(--color-ink)]">{myProfile.woreda || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-0.5">Verification</p>
                  <Badge variant={myProfile.verificationStatus === "VERIFIED" ? "success" : "warning"} size="sm">
                    {myProfile.verificationStatus}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-muted)]">Your profile information will be included with this request.</p>
                <p className="text-xs text-[var(--color-muted)]">
                  To update your contact details, visit your{" "}
                  <Link to="/app/settings" className="text-[var(--color-primary)] hover:underline">profile settings</Link>.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Section 3 — Opposing Party */}
        <Card className="mb-4">
          <CardHeader title="3. Opposing Party Information" subtitle="Leave blank if unknown. All fields are optional." />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={oppName}
                onChange={(e) => setOppName(e.target.value)}
                placeholder="Name of the other party"
              />
              <Input
                label="Phone Number"
                type="tel"
                value={oppPhone}
                onChange={(e) => setOppPhone(e.target.value)}
                placeholder="Phone number"
              />
              <Input
                label="Kebele"
                value={oppKebele}
                onChange={(e) => setOppKebele(e.target.value)}
                placeholder="Kebele name or number"
              />
              <Input
                label="Address"
                value={oppAddress}
                onChange={(e) => setOppAddress(e.target.value)}
                placeholder="Village or house address"
              />
            </div>
          </CardBody>
        </Card>

        {/* Section 5 — Declaration */}
        <Card className="mb-6">
          <CardBody>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={declared}
                onChange={(e) => setDeclared(e.target.checked)}
                className="mt-1 w-4 h-4 rounded accent-[var(--color-primary)] shrink-0 cursor-pointer"
              />
              <span className="text-sm text-[var(--color-ink)] leading-relaxed">
                I confirm that the information provided in this request is accurate to the best of my knowledge.
                I understand that providing false information to the Oromo Traditional Court is a serious matter.
              </span>
            </label>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/my-cases")}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={submitting || !declared || description.trim().length < 20}
            leftIcon={<Send size={15} />}
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>

      </form>
    </div>
  );
}

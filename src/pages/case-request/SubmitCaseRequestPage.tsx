import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Info } from "lucide-react";
import { ApiError } from "../../api/client";
import { api } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";
import { useToast } from "../../components/Toast";
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

/**
 * Community Member case request page.
 * This does NOT create a court case directly — it submits a request
 * that the Record Officer reviews and formally registers.
 *
 * Implementation: we use the existing /api/v1/cases endpoint with
 * a "request" flag in the description prefix so the Record Officer
 * can identify and process it. The case starts at SUBMITTED status
 * and the Record Officer reviews it before advancing to UNDER_REVIEW.
 *
 * The community member's communityMemberId is resolved server-side
 * via their userId → CommunityMember lookup (case:view_own scoping
 * already handles this in cases.service.ts).
 */
export function SubmitCaseRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [caseType,       setCaseType]       = useState<CaseType>("OTHER");
  const [description,    setDescription]    = useState("");
  const [opposingName,  setOpposingName]   = useState("");
  const [opposingPhone,  setOpposingPhone]  = useState("");
  const [location,       setLocation]       = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]         = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (description.length < 20) {
      setError("Please describe your dispute in at least 20 characters so the court can understand your request.");
      return;
    }

    setSubmitting(true);
    try {
      // Build a description that includes the request metadata
      // The Record Officer will use this to formally register the case
      const fullDescription = [
        `[CASE REQUEST]`,
        `Opposing party: ${opposingName || "Not identified"}`,
        opposingPhone ? `Opposing phone: ${opposingPhone}` : "",
        `Location: ${location || "Not specified"}`,
        "",
        description,
      ].filter(Boolean).join("\n");

      // Submit as a case — the community member's communityMemberId
      // will be linked by the Record Officer during formal registration.
      // For now, this creates a case record the officer can review.
      await api.post("/cases", {
        caseType,
        description: fullDescription,
        location: location || undefined,
        priority: "NORMAL",
        parties: [], // No parties yet — Record Officer will add them
      });

      toast.success("Your case request has been submitted. The court office will contact you.");
      setTimeout(() => navigate("/app/my-cases"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not submit your request. Please try again or visit the court office in person.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Submit Case Request"
        subtitle="Request assistance from the Oromo Traditional Court for a dispute."
        breadcrumb={[{ label: "My Cases", to: "/app/my-cases" }, { label: "Submit Request" }]}
      />

      {/* Info banner */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--color-muted)] leading-relaxed">
              <p className="font-semibold text-[var(--color-ink)] mb-1">How case requests work</p>
              <p>
                Submitting this form sends a request to the court office. A Record Officer
                will review your request, contact you and the other party, and formally register
                the case. You will receive a notification when your case is registered.
                This request does <strong>not</strong> automatically create a court case.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        <Card className="mb-5">
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-muted)]">
              Dispute Information
            </h2>

            <Select label="Case Type" value={caseType} onChange={(e) => setCaseType(e.target.value as CaseType)} required>
              {CASE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            <Input
              label="Location of Dispute (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where did the dispute occur?"
            />

            <TextArea
              label="Describe Your Dispute"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
              rows={6}
              placeholder="Explain what happened, what the dispute is about, and what you are asking the court to do. Be as detailed as possible."
              hint="Minimum 20 characters."
            />
          </CardBody>
        </Card>

        <Card className="mb-5">
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-muted)]">
              Opposing Party (if known)
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              If you know the name of the person you have a dispute with, provide it here.
              This helps the court office locate and contact them. Leave blank if unknown.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Opposing Party Name (optional)"
                value={opposingName}
                onChange={(e) => setOpposingName(e.target.value)}
                placeholder="Full name of the other party"
              />
              <Input
                label="Opposing Party Phone (optional)"
                type="tel"
                value={opposingPhone}
                onChange={(e) => setOpposingPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/my-cases")}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} leftIcon={<Send size={15} />}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}

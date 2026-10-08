import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";
import type { CaseType } from "../../types/api";

const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "MARRIAGE", label: "Marriage Dispute" },
  { value: "DIVORCE", label: "Divorce" },
  { value: "LAND_DISPUTE", label: "Land Dispute" },
  { value: "PROPERTY_DISPUTE", label: "Property Dispute" },
  { value: "DEBT", label: "Debt" },
  { value: "ASSAULT", label: "Assault" },
  { value: "DEFAMATION", label: "Defamation" },
  { value: "OTHER", label: "Other" },
];

export function NewCasePage() {
  const navigate = useNavigate();
  const [caseType, setCaseType] = useState<CaseType>("OTHER");
  const [priority, setPriority] = useState("NORMAL");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [complainantId, setComplainantId] = useState("");
  const [respondentId, setRespondentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["community-members", "all"],
    queryFn: () => communityMembersApi.list({ pageSize: 200 }),
  });

  // Allow all members, not just verified — some courts register cases first, verify later
  const allMembers = members?.items ?? [];
  const verifiedMembers = allMembers.filter((m) => m.verificationStatus === "VERIFIED");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!complainantId || !respondentId) {
      setError("Both a complainant and a respondent are required.");
      return;
    }
    if (complainantId === respondentId) {
      setError("The complainant and respondent cannot be the same person.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await casesApi.create({
        caseType,
        description,
        location: location || undefined,
        priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        parties: [
          { communityMemberId: complainantId, roleInCase: "COMPLAINANT" },
          { communityMemberId: respondentId, roleInCase: "RESPONDENT" },
        ],
      });
      navigate(`/app/cases/${result.case.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register the case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Register Case"
        subtitle="Register a new case with the Oromo Traditional Court."
        breadcrumb={[{ label: "Cases", to: "/app/cases" }, { label: "Register" }]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardBody className="space-y-4">
            <h2 className="font-medium text-sm text-[var(--color-muted)] uppercase tracking-wide">Case Information</h2>

            <div className="grid grid-cols-2 gap-4">
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
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Village, Kebele, or area name"
            />

            <TextArea
              label="Case Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={5}
              placeholder="Describe the case, the dispute, and the background in detail…"
            />
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardBody className="space-y-4">
            <h2 className="font-medium text-sm text-[var(--color-muted)] uppercase tracking-wide">Parties</h2>
            <p className="text-xs text-[var(--color-muted)]">
              Both parties must be registered community members. Unverified members are listed but should be verified before proceedings begin.
            </p>

            <Select
              label="Complainant (Plaintiff)"
              value={complainantId}
              onChange={(e) => setComplainantId(e.target.value)}
              required
            >
              <option value="">Select complainant…</option>
              {verifiedMembers.length > 0 && (
                <optgroup label="Verified Members">
                  {verifiedMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </optgroup>
              )}
              {allMembers.filter((m) => m.verificationStatus !== "VERIFIED").length > 0 && (
                <optgroup label="Pending Verification">
                  {allMembers
                    .filter((m) => m.verificationStatus !== "VERIFIED")
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName} (pending)</option>
                    ))}
                </optgroup>
              )}
            </Select>

            <Select
              label="Respondent (Defendant)"
              value={respondentId}
              onChange={(e) => setRespondentId(e.target.value)}
              required
            >
              <option value="">Select respondent…</option>
              {verifiedMembers.length > 0 && (
                <optgroup label="Verified Members">
                  {verifiedMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </optgroup>
              )}
              {allMembers.filter((m) => m.verificationStatus !== "VERIFIED").length > 0 && (
                <optgroup label="Pending Verification">
                  {allMembers
                    .filter((m) => m.verificationStatus !== "VERIFIED")
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName} (pending)</option>
                    ))}
                </optgroup>
              )}
            </Select>

            {allMembers.length === 0 && (
              <p className="text-xs text-[var(--color-status-pending)] border border-[var(--color-status-pending)]/30 bg-[var(--color-status-pending)]/5 rounded-sm px-3 py-2">
                No community members found.{" "}
                <Link to="/app/members/new" className="underline">Register a member first</Link>.
              </p>
            )}
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/cases")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register Case"}
          </Button>
        </div>
      </form>
    </div>
  );
}

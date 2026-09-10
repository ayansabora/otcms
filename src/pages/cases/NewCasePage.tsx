import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import type { CaseType } from "../../types/api";

const CASE_TYPES: CaseType[] = [
  "MARRIAGE",
  "DIVORCE",
  "LAND_DISPUTE",
  "PROPERTY_DISPUTE",
  "DEBT",
  "ASSAULT",
  "DEFAMATION",
  "OTHER",
];

export function NewCasePage() {
  const navigate = useNavigate();
  const [caseType, setCaseType] = useState<CaseType>("OTHER");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [complainantId, setComplainantId] = useState("");
  const [respondentId, setRespondentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only VERIFIED members can be added as parties (enforced server-side too).
  const { data: members } = useQuery({
    queryKey: ["community-members", "verified"],
    queryFn: () => communityMembersApi.list({ pageSize: 100 }),
  });
  const verifiedMembers = members?.items.filter((m) => m.verificationStatus === "VERIFIED") ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!complainantId || !respondentId) {
      setError("Both a complainant and a respondent are required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await casesApi.create({
        caseType,
        description,
        location: location || undefined,
        parties: [
          { communityMemberId: complainantId, roleInCase: "COMPLAINANT" },
          { communityMemberId: respondentId, roleInCase: "RESPONDENT" },
        ],
      });
      navigate(`/app/cases/${result.case.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register the case.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl mb-1">Register a case</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">
        Both parties must already be registered and verified community members.
      </p>

      {error && (
        <div className="mb-4 rounded-sm border border-[var(--color-status-danger)]/30 bg-[var(--color-status-danger)]/5 px-3 py-2 text-sm text-[var(--color-status-danger)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--color-line)] rounded-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Case type</label>
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as CaseType)}
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
          >
            {CASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Complainant</label>
          <select
            value={complainantId}
            onChange={(e) => setComplainantId(e.target.value)}
            required
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
          >
            <option value="">Select a verified member…</option>
            {verifiedMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Respondent</label>
          <select
            value={respondentId}
            onChange={(e) => setRespondentId(e.target.value)}
            required
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
          >
            <option value="">Select a verified member…</option>
            {verifiedMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            rows={5}
            className="w-full rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/cases")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register case"}
          </Button>
        </div>
      </form>
    </div>
  );
}

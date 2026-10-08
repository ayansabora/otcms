import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { decisionsApi } from "../../api/decisions";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";

export function RecordDecisionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get("caseId") ?? "";

  const [outcome, setOutcome] = useState("");
  const [description, setDescription] = useState("");
  const [remarks, setRemarks] = useState("");
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().slice(0, 10));
  const [requiredApprovals, setRequiredApprovals] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!caseId) { setError("No case selected."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const result = await decisionsApi.record({
        caseId,
        outcome,
        description,
        remarks: remarks || undefined,
        decisionDate,
        requiredApprovals,
      });
      navigate(`/app/decisions/${result.decision.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record decision.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Record Decision"
        breadcrumb={[
          { label: "Cases", to: "/app/cases" },
          ...(caseId ? [{ label: "Case", to: `/app/cases/${caseId}` }] : []),
          { label: "Record Decision" },
        ]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardBody className="space-y-4">
            <Input
              label="Outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              required
              placeholder="e.g. Land returned to complainant, Reconciliation agreed"
            />
            <TextArea
              label="Decision Details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Full description of the decision reached by the elder panel…"
            />
            <TextArea
              label="Additional Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Any conditions, timeline, or implementation notes…"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Decision Date"
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
              />
              <Input
                label="Elder Approvals Required"
                type="number"
                min={1}
                max={10}
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(Number(e.target.value))}
                hint="Number of elders who must approve"
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Recording…" : "Record Decision"}</Button>
        </div>
      </form>
    </div>
  );
}

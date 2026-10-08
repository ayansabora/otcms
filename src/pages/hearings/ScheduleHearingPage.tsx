import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { hearingsApi } from "../../api/hearings";
import { casesApi } from "../../api/cases";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";

export function ScheduleHearingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId") ?? "";

  const [caseId, setCaseId] = useState(preselectedCaseId);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load cases to populate the case dropdown
  const { data: casesData } = useQuery({
    queryKey: ["cases", "for-hearing"],
    queryFn: () => casesApi.list({ pageSize: 100, status: "ASSIGNED" }),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!caseId) { setError("Please select a case."); return; }
    if (new Date(endTime) <= new Date(startTime)) { setError("End time must be after start time."); return; }
    setSubmitting(true);
    try {
      const result = await hearingsApi.schedule({ caseId, startTime, endTime, location, purpose: purpose || undefined });
      navigate(`/app/hearings/${result.hearing.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule hearing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Schedule Hearing"
        breadcrumb={[{ label: "Hearings", to: "/app/hearings" }, { label: "Schedule" }]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardBody className="space-y-4">
            {preselectedCaseId ? (
              <input type="hidden" value={caseId} />
            ) : (
              <Select label="Case" value={caseId} onChange={(e) => setCaseId(e.target.value)} required>
                <option value="">Select a case…</option>
                {casesData?.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.caseNumber}</option>
                ))}
              </Select>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date & Time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <Input
                label="End Date & Time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Court room or venue" />
            <Input label="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Initial hearing, Witness testimony" />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/hearings")}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Scheduling…" : "Schedule Hearing"}</Button>
        </div>
      </form>
    </div>
  );
}

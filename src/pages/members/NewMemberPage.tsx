import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";

export function NewMemberPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [kebele, setKebele] = useState("");
  const [identificationRef, setIdentificationRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await communityMembersApi.register({
        fullName,
        phone: phone || undefined,
        kebele: kebele || undefined,
        gender: gender || undefined,
        address: address || undefined,
        identificationRef: identificationRef || undefined,
      });
      navigate(`/app/members/${result.member.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to register member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Register Member"
        subtitle="Register a new community member."
        breadcrumb={[{ label: "Community Members", to: "/app/members" }, { label: "Register" }]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardBody className="space-y-4">
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            </div>

            <Input label="Kebele" value={kebele} onChange={(e) => setKebele(e.target.value)} placeholder="Kebele or zone name" />
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            <Input
              label="Identification Reference"
              value={identificationRef}
              onChange={(e) => setIdentificationRef(e.target.value)}
              placeholder="ID card or reference number"
            />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/members")}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register Member"}
          </Button>
        </div>
      </form>
    </div>
  );
}

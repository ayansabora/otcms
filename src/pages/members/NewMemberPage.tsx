import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";

export function NewMemberPage() {
  const navigate = useNavigate();

  const [fullName,          setFullName]          = useState("");
  const [gender,            setGender]            = useState("");
  const [dateOfBirth,       setDateOfBirth]       = useState("");
  const [phone,             setPhone]             = useState("");
  const [occupation,        setOccupation]        = useState("");
  const [region,            setRegion]            = useState("");
  const [zone,              setZone]              = useState("");
  const [woreda,            setWoreda]            = useState("");
  const [kebele,            setKebele]            = useState("");
  const [address,           setAddress]           = useState("");
  const [identificationRef, setIdentificationRef] = useState("");

  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await communityMembersApi.register({
        fullName,
        gender:           gender           || undefined,
        dateOfBirth:      dateOfBirth      || undefined,
        phone:            phone            || undefined,
        occupation:       occupation       || undefined,
        region:           region           || undefined,
        zone:             zone             || undefined,
        woreda:           woreda           || undefined,
        kebele:           kebele           || undefined,
        address:          address          || undefined,
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
    <div className="max-w-2xl">
      <PageHeader
        title="Register Community Member"
        subtitle="Register a new community member of the Oromo Traditional Court jurisdiction."
        breadcrumb={[{ label: "Community Members", to: "/app/members" }, { label: "Register" }]}
      />

      {error && <AlertMessage variant="danger" message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        {/* Personal information */}
        <Card className="mb-5">
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-muted)]">Personal Information</h2>

            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required
              placeholder="Member's full name" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select label="Sex / Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input label="Date of Birth" type="date" value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)} className="sm:col-span-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Phone Number" type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              <Input label="Occupation" value={occupation}
                onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Farmer, Trader, Teacher" />
            </div>
          </CardBody>
        </Card>

        {/* Address */}
        <Card className="mb-5">
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-muted)]">Address Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Region" value={region} onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Oromia" />
              <Input label="Zone" value={zone} onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. Bale" />
              <Input label="Woreda" value={woreda} onChange={(e) => setWoreda(e.target.value)}
                placeholder="e.g. Bale Robe" />
              <Input label="Kebele" value={kebele} onChange={(e) => setKebele(e.target.value)}
                placeholder="Kebele name or number" />
            </div>

            <Input label="Village / House Address" value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Specific village or house address" />
          </CardBody>
        </Card>

        {/* Identification */}
        <Card className="mb-6">
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-muted)]">Identification</h2>
            <Input label="Identification Reference (optional)" value={identificationRef}
              onChange={(e) => setIdentificationRef(e.target.value)}
              placeholder="National ID, Kebele ID, or reference number" />
            <p className="text-xs text-[var(--color-muted)]">
              A Member ID will be assigned automatically after registration.
              The member's initial verification status will be <strong>Pending</strong>.
              A Court Manager or Administrator must verify the member before they can be
              added as a party to a case.
            </p>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/app/members")}>Cancel</Button>
          <Button type="submit" loading={submitting} leftIcon={<UserPlus size={15} />}>
            Register Member
          </Button>
        </div>
      </form>
    </div>
  );
}

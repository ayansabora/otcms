import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Scale, MapPin, FileText, Users, UserPlus, Trash2,
  Info, CheckCircle2, ChevronRight, ChevronLeft,
} from "lucide-react";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input, Select, TextArea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { AlertMessage } from "../../components/ErrorMessage";
import { Badge } from "../../components/Badge";
import { Tabs, TabPanel } from "../../components/Tabs";
import { useAuth } from "../../auth/AuthContext";
import type { CaseType, CommunityMember } from "../../types/api";

/* ─── constants ─────────────────────────────────────────────────────────── */
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

const TABS = [
  { id: "case",       label: "1. Case Info",   icon: <Scale size={14} /> },
  { id: "plaintiff",  label: "2. Plaintiff",   icon: <Users size={14} /> },
  { id: "defendant",  label: "3. Defendant",   icon: <Users size={14} /> },
  { id: "witnesses",  label: "4. Witnesses",   icon: <UserPlus size={14} /> },
  { id: "supporting", label: "5. Supporting",  icon: <FileText size={14} /> },
];

/* ─── Witness row shape ─────────────────────────────────────────────────── */
interface WitnessRow {
  key: number;
  fullName: string;
  sex: string;
  age: string;
  phone: string;
  kebele: string;
  address: string;
  relationshipToCase: string;
  testimonySummary: string;
}

function emptyWitness(key: number): WitnessRow {
  return { key, fullName: "", sex: "", age: "", phone: "", kebele: "", address: "", relationshipToCase: "", testimonySummary: "" };
}

/* ─── Party profile card ─────────────────────────────────────────────────── */
function PartyCard({ member, roleLabel }: { member: CommunityMember; roleLabel: string }) {
  const age = member.dateOfBirth
    ? Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="border border-[var(--color-line)] rounded-xl p-4 bg-[var(--color-bg)] space-y-2.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold shrink-0">
            {member.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-ink)]">{member.fullName}</p>
            <p className="text-xs text-[var(--color-muted)]">{roleLabel}</p>
          </div>
        </div>
        <Badge variant={member.verificationStatus === "VERIFIED" ? "success" : member.verificationStatus === "REJECTED" ? "danger" : "warning"} size="sm">
          {member.verificationStatus}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[var(--color-muted)]">
        {member.gender      && <span>Gender: <strong className="text-[var(--color-ink)]">{member.gender}</strong></span>}
        {age !== null       && <span>Age: <strong className="text-[var(--color-ink)]">{age}</strong></span>}
        {member.phone       && <span>Phone: <strong className="text-[var(--color-ink)]">{member.phone}</strong></span>}
        {member.occupation  && <span>Occupation: <strong className="text-[var(--color-ink)]">{member.occupation}</strong></span>}
        {member.region      && <span>Region: <strong className="text-[var(--color-ink)]">{member.region}</strong></span>}
        {member.zone        && <span>Zone: <strong className="text-[var(--color-ink)]">{member.zone}</strong></span>}
        {member.woreda      && <span>Woreda: <strong className="text-[var(--color-ink)]">{member.woreda}</strong></span>}
        {member.kebele      && <span>Kebele: <strong className="text-[var(--color-ink)]">{member.kebele}</strong></span>}
        {member.identificationRef && <span className="col-span-2">ID: <strong className="text-[var(--color-ink)]">{member.identificationRef}</strong></span>}
      </div>
      {member.verificationStatus !== "VERIFIED" && (
        <p className="text-xs text-[var(--color-warning)] flex items-center gap-1.5 pt-1">
          ⚠ Not yet verified — verification required before case proceedings begin.
        </p>
      )}
    </div>
  );
}

/* ─── Member selector component ─────────────────────────────────────────── */
function MemberSelector({
  label, roleLabel, selectedId, onSelect, excludeId, members, loading, error, onRetry,
}: {
  label: string; roleLabel: string;
  selectedId: string; onSelect: (id: string) => void;
  excludeId?: string;
  members: CommunityMember[]; loading: boolean; error: boolean; onRetry: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = members.filter(
    (m) => m.id !== excludeId && (!search || m.fullName.toLowerCase().includes(search.toLowerCase())),
  );
  const verified = filtered.filter((m) => m.verificationStatus === "VERIFIED");
  const pending  = filtered.filter((m) => m.verificationStatus !== "VERIFIED");
  const selected = members.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-subtle)] px-4 py-3">
        <Info size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--color-primary)]">
          {label} must be a registered community member.{" "}
          <Link to="/app/members/new" target="_blank" className="font-semibold underline">
            Register a new member →
          </Link>
        </p>
      </div>

      <Input
        label="Search by name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Type to filter…"
      />

      {error ? (
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3.5 space-y-2">
          <p className="text-sm font-semibold text-[var(--color-danger)]">Could not load community members</p>
          <p className="text-xs text-[var(--color-danger)]/80 leading-relaxed">
            Possible causes:
            <br />• The backend server is not running — start it with <code className="font-mono bg-[var(--color-danger)]/10 px-1 rounded">npm run dev</code> in the <code className="font-mono bg-[var(--color-danger)]/10 px-1 rounded">backend/</code> folder.
            <br />• Your session has expired — try logging out and back in.
          </p>
          <Button variant="ghost" size="sm" onClick={onRetry} className="text-[var(--color-danger)]">
            Try Again
          </Button>
        </div>
      ) : (
        <Select
          label={label}
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          required
          hint={loading ? "Loading members…" : `${filtered.length} member${filtered.length !== 1 ? "s" : ""} available`}
        >
          <option value="">— Select {label.toLowerCase()} —</option>
          {verified.length > 0 && (
            <optgroup label="✓ Verified">
              {verified.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}{m.woreda ? ` — ${m.woreda}` : m.kebele ? ` — ${m.kebele}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {pending.length > 0 && (
            <optgroup label="⚠ Pending Verification">
              {pending.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} (not verified)</option>
              ))}
            </optgroup>
          )}
        </Select>
      )}

      {!loading && !error && filtered.length === 0 && (
        <AlertMessage variant="warning" message="No members match. Register a community member first." />
      )}

      {selected && <PartyCard member={selected} roleLabel={roleLabel} />}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export function NewCasePage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { user }    = useAuth();
  const [activeTab, setActiveTab] = useState("case");

  // ── Tab 1: Case Info ───────────────────────────────────────────────────
  const [caseType,          setCaseType]          = useState<CaseType>("OTHER");
  const [title,             setTitle]             = useState("");
  const [priority,          setPriority]          = useState("NORMAL");
  const [location,          setLocation]          = useState("");
  const [description,       setDescription]       = useState("");
  const [jurisdictionBasis, setJurisdictionBasis] = useState("");

  // ── Tab 2 & 3: Parties ────────────────────────────────────────────────
  const [complainants, setComplainants] = useState<string[]>([""]);
  const [respondents,  setRespondents]  = useState<string[]>([""]);

  // ── Tab 4: Witnesses ──────────────────────────────────────────────────
  const [witnesses, setWitnesses] = useState<WitnessRow[]>([emptyWitness(1)]);
  let   nextKey = witnesses.length + 2;

  // ── Tab 5: Supporting ─────────────────────────────────────────────────
  const [notes, setNotes] = useState("");

  // ── UI ────────────────────────────────────────────────────────────────
  const [error,            setError]            = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting,       setSubmitting]        = useState(false);

  // ── Members query — only fires once auth is confirmed ────────────────
  const { data: membersData, isLoading, isError, refetch } = useQuery({
    queryKey: ["community-members", { search: "" }],
    queryFn:  () => communityMembersApi.list({ pageSize: 500 }),
    enabled:  !!user,   // wait for the user session to be established
    staleTime: 5_000,
    retry: 2,
  });
  const allMembers = membersData?.items ?? [];

  // ── Helpers ───────────────────────────────────────────────────────────
  function addComplainant()       { setComplainants((p) => [...p, ""]); }
  function removeComplainant(i: number) { setComplainants((p) => p.filter((_, idx) => idx !== i)); }
  function setComplainant(i: number, v: string) { setComplainants((p) => p.map((c, idx) => idx === i ? v : c)); }

  function addRespondent()        { setRespondents((p) => [...p, ""]); }
  function removeRespondent(i: number) { setRespondents((p) => p.filter((_, idx) => idx !== i)); }
  function setRespondent(i: number, v: string) { setRespondents((p) => p.map((r, idx) => idx === i ? v : r)); }

  function addWitness()           { setWitnesses((p) => [...p, emptyWitness(nextKey++)]); }
  function removeWitness(key: number) { setWitnesses((p) => p.filter((w) => w.key !== key)); }
  function setWitnessField(key: number, field: keyof WitnessRow, val: string) {
    setWitnesses((p) => p.map((w) => w.key === key ? { ...w, [field]: val } : w));
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  // ── Validation ────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!description || description.length < 10) return "Case description must be at least 10 characters.";
    const filledC = complainants.filter(Boolean);
    const filledR = respondents.filter(Boolean);
    if (filledC.length === 0) return "At least one complainant (plaintiff) is required.";
    if (filledR.length === 0) return "At least one respondent (defendant) is required.";
    const cSet = new Set(filledC);
    const rSet = new Set(filledR);
    for (const id of filledC) { if (rSet.has(id)) return "The same person cannot be both a complainant and a respondent."; }
    if (cSet.size !== filledC.length) return "Duplicate complainants are not allowed.";
    if (rSet.size !== filledR.length) return "Duplicate respondents are not allowed.";
    for (const w of witnesses) {
      if (w.fullName && w.fullName.length < 2) return `Witness name "${w.fullName}" is too short.`;
    }
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setDuplicateWarning(null);

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    const parties = [
      ...complainants.filter(Boolean).map((id) => ({ communityMemberId: id, roleInCase: "COMPLAINANT" as const })),
      ...respondents.filter(Boolean).map((id)  => ({ communityMemberId: id, roleInCase: "RESPONDENT" as const })),
    ];

    const witnessPayload = witnesses
      .filter((w) => w.fullName.trim().length >= 2)
      .map((w) => ({
        fullName:           w.fullName.trim(),
        sex:                w.sex || undefined,
        age:                w.age ? parseInt(w.age, 10) : undefined,
        phone:              w.phone || undefined,
        relationshipToCase: w.relationshipToCase || undefined,
        testimonySummary:   w.testimonySummary || undefined,
      }));

    setSubmitting(true);
    try {
      const result = await casesApi.create({
        caseType,
        title:             title || undefined,
        description,
        location:          location || undefined,
        priority:          priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        jurisdictionBasis: jurisdictionBasis || undefined,
        parties,
        witnesses:         witnessPayload.length > 0 ? witnessPayload : undefined,
      });

      // Invalidate member cache so updated member list is fresh
      queryClient.invalidateQueries({ queryKey: ["community-members"] });

      if (result.duplicateWarning) {
        setDuplicateWarning(result.duplicateWarning);
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

  // ── Tab navigation helpers ────────────────────────────────────────────
  const TAB_IDS = TABS.map((t) => t.id);
  function goNext() { const i = TAB_IDS.indexOf(activeTab); if (i < TAB_IDS.length - 1) setActiveTab(TAB_IDS[i + 1]!); }
  function goPrev() { const i = TAB_IDS.indexOf(activeTab); if (i > 0) setActiveTab(TAB_IDS[i - 1]!); }
  const isLastTab  = activeTab === TAB_IDS[TAB_IDS.length - 1];
  const isFirstTab = activeTab === TAB_IDS[0];

  // ── Summary ready check ───────────────────────────────────────────────
  const filledComplainants = complainants.filter(Boolean);
  const filledRespondents  = respondents.filter(Boolean);
  const isReadyToSubmit    = description.length >= 10 && filledComplainants.length > 0 && filledRespondents.length > 0;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Register Case"
        subtitle="Register a new dispute with the Oromo Traditional Court of Bale Robe City."
        breadcrumb={[{ label: "Cases", to: "/app/cases" }, { label: "Register Case" }]}
      />

      {error            && <AlertMessage variant="danger"  message={error}            className="mb-4" />}
      {duplicateWarning && <AlertMessage variant="warning" message={duplicateWarning} className="mb-4" />}

      <form onSubmit={handleSubmit} noValidate>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} className="mb-5" />

        {/* ══ TAB 1: CASE INFORMATION ══════════════════════════════════════ */}
        <TabPanel id="case" active={activeTab}>
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-[var(--color-primary-subtle)] px-4 py-3">
                <Info size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--color-primary)]">
                  Case ID generated automatically: <span className="font-mono font-semibold">OTCMS-{new Date().getFullYear()}-XXXX</span>
                </p>
              </div>

              <Input label="Registration Date" value={today} readOnly disabled hint="Set automatically." />

              <Input
                label="Case Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title — e.g. Land boundary dispute in Kebele 03"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Case Type" value={caseType} onChange={(e) => setCaseType(e.target.value as CaseType)} required>
                  {CASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
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
                placeholder="Why this court has jurisdiction — Proclamation 240/2021 Art. 10"
              />

              <TextArea
                label="Case Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
                rows={5}
                placeholder="Describe the dispute in detail — background, events, and what the complainant is requesting…"
                hint="Minimum 10 characters. Be as detailed as possible."
              />
            </CardBody>
          </Card>
        </TabPanel>

        {/* ══ TAB 2: PLAINTIFF (COMPLAINANT) ═══════════════════════════════ */}
        <TabPanel id="plaintiff" active={activeTab}>
          <Card>
            <CardBody className="space-y-5">
              <div>
                <h2 className="font-display text-lg text-[var(--color-ink)]">Plaintiff Information</h2>
                <p className="text-sm text-[var(--color-muted)] mt-0.5">
                  The plaintiff is the person bringing the complaint to the court.
                  You may add multiple plaintiffs if the case involves more than one complainant.
                </p>
              </div>

              {complainants.map((id, i) => (
                <div key={i} className="space-y-3">
                  {complainants.length > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                        Plaintiff {i + 1}
                      </p>
                      <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />}
                        className="text-[var(--color-danger)]"
                        onClick={() => removeComplainant(i)} type="button">
                        Remove
                      </Button>
                    </div>
                  )}
                  <MemberSelector
                    label={`Plaintiff ${complainants.length > 1 ? i + 1 : ""}`}
                    roleLabel="Complainant (Plaintiff)"
                    selectedId={id}
                    onSelect={(v) => setComplainant(i, v)}
                    excludeId={respondents.find(Boolean)}
                    members={allMembers}
                    loading={isLoading}
                    error={isError}
                    onRetry={() => refetch()}
                  />
                  {i < complainants.length - 1 && <hr className="border-[var(--color-line)]" />}
                </div>
              ))}

              <Button type="button" variant="secondary" leftIcon={<UserPlus size={15} />} onClick={addComplainant}>
                + Add Another Plaintiff
              </Button>
            </CardBody>
          </Card>
        </TabPanel>

        {/* ══ TAB 3: DEFENDANT (RESPONDENT) ════════════════════════════════ */}
        <TabPanel id="defendant" active={activeTab}>
          <Card>
            <CardBody className="space-y-5">
              <div>
                <h2 className="font-display text-lg text-[var(--color-ink)]">Defendant Information</h2>
                <p className="text-sm text-[var(--color-muted)] mt-0.5">
                  The defendant is the person against whom the complaint is made.
                  You may add multiple defendants if required.
                </p>
              </div>

              {respondents.map((id, i) => (
                <div key={i} className="space-y-3">
                  {respondents.length > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                        Defendant {i + 1}
                      </p>
                      <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />}
                        className="text-[var(--color-danger)]"
                        onClick={() => removeRespondent(i)} type="button">
                        Remove
                      </Button>
                    </div>
                  )}
                  <MemberSelector
                    label={`Defendant ${respondents.length > 1 ? i + 1 : ""}`}
                    roleLabel="Respondent (Defendant)"
                    selectedId={id}
                    onSelect={(v) => setRespondent(i, v)}
                    excludeId={complainants.find(Boolean)}
                    members={allMembers}
                    loading={isLoading}
                    error={isError}
                    onRetry={() => refetch()}
                  />
                  {i < respondents.length - 1 && <hr className="border-[var(--color-line)]" />}
                </div>
              ))}

              <Button type="button" variant="secondary" leftIcon={<UserPlus size={15} />} onClick={addRespondent}>
                + Add Another Defendant
              </Button>
            </CardBody>
          </Card>
        </TabPanel>

        {/* ══ TAB 4: WITNESSES ═════════════════════════════════════════════ */}
        <TabPanel id="witnesses" active={activeTab}>
          <Card>
            <CardBody className="space-y-5">
              <div>
                <h2 className="font-display text-lg text-[var(--color-ink)]">Witness Information</h2>
                <p className="text-sm text-[var(--color-muted)] mt-0.5">
                  Record all known witnesses at registration time. Additional witnesses can be added later
                  from the Case Details page. All fields are optional — enter only what is known.
                </p>
              </div>

              {witnesses.map((w, i) => (
                <div key={w.key} className="border border-[var(--color-line)] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-[var(--color-ink)]">Witness {i + 1}</p>
                    {witnesses.length > 1 && (
                      <Button type="button" variant="ghost" size="sm"
                        leftIcon={<Trash2 size={13} />}
                        className="text-[var(--color-danger)]"
                        onClick={() => removeWitness(w.key)}>
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Full Name" value={w.fullName} required={i === 0}
                      onChange={(e) => setWitnessField(w.key, "fullName", e.target.value)}
                      placeholder="Witness full name" />
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Sex" value={w.sex} onChange={(e) => setWitnessField(w.key, "sex", e.target.value)}>
                        <option value="">—</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Select>
                      <Input label="Age" type="number" min={0} max={120} value={w.age}
                        onChange={(e) => setWitnessField(w.key, "age", e.target.value)}
                        placeholder="Age" />
                    </div>
                    <Input label="Phone" type="tel" value={w.phone}
                      onChange={(e) => setWitnessField(w.key, "phone", e.target.value)}
                      placeholder="Phone number" />
                    <Input label="Kebele" value={w.kebele}
                      onChange={(e) => setWitnessField(w.key, "kebele", e.target.value)}
                      placeholder="Kebele" />
                    <Input label="Address" value={w.address}
                      onChange={(e) => setWitnessField(w.key, "address", e.target.value)}
                      placeholder="Village / house address"
                      className="sm:col-span-2" />
                    <Input label="Relationship to Case" value={w.relationshipToCase}
                      onChange={(e) => setWitnessField(w.key, "relationshipToCase", e.target.value)}
                      placeholder="e.g. Neighbour, Family friend, Eyewitness"
                      className="sm:col-span-2" />
                  </div>
                  <TextArea label="Witness Statement / Description" value={w.testimonySummary}
                    onChange={(e) => setWitnessField(w.key, "testimonySummary", e.target.value)}
                    rows={3}
                    placeholder="Brief summary of what this witness knows or observed…" />
                </div>
              ))}

              <Button type="button" variant="secondary" leftIcon={<UserPlus size={15} />} onClick={addWitness}>
                + Add Another Witness
              </Button>
            </CardBody>
          </Card>
        </TabPanel>

        {/* ══ TAB 5: SUPPORTING DOCUMENTS & NOTES ══════════════════════════ */}
        <TabPanel id="supporting" active={activeTab}>
          <Card>
            <CardBody className="space-y-5">
              <div>
                <h2 className="font-display text-lg text-[var(--color-ink)]">Supporting Information</h2>
                <p className="text-sm text-[var(--color-muted)] mt-0.5">
                  Add any additional notes at registration time. Supporting documents (ID copies, evidence files)
                  can be uploaded from the <strong>Documents</strong> tab after the case is created.
                </p>
              </div>

              <div className="border border-dashed border-[var(--color-line-strong)] rounded-xl p-6 flex flex-col items-center gap-3 text-center bg-[var(--color-bg)]">
                <FileText size={32} className="text-[var(--color-faint)]" />
                <div>
                  <p className="font-medium text-sm text-[var(--color-ink)]">Document upload available after registration</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    After saving this case, go to Case Details → Documents tab to upload plaintiff documents,
                    defendant documents, witness statements, and evidence files.
                  </p>
                </div>
              </div>

              <TextArea
                label="Registration Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Any additional notes for the court record at registration time…"
              />

              {/* Ready-to-submit summary */}
              {isReadyToSubmit && (
                <div className="border border-[var(--color-success)]/40 bg-[var(--color-success-bg)] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-[var(--color-success)] mb-1">Ready to register</p>
                      <p className="text-xs text-[var(--color-ink)]">
                        <span className="font-medium">{filledComplainants.length} plaintiff{filledComplainants.length > 1 ? "s" : ""}</span>
                        {" · "}
                        <span className="font-medium">{filledRespondents.length} defendant{filledRespondents.length > 1 ? "s" : ""}</span>
                        {" · "}
                        {witnesses.filter((w) => w.fullName.trim()).length} witness{witnesses.filter((w) => w.fullName.trim()).length !== 1 ? "es" : ""}
                        {" · "}
                        {CASE_TYPES.find((t) => t.value === caseType)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        {/* ── Navigation buttons ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {!isFirstTab && (
              <Button type="button" variant="secondary" leftIcon={<ChevronLeft size={15} />} onClick={goPrev}>
                Previous
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => navigate("/app/cases")}>
              Cancel
            </Button>
          </div>

          <div className="flex gap-2">
            {!isLastTab && (
              <Button type="button" rightIcon={<ChevronRight size={15} />} onClick={goNext}>
                Next
              </Button>
            )}
            {isLastTab && (
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !isReadyToSubmit}
                leftIcon={<Scale size={15} />}
              >
                {submitting ? "Registering…" : "Register Case"}
              </Button>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}

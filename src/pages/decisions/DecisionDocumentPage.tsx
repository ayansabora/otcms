import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, FileText } from "lucide-react";
import { decisionsApi } from "../../api/decisions";
import { Button } from "../../components/Button";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useAuth } from "../../auth/AuthContext";

const COURT_NAME = "Oromo Traditional Court";
const COURT_LOCATION = "Bale Robe City, Oromia, Ethiopia";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function DecisionDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["decision-document", id],
    queryFn: () => decisionsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageLoading message="Loading decision document…" />;
  if (isError || !data) return <ErrorMessage message="Decision not found or you do not have permission to view it." />;

  const dec = data.decision;
  const c = dec.case;

  // Only show the document for approved decisions
  if (dec.approvalStatus !== "APPROVED") {
    return (
      <div className="max-w-3xl">
        <ErrorMessage message="This decision has not been finalized. Only approved decisions can be printed as official documents." />
        <Button variant="secondary" className="mt-4" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  const plaintiff = c?.parties?.find((p) => p.roleInCase === "COMPLAINANT");
  const defendant = c?.parties?.find((p) => p.roleInCase === "RESPONDENT");
  const completedHearings = c?.hearings?.filter((h) => h.status === "COMPLETED") ?? [];
  const panelElders = c?.assignments ?? [];
  const approvals = dec.approvals ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen-only toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="secondary" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate(`/app/decisions/${id}`)}>
          Back to Decision
        </Button>
        <div className="flex gap-3">
          <Button leftIcon={<Printer size={15} />} onClick={() => window.print()}>
            Print Decision
          </Button>
        </div>
      </div>

      {/* A4 Document */}
      <div
        className="decision-document bg-white mx-auto"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "15mm 20mm",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          fontFamily: "var(--font-sans)",
          color: "#1F2933",
          fontSize: "13px",
          lineHeight: "1.7",
        }}
      >
        {/* ─── Header ─── */}
        <div className="text-center mb-8">
          <div className="text-xs tracking-[0.3em] uppercase text-[#667085] mb-1">
            {COURT_LOCATION}
          </div>
          <h1
            className="text-2xl font-bold text-[#173B6C] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {COURT_NAME}
          </h1>
          <div className="w-32 h-0.5 bg-[#C9A227] mx-auto mb-3" />
          <h2
            className="text-lg font-semibold tracking-[0.15em] uppercase text-[#173B6C]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Court Decision
          </h2>
        </div>

        {/* ─── Decision Reference ─── */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 mb-6">
          <div>
            <span className="text-xs text-[#667085] uppercase tracking-wide">Decision Ref:</span>{" "}
            <span className="font-mono font-semibold text-[#1F2933]">{dec.id.slice(0, 12).toUpperCase()}</span>
          </div>
          <div>
            <span className="text-xs text-[#667085] uppercase tracking-wide">Generated:</span>{" "}
            <span className="text-[#1F2933]">{formatDate(new Date().toISOString())}</span>
          </div>
        </div>

        {/* ─── Case Information Table ─── */}
        <table className="w-full mb-6 border-collapse">
          <tbody>
            <tr className="border-b border-[#E5E7EB]">
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide w-32">Case Number</td>
              <td className="py-2 text-[#1F2933] font-mono font-semibold">{c?.caseNumber ?? "—"}</td>
            </tr>
            <tr className="border-b border-[#E5E7EB]">
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Case Type</td>
              <td className="py-2 text-[#1F2933] capitalize">{c?.caseType?.replace(/_/g, " ").toLowerCase() ?? "—"}</td>
            </tr>
            {c?.title && (
              <tr className="border-b border-[#E5E7EB]">
                <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Case Title</td>
                <td className="py-2 text-[#1F2933]">{c.title}</td>
              </tr>
            )}
            <tr className="border-b border-[#E5E7EB]">
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Plaintiff</td>
              <td className="py-2 text-[#1F2933]">
                {plaintiff?.communityMember?.fullName ?? "—"}
                {plaintiff?.communityMember?.address && (
                  <span className="text-xs text-[#667085] ml-2">({plaintiff.communityMember.address})</span>
                )}
              </td>
            </tr>
            <tr className="border-b border-[#E5E7EB]">
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Defendant</td>
              <td className="py-2 text-[#1F2933]">
                {defendant?.communityMember?.fullName ?? "—"}
                {defendant?.communityMember?.address && (
                  <span className="text-xs text-[#667085] ml-2">({defendant.communityMember.address})</span>
                )}
              </td>
            </tr>
            {c?.location && (
              <tr className="border-b border-[#E5E7EB]">
                <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Case Location</td>
                <td className="py-2 text-[#1F2933]">{c.location}</td>
              </tr>
            )}
            {completedHearings.length > 0 && (
              <tr className="border-b border-[#E5E7EB]">
                <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Hearing Date(s)</td>
                <td className="py-2 text-[#1F2933]">
                  {completedHearings.map((h, i) => (
                    <span key={h.id}>
                      {i > 0 && ", "}
                      {formatDate(h.startTime)}
                    </span>
                  ))}
                </td>
              </tr>
            )}
            <tr className="border-b border-[#E5E7EB]">
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Decision Date</td>
              <td className="py-2 text-[#1F2933]">{formatDate(dec.decisionDate)}</td>
            </tr>
            <tr className="border-b border-[#E5E7EB]">
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Decision Type</td>
              <td className="py-2 text-[#1F2933] capitalize">
                {dec.decisionType === "RECONCILIATION"
                  ? "Reconciliation (Mutual Agreement — Jaarsummaa)"
                  : "Ruling (Elder Panel Judgment)"}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-xs font-semibold text-[#667085] uppercase tracking-wide">Status</td>
              <td className="py-2 text-[#1F2933] font-semibold">
                {dec.approvalStatus === "APPROVED"
                  ? "Finalized & Approved"
                  : dec.approvalStatus}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ─── Decision Outcome ─── */}
        <div className="mb-6">
          <h3
            className="text-sm font-bold text-[#173B6C] uppercase tracking-wide mb-2 pb-1 border-b-2 border-[#C9A227]/30"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Decision Outcome
          </h3>
          <p className="text-[#1F2933] font-medium">{dec.outcome}</p>
        </div>

        {/* ─── Decision Description ─── */}
        <div className="mb-6">
          <h3
            className="text-sm font-bold text-[#173B6C] uppercase tracking-wide mb-2 pb-1 border-b-2 border-[#C9A227]/30"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Decision Description & Reasons
          </h3>
          <p className="text-[#1F2933] whitespace-pre-wrap leading-relaxed">{dec.description}</p>
        </div>

        {/* ─── Remarks ─── */}
        {dec.remarks && (
          <div className="mb-6">
            <h3
              className="text-sm font-bold text-[#173B6C] uppercase tracking-wide mb-2 pb-1 border-b-2 border-[#C9A227]/30"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Additional Remarks
            </h3>
            <p className="text-[#1F2933] whitespace-pre-wrap">{dec.remarks}</p>
          </div>
        )}

        {/* ─── Elder Panel ─── */}
        {panelElders.length > 0 && (
          <div className="mb-6">
            <h3
              className="text-sm font-bold text-[#173B6C] uppercase tracking-wide mb-3 pb-1 border-b-2 border-[#C9A227]/30"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Elder Panel
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left text-xs font-semibold text-[#667085] uppercase py-2">Name</th>
                  <th className="text-left text-xs font-semibold text-[#667085] uppercase py-2">Role</th>
                  <th className="text-left text-xs font-semibold text-[#667085] uppercase py-2">Approval</th>
                </tr>
              </thead>
              <tbody>
                {panelElders.map((a) => {
                  const approval = approvals.find((ap) => ap.userId === a.userId);
                  return (
                    <tr key={a.id} className="border-b border-[#E5E7EB]">
                      <td className="py-2 text-[#1F2933]">{a.user.fullName}</td>
                      <td className="py-2 text-[#667085]">{a.roleInPanel === "LEAD" ? "Lead Elder" : "Panel Member"}</td>
                      <td className="py-2">
                        {approval ? (
                          <span className={approval.approved ? "text-[#16794c] font-medium" : "text-[#b91c1c] font-medium"}>
                            {approval.approved ? "Approved" : "Rejected"}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Signature Areas ─── */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          {panelElders.slice(0, 2).map((a) => (
            <div key={a.id}>
              <div className="h-16 border-b border-[#1F2933]" />
              <p className="text-xs text-[#667085] mt-1">{a.roleInPanel === "LEAD" ? "Lead Elder" : "Panel Member"}</p>
              <p className="text-sm font-medium text-[#1F2933] mt-0.5">{a.user.fullName}</p>
              <p className="text-xs text-[#667085]">Signature & Date</p>
            </div>
          ))}
        </div>

        {plaintiff && defendant && (
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div>
              <div className="h-16 border-b border-[#1F2933]" />
              <p className="text-xs text-[#667085] mt-1">Plaintiff</p>
              <p className="text-sm font-medium text-[#1F2933] mt-0.5">{plaintiff.communityMember?.fullName}</p>
              <p className="text-xs text-[#667085]">Signature & Date</p>
            </div>
            <div>
              <div className="h-16 border-b border-[#1F2933]" />
              <p className="text-xs text-[#667085] mt-1">Defendant</p>
              <p className="text-sm font-medium text-[#1F2933] mt-0.5">{defendant.communityMember?.fullName}</p>
              <p className="text-xs text-[#667085]">Signature & Date</p>
            </div>
          </div>
        )}

        {/* ─── Recording Officer ─── */}
        <div className="mt-8">
          <div className="h-16 border-b border-[#1F2933] w-1/2" />
          <p className="text-xs text-[#667085] mt-1">Recording Officer</p>
          <p className="text-sm font-medium text-[#1F2933] mt-0.5">{user?.fullName ?? "—"}</p>
          <p className="text-xs text-[#667085]">Confirmation Signature & Date</p>
        </div>

        {/* ─── Footer ─── */}
        <div className="mt-10 pt-4 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            This document was generated by the Oromo Traditional Court Management System (OTCMS) ·{" "}
            {formatDate(new Date().toISOString())} · Page 1
          </p>
          <p className="text-[10px] text-[#9CA3AF] mt-1">
            Proclamation 240/2021 · Gadaa Traditional Justice System · {COURT_LOCATION}
          </p>
        </div>
      </div>

      {/* Screen-only info */}
      <div className="mt-6 text-center print:hidden">
        <p className="text-xs text-[var(--color-muted)] flex items-center justify-center gap-1.5">
          <FileText size={12} />
          This is a preview of the official court decision document.
          Use "Print Decision" to print or save as PDF (select "Save as PDF" in the print dialog).
        </p>
      </div>
    </div>
  );
}

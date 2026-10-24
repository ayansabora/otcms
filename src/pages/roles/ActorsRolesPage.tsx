import {
  ShieldCheck,
  Scale,
  ClipboardList,
  Users,
  LayoutDashboard,
  FolderOpen,
  Calendar,
  ScrollText,
  BarChart3,
  UserCheck,
  FilePlus,
  BookOpen,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ActorCard {
  role: string;
  displayName: string;
  icon: React.ReactNode;
  color: string;         // CSS variable or hex for the accent
  bgColor: string;
  description: string;
  responsibilities: string[];
  access: { icon: React.ReactNode; label: string }[];
}

/* ── Actor definitions ───────────────────────────────────────────────────── */
const ACTORS: ActorCard[] = [
  {
    role: "ADMIN",
    displayName: "System Administrator",
    icon: <ShieldCheck size={28} />,
    color: "var(--color-primary)",
    bgColor: "var(--color-primary-subtle)",
    description:
      "The System Administrator has full control over the OTCMS platform. They are responsible for keeping the system secure, managing all user accounts, and ensuring that every staff member has the correct access to do their work.",
    responsibilities: [
      "Create, update, and deactivate user accounts",
      "Assign and revoke roles and permissions",
      "Monitor system activity through audit logs",
      "Maintain system security and data integrity",
      "Troubleshoot technical problems",
      "Manage system settings and configuration",
      "Ensure only authorized personnel access sensitive data",
    ],
    access: [
      { icon: <LayoutDashboard size={14} />, label: "Dashboard" },
      { icon: <Users size={14} />,           label: "User Management" },
      { icon: <ShieldCheck size={14} />,     label: "Roles & Permissions" },
      { icon: <ClipboardList size={14} />,   label: "Audit Logs" },
      { icon: <FolderOpen size={14} />,      label: "Documents" },
      { icon: <BarChart3 size={14} />,       label: "Reports" },
    ],
  },
  {
    role: "COURT_MANAGER",
    displayName: "Court Manager",
    icon: <Scale size={28} />,
    color: "var(--color-info)",
    bgColor: "var(--color-info-bg)",
    description:
      "The Court Manager oversees all court operations. They coordinate hearings, monitor case progress, review decisions, and ensure the traditional court runs efficiently and fairly.",
    responsibilities: [
      "View and monitor all registered cases",
      "Organize and coordinate hearing schedules",
      "Monitor case progress and status changes",
      "Review and approve case-related documents",
      "Review decisions and community agreements",
      "Verify community member information",
      "View court activity reports and statistics",
      "Transition cases through workflow stages",
    ],
    access: [
      { icon: <LayoutDashboard size={14} />, label: "Dashboard" },
      { icon: <Scale size={14} />,           label: "Cases" },
      { icon: <Calendar size={14} />,        label: "Hearings" },
      { icon: <ScrollText size={14} />,      label: "Decisions" },
      { icon: <FolderOpen size={14} />,      label: "Documents" },
      { icon: <BarChart3 size={14} />,       label: "Reports" },
    ],
  },
  {
    role: "RECORD_OFFICER",
    displayName: "Record Officer",
    icon: <ClipboardList size={28} />,
    color: "var(--color-warning)",
    bgColor: "var(--color-warning-bg)",
    description:
      "The Record Officer is the primary data entry role in the system. They register new cases, record all parties involved, upload supporting documents, and keep case records accurate and up to date throughout the court process.",
    responsibilities: [
      "Register new court cases",
      "Enter plaintiff and defendant information",
      "Record case types and dispute descriptions",
      "Register and update community member profiles",
      "Upload and manage case documents",
      "Track and update case status and progress",
      "Record authorized decisions and community agreements",
      "Schedule and manage court hearings",
      "Assign cases to appropriate panels",
      "Prepare and access relevant reports",
    ],
    access: [
      { icon: <LayoutDashboard size={14} />, label: "Dashboard" },
      { icon: <FilePlus size={14} />,        label: "Case Registration" },
      { icon: <Scale size={14} />,           label: "Case Records" },
      { icon: <UserCheck size={14} />,       label: "Community Members" },
      { icon: <Calendar size={14} />,        label: "Hearings" },
      { icon: <FolderOpen size={14} />,      label: "Documents" },
      { icon: <BookOpen size={14} />,        label: "Decision Recording" },
      { icon: <BarChart3 size={14} />,       label: "Reports" },
    ],
  },
  {
    role: "COMMUNITY_MEMBER",
    displayName: "Community Member",
    icon: <Users size={28} />,
    color: "var(--color-success)",
    bgColor: "var(--color-success-bg)",
    description:
      "Community Members are the plaintiffs and defendants who bring disputes to the Oromo Traditional Court. Court staff register their information on their behalf. Where the system permits, they may access authorized information about their own cases.",
    responsibilities: [
      "Bring complaints and disputes to the traditional court",
      "Provide relevant information about the dispute",
      "Submit supporting documents where the system allows",
      "Attend scheduled court hearings",
      "Explain their side of a dispute to the elder panel",
      "Check the status of their own cases if this feature is enabled",
      "Accept and honor community reconciliation decisions",
    ],
    access: [
      { icon: <Scale size={14} />,       label: "Own Case Status (if enabled)" },
      { icon: <FolderOpen size={14} />,  label: "Authorized Documents Only" },
    ],
  },
];

/* ── Actor Card Component ────────────────────────────────────────────────── */
function ActorCard({ actor }: { actor: ActorCard }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="px-6 py-5 flex items-start gap-4"
        style={{ backgroundColor: actor.bgColor }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
          style={{ backgroundColor: actor.color }}
        >
          {actor.icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: actor.color }}>
            {actor.role.replace(/_/g, " ")}
          </p>
          <h3 className="font-display text-xl text-[var(--color-ink)] leading-tight">
            {actor.displayName}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex-1 space-y-5">
        {/* Description */}
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">
          {actor.description}
        </p>

        {/* Responsibilities */}
        <div>
          <h4 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wide mb-3">
            Responsibilities
          </h4>
          <ul className="space-y-2">
            {actor.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]">
                <CheckCircle
                  size={14}
                  className="shrink-0 mt-0.5"
                  style={{ color: actor.color }}
                />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* System access */}
        <div>
          <h4 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wide mb-3">
            System Access
          </h4>
          <div className="flex flex-wrap gap-2">
            {actor.access.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  backgroundColor: actor.bgColor,
                  color: actor.color,
                  borderColor: `color-mix(in srgb, ${actor.color} 25%, transparent)`,
                }}
              >
                {a.icon}
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export function ActorsRolesPage() {
  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Main Actors and Their Roles"
        subtitle="The four authorized actors of the Oromo Traditional Court Management System and their responsibilities."
      />

      {/* Intro banner */}
      <div className="relative bg-[var(--color-primary-dark)] rounded-xl px-6 py-5 mb-8 overflow-hidden">
        <div className="absolute inset-0 gadaa-pattern opacity-20" />
        <div className="relative">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
            Bale Robe City — Oromo Traditional Court
          </p>
          <p className="text-white text-sm leading-relaxed max-w-3xl">
            OTCMS serves four distinct roles, each with carefully defined responsibilities and access
            rights. All access is enforced by the backend — hiding a menu item does not grant or
            remove a permission.
          </p>
        </div>
      </div>

      {/* Actor cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ACTORS.map((actor) => (
          <ActorCard key={actor.role} actor={actor} />
        ))}
      </div>

      {/* Security note */}
      <div className="mt-8 border border-[var(--color-line)] rounded-xl px-6 py-5 bg-[var(--color-bg)] flex items-start gap-4">
        <ShieldCheck size={20} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">Security Note</p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            All permissions in OTCMS are enforced server-side. The sidebar and UI buttons reflect
            what each user is allowed to do, but the backend independently verifies every request.
            Users cannot elevate their own privileges, and unauthorized API requests are rejected
            regardless of frontend state.
          </p>
        </div>
      </div>
    </div>
  );
}

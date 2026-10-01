// ─────────────────────────────────────────────────────────────────────────────
// Shared API types — keep in sync with backend Prisma schema and validators
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export type CaseStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "ASSIGNED"
  | "HEARING_SCHEDULED"
  | "HEARING_IN_PROGRESS"
  | "DECISION_PENDING"
  | "DECIDED"
  | "CLOSED"
  | "REJECTED"
  | "WITHDRAWN";

export type CaseType =
  | "MARRIAGE"
  | "DIVORCE"
  | "LAND_DISPUTE"
  | "PROPERTY_DISPUTE"
  | "DEBT"
  | "ASSAULT"
  | "DEFAMATION"
  | "OTHER";

export type CasePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface CommunityMember {
  id: string;
  fullName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
  kebele?: string | null;
  identificationRef?: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface CaseParty {
  id: string;
  communityMemberId: string;
  roleInCase: "COMPLAINANT" | "RESPONDENT";
  communityMember: CommunityMember;
}

export interface CaseAssignment {
  id: string;
  userId: string;
  roleInPanel: "LEAD" | "MEMBER";
  user: { id: string; fullName: string; email: string };
}

export interface CaseWitness {
  id: string;
  caseId: string;
  witnessId: string;
  testimonySummary?: string | null;
  testifiedAt?: string | null;
  witness: { id: string; fullName: string; phone?: string | null };
}

export interface Case {
  id: string;
  caseNumber: string;
  caseType: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  description: string;
  location?: string | null;
  minWitnessesRequired: number;
  createdAt: string;
  updatedAt: string;
  parties: CaseParty[];
  assignments: CaseAssignment[];
  witnesses?: CaseWitness[];
}

export interface CaseHistoryEntry {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  actorUserId?: string | null;
  note: string | null;
  createdAt: string;
}

// ── Hearings ──────────────────────────────────────────────────────────────────

export type HearingStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "POSTPONED";

export interface Hearing {
  id: string;
  caseId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  purpose?: string | null;
  notes?: string | null;
  status: HearingStatus;
  outcomeRef?: string | null;
  createdAt: string;
  updatedAt: string;
  case?: { id: string; caseNumber: string; caseType: CaseType };
  participants?: HearingParticipant[];
}

export interface HearingParticipant {
  id: string;
  hearingId: string;
  userId?: string | null;
  communityMemberId?: string | null;
  witnessId?: string | null;
  role: string;
  attended?: boolean | null;
}

// ── Decisions ─────────────────────────────────────────────────────────────────

export type DecisionApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DecisionApproval {
  id: string;
  decisionId: string;
  userId: string;
  approved: boolean;
  comment?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string };
}

export interface Decision {
  id: string;
  caseId: string;
  decisionDate?: string | null;
  outcome: string;
  description: string;
  remarks?: string | null;
  approvalStatus: DecisionApprovalStatus;
  requiredApprovals: number;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  approvals?: DecisionApproval[];
  case?: { id: string; caseNumber: string };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  caseId?: string | null;
  decisionId?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category?: string | null;
  uploadedByUserId: string;
  createdAt: string;
  archivedAt?: string | null;
  uploadedBy?: { id: string; fullName: string };
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  payload?: unknown;
  readAt?: string | null;
  createdAt: string;
}

// ── Users / Roles ─────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  roles?: { role: Role }[];
}

// ── Shared ────────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

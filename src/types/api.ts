export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

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

export interface CommunityMember {
  id: string;
  fullName: string;
  phone?: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
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

export interface Case {
  id: string;
  caseNumber: string;
  caseType: CaseType;
  status: CaseStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  description: string;
  location?: string | null;
  minWitnessesRequired: number;
  createdAt: string;
  updatedAt: string;
  parties: CaseParty[];
  assignments: CaseAssignment[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CaseHistoryEntry {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  note: string | null;
  createdAt: string;
}

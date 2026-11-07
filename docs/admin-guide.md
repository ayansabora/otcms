# OTCMS — System Administrator Guide

**Oromo Traditional Court Management System**  
Bale Robe City · Oromia, Ethiopia  
Version 1.1 — Updated October 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Quick Start](#2-quick-start)
3. [Four Actors](#3-four-actors)
4. [Dashboard](#4-dashboard)
5. [User Management](#5-user-management)
6. [Role Management](#6-role-management)
7. [Case Registration (Record Officer)](#7-case-registration-record-officer)
8. [Community Member Management](#8-community-member-management)
9. [Case Management](#9-case-management)
10. [Hearings](#10-hearings)
11. [Decisions](#11-decisions)
12. [Summons](#12-summons)
13. [Consent Records](#13-consent-records)
14. [Appeals](#14-appeals)
15. [Documents](#15-documents)
16. [Notifications](#16-notifications)
17. [Reports](#17-reports)
18. [Audit Logs](#18-audit-logs)
19. [System Settings](#19-system-settings)
20. [Security Rules](#20-security-rules)
21. [Permissions Reference](#21-permissions-reference)
22. [Troubleshooting](#22-troubleshooting)

---

## 1. System Overview

OTCMS is a digital case management platform for the Oromo Traditional Court in Bale Robe City, supporting the full workflow from community member registration through case registration, elder-panel assignment, hearings, decisions, and closure — based on Proclamation No. 240/2021.

### Four actors

| Role | Purpose |
|---|---|
| **ADMIN** | System Administrator — manages users, roles, and system configuration |
| **COURT_MANAGER** | Oversees court operations, hearings, and decisions |
| **RECORD_OFFICER** | Registers cases, community members, and documents |
| **COMMUNITY_MEMBER** | Plaintiff or defendant — limited access to own cases |

All permissions are enforced by the backend API. Hiding a button does not grant or remove access.

---

## 2. Quick Start

### Default admin account

| Field | Value |
|---|---|
| Email | `admin@otcms.local` |
| Password | `ChangeMe12345!` (from `.env` `SEED_ADMIN_PASSWORD`) |

**Change this password immediately** after first login via **Settings → Change Password**.

### Starting the application

Both servers must run simultaneously in separate terminals:

```powershell
# Terminal 1 — Backend API (port 4000)
cd C:\Users\hp\OTCMS\backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd C:\Users\hp\OTCMS
npm run dev
```

Open `http://localhost:5173`.

> **Important:** If you see "Could not load community members" on the Register Case page, the backend is not running. Start it with `npm run dev` in the `backend/` folder.

### First-time database setup

```powershell
# In MySQL as root:
CREATE USER 'otcms'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'yourpassword';
CREATE DATABASE otcms CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON otcms.* TO 'otcms'@'127.0.0.1';
FLUSH PRIVILEGES;

# Then in backend/:
npx prisma db push   # creates all tables
npm run seed         # seeds roles, permissions, and admin account
```

---

## 3. Four Actors

### Actor 1 — System Administrator (ADMIN)

**Dashboard:** Total/Pending/Active/Closed cases, recent cases, today's hearings.  
**Sidebar:** Administration → User Management, Role Management, Audit Logs, System Settings.  
**Cannot:** Modify court decisions; interfere with judicial proceedings.

### Actor 2 — Court Manager (COURT_MANAGER)

**Dashboard:** Cases awaiting review, assigned cases, today's hearings, decisions.  
**Sidebar:** Requester Management (Assigned Cases), Hearings (Schedule, View), Decisions (Record, View), Reports.  
**Responsibilities:** Review cases, schedule hearings, record decisions, update case status.  
**Cannot:** Manage system users or permissions.

### Actor 3 — Record Officer (RECORD_OFFICER)

**Dashboard:** Recent cases, register case button, today's hearings, reports.  
**Sidebar:** Requester Management (Register Case, View All), Party Management (Plaintiffs, Defendants, Witnesses), Community Members, Documents, Reports.  
**Responsibilities:** Register cases with multiple plaintiffs/defendants/witnesses, manage community member records, upload documents.  
**Cannot:** Issue judicial decisions.

### Actor 4 — Community Member (COMMUNITY_MEMBER)

**Dashboard:** Quick actions (Submit Request, My Cases, Notifications), my cases list.  
**Sidebar:** My Cases (View, Submit Request), Notifications.  
**Can access:** Own cases, permitted documents, notifications, own profile.  
**Cannot:** View other citizens' case records or administrative functions.

---

## 4. Dashboard

The dashboard adapts to the logged-in user's role:

- **Community Member:** Quick-action cards, own cases summary, unread notification count.
- **Staff (Admin/Court Manager/Record Officer):** Stats cards (Total/Pending/Active/Closed), recent cases table, today's hearings, bar charts (cases by type, by status).

Charts only appear for users with `report:generate` permission.

---

## 5. User Management

Navigate to **Administration → User Management**. Requires `user:manage` permission.

### Creating a user

1. Click **Create User**.
2. Enter full name (required), email (required), phone (optional).
3. Select a role.
4. Leave password blank to auto-generate, or set one (min 12 chars, letter + number).
5. The temporary password is shown **once** — copy it and share in person.

### Editing, role change, status, password reset

Click the **⋮** menu on any user row:

| Action | Notes |
|---|---|
| **Edit Details** | Change name or phone |
| **Change Role** | You cannot remove your own ADMIN role |
| **Reset Password** | Revokes all active sessions |
| **Deactivate** | Disabled if user is the last active admin |

### Password policy

Minimum 12 characters · At least one letter · At least one number  
Example: `Court2024Admin!`

---

## 6. Role Management

Navigate to **Administration → Role Management**. Requires `role:manage` permission.

- **System roles** (ADMIN, COURT_MANAGER, RECORD_OFFICER, COMMUNITY_MEMBER) are read-only.
- **Custom roles** can be created, edited (description + permissions), and deleted (only if no users assigned).

---

## 7. Case Registration (Record Officer)

Navigate to **Requester Management → Register Case**. Requires `case:create` permission.

The form has **5 tabs**:

| Tab | Contents |
|---|---|
| 1. Case Info | Case type, title (optional), priority, location, jurisdiction basis, description |
| 2. Plaintiff | Select from registered members (supports multiple plaintiffs) |
| 3. Defendant | Same — supports multiple defendants; cross-filtered to prevent same person in both roles |
| 4. Witnesses | Dynamic add/remove; full name, sex, age, phone, kebele, relationship, statement |
| 5. Supporting | Registration notes; documents uploaded post-registration from Case Details |

**Auto-generated case number:** `OTCMS-{YYYY}-{NNNN}`

**Notifications triggered on case creation:** All active Court Managers receive a `case_created_for_review` notification.

**Duplicate warning:** If the same two parties have an open case of the same type, a warning is shown but registration is not blocked.

---

## 8. Community Member Management

Navigate to **Community → View Members** or **Community → Register Member**.

### Register Member fields

| Section | Fields |
|---|---|
| Personal | Full name*, gender, date of birth, phone, occupation |
| Address | Region, zone, woreda, kebele, village/house address |
| Identification | ID reference number (optional) |

New members start with **PENDING** verification status. Only Court Managers (with `member:verify`) can approve or reject.

### Edit Member

From any member's detail page, click **Edit** (requires `member:register` permission). All fields can be updated.

### Verification

A member must be **VERIFIED** before they can be added as a party (plaintiff/defendant) to a court case.

---

## 9. Case Management

### Case workflow

```
SUBMITTED → UNDER_REVIEW → VERIFIED → ASSIGNED → HEARING_SCHEDULED
  → HEARING_IN_PROGRESS → DECISION_PENDING → DECIDED → CLOSED
```

Alternative outcomes: `REJECTED`, `WITHDRAWN`

**Notifications on transition:**
- Submitting user always notified.
- Community member parties with user accounts notified on every status change.
- On REJECTED/WITHDRAWN: all Record Officers notified.

### Case Detail tabs

| Tab | Contents |
|---|---|
| Overview | Case info, description, parties, status actions |
| Witnesses | Recorded witnesses with testimony |
| Elder Panel | Assigned elders (Lead/Member) |
| Hearings | Scheduled and completed hearings |
| Documents | Uploaded case documents |
| Decision | Decision text, approval progress |
| Summons | Formal defendant notifications |
| Consent | Party consent records |
| Appeals | Filed appeals and outcomes |
| History | Timeline of all status changes |

### Party Management pages (Record Officer sidebar)

- **Plaintiffs** — all complainants across all cases, searchable, links to case
- **Defendants** — all respondents across all cases
- **Witnesses** — all witnesses across all cases

---

## 10. Hearings

Navigate to **Hearings → View Hearings** or **Hearings → Schedule Hearing**.

- **Calendar view** and **List view** available via toggle.
- **Conflict detection:** same location + overlapping time → 409 error.
- **Elder double-booking detection:** panel members with another hearing at same time → 409 error.

**Notifications on schedule:** All assigned panel elders and the case submitter.

---

## 11. Decisions

Decisions are recorded from **Case Details → Decision tab** or **Decisions → Record Decision**.

### Decision types

| Type | Meaning |
|---|---|
| `RECONCILIATION` | Parties reached voluntary agreement (Jaarsummaa) |
| `RULING` | Elder panel issued a binding ruling |

### Approval process

Each panel elder submits an approve/reject vote. Once the required number of approvals is reached, the decision is **finalized** and the case moves to `DECIDED`. A finalized decision **cannot be modified**.

---

## 12. Summons

Summons formally notify the respondent of the case and their obligation to appear.

- **Maximum 3 attempts** per respondent per case. After 3, court may proceed in absentia.
- **Service methods:** Personal, Representative, Posted.
- After a summons is issued, the court must **record service** (who received it, when).
- Respondents with user accounts receive an in-app `summons_issued` notification.

API: `POST /api/v1/summons`, `PATCH /api/v1/summons/:id/serve`  
Required permission: `summons:manage`

---

## 13. Consent Records

Records each party's explicit consent to OTC jurisdiction (Proclamation 240/2021 Art. 13).

- If a party **refuses consent** (`consentGiven: false`), the case automatically transitions to `WITHDRAWN`.
- If a party **withdraws** previously given consent, the case also transitions to `WITHDRAWN`.
- Both parties must consent before proceedings can begin.

API: `POST /api/v1/consent`, `PATCH /api/v1/consent/:id/withdraw`  
Required permission: `consent:manage`

---

## 14. Appeals

Appeals are filed after a `DECIDED` case when a party disagrees with the ruling.

Workflow:
1. File appeal (grounds + appellate court name).
2. Court records the **file transfer** to the Woreda/Zone Appellate Court.
3. Court records the **outcome** when the appellate decision is received.

Only one unresolved appeal may exist per case at a time.

API: `POST /api/v1/appeals`, `PATCH /api/v1/appeals/:id/transfer`, `PATCH /api/v1/appeals/:id/outcome`  
Required permission: `appeal:manage`

---

## 15. Documents

Documents are accessed from **Case Details → Documents tab**.

- Maximum file size: `FILE_MAX_SIZE_MB` in `.env` (default 15 MB).
- Allowed types: PDF, JPEG, PNG, DOCX, DOC.
- Every download is authenticated and authorized — no public URLs.
- Archive a document to hide it without deletion.

---

## 16. Notifications

All authenticated users see their notifications at **Notifications** in the sidebar.

### Notification types

| Type | Triggered by |
|---|---|
| `case_created_for_review` | Record Officer registers a case → Court Managers |
| `case_status_changed` | Any status transition → submitter + community member parties |
| `case_returned` | Case REJECTED/WITHDRAWN → Record Officers |
| `case_panel_assigned` | Panel assigned → each assigned elder |
| `hearing_scheduled` | Hearing scheduled → panel + submitter |
| `decision_finalized` | Decision approved → submitter |
| `summons_issued` | Summons issued → respondent (if has account) |

The notification bell in the top bar shows unread count, refreshed every 60 seconds.

---

## 17. Reports

Navigate to **Reports** (requires `report:generate` permission).

Available live reports:
- Cases by Status (bar chart)
- Cases by Type (bar chart)
- Hearing Schedule
- Decisions Summary

All data is live from the database — no mock data.

---

## 18. Audit Logs

Navigate to **Administration → Audit Logs** (requires `audit:read` — Admin only).

The audit log is **append-only** — nobody can edit or delete entries. Filter by action code or entity type.

### Key action codes

| Code | Event |
|---|---|
| `user.created` | New user created |
| `user.status_changed` | Account activated/deactivated |
| `user.roles_changed` | Role assigned or changed |
| `user.password_reset_by_admin` | Admin reset a user's password |
| `role.created/updated/deleted` | Custom role management |
| `case.created` | Case registered |
| `case.status_changed` | Case workflow transition |
| `case.panel_assigned` | Elders assigned to panel |
| `case.witness_added` | Witness recorded |
| `member.registered` | Community member registered |
| `member.updated` | Member profile edited |
| `member.verification_decided` | Verification approved/rejected |
| `auth.login_succeeded/failed` | Login events |
| `summons.issued/served` | Summons workflow |
| `consent.given/withdrawn` | Consent workflow |
| `appeal.filed/transferred/outcome_recorded` | Appeal workflow |

---

## 19. System Settings

Navigate to **Administration → System Settings**.

Three tabs:

| Tab | Contents |
|---|---|
| Profile | View your account info (read-only — contact admin to change) |
| Password | Change your own password (requires current password) |
| System | App version, environment, database type |

---

## 20. Security Rules

All enforced server-side — cannot be bypassed by URL manipulation:

| Rule | Enforcement |
|---|---|
| You cannot deactivate your own account | `users.service.setStatus` |
| You cannot remove your own ADMIN role | `users.service.assignRoles` |
| Last active admin cannot be deactivated | Service counts active admins |
| System roles cannot be deleted | `rolesService.delete` check |
| Custom roles need zero users to delete | `role.users.length` check |
| Finalized decisions cannot be modified | `decisions.service` |
| Audit log is append-only | No write routes on audit router |
| Community members see only own cases | `case:view_own` scoping in service |
| Max 3 summons per respondent per case | `summonsService.issue` check |
| Consent refusal auto-withdraws case | `consentService.record` |
| Appeal only on DECIDED cases | `appealsService.file` check |

---

## 21. Permissions Reference

### ADMIN (10 permissions)
`user:manage`, `role:manage`, `audit:read`, `member:register`, `member:view`, `case:view_all`, `case:assign`, `document:upload`, `document:read`, `report:generate`, `summons:read`, `consent:read`, `appeal:read`

### COURT_MANAGER (13 permissions)
`member:verify`, `member:view`, `case:view_assigned`, `case:transition`, `hearing:manage`, `decision:record`, `decision:approve`, `document:upload`, `document:read`, `report:generate`, `summons:manage`, `summons:read`, `consent:manage`, `consent:read`, `appeal:manage`, `appeal:read`

### RECORD_OFFICER (14 permissions)
`member:register`, `member:view`, `case:create`, `case:view_all`, `case:update`, `case:transition`, `case:assign`, `hearing:manage`, `document:upload`, `document:read`, `report:generate`, `summons:manage`, `summons:read`, `consent:manage`, `consent:read`, `appeal:manage`, `appeal:read`

### COMMUNITY_MEMBER (4 permissions)
`case:view_own`, `document:read`, `consent:read`, `appeal:read`

---

## 22. Troubleshooting

### "Could not load community members" on Register Case page

The backend server is not running.  
Fix: Open a terminal in `backend/` and run `npm run dev`.

### Login returns 401

Check email and password. Temporary passwords must be min 12 chars with a letter and number.

### Login returns 429 (Too Many Requests)

Rate limit reached. Restart the backend (clears in-memory counters) or wait 15 minutes.

### Login returns 403 (Account not active)

Account deactivated. Another admin must reactivate via User Management.

### "Can't reach database" / P1001 error

MySQL is stopped. Start it (requires Administrator on Windows):  
`Start-Service MySQL80`  
If `localhost` fails, use `127.0.0.1` in `DATABASE_URL`.

### Password set for new user doesn't work

Password doesn't meet policy (min 12 chars, letter + number). Use **Reset Password** from ⋮ menu to set a valid one.

### Cannot delete a custom role

The role still has users assigned. Go to User Management, change all those users to a different role, then delete.

### Role change doesn't take effect immediately

JWT access tokens are valid for `JWT_ACCESS_TTL` (default 15m). The user must re-login for new permissions.

### Backend TypeScript errors on `npm run dev`

Some pre-existing type errors exist in modules other than `users/` (related to `exactOptionalPropertyTypes`). These do not affect runtime — the backend runs correctly with `tsx`. Fixed in commit `48e4025`.

---

*Last updated: October 2026 — reflects OTCMS v1.1 with full case workflow, summons, consent, appeals, multi-party registration, expanded member profiles, inter-actor notifications, and role-aware dashboards.*

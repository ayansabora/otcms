# OTCMS — System Administrator Guide

**Oromo Traditional Court Management System**
Bale Robe City · Oromia, Ethiopia

---

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [User Management](#4-user-management)
5. [Role Management](#5-role-management)
6. [Case Management](#6-case-management)
7. [Community Members](#7-community-members)
8. [Hearings](#8-hearings)
9. [Decisions](#9-decisions)
10. [Documents](#10-documents)
11. [Notifications](#11-notifications)
12. [Reports](#12-reports)
13. [Audit Logs](#13-audit-logs)
14. [System Settings](#14-system-settings)
15. [Security Rules](#15-security-rules)
16. [Roles and Permissions Reference](#16-roles-and-permissions-reference)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Overview

OTCMS is a digital case management platform for the Oromo Traditional
Court in Bale Robe City. It supports the full court workflow from case
registration through elder-panel assignment, hearings, decisions, and
closure.

Four roles are defined in the system:

| Role | Purpose |
|---|---|
| **ADMIN** | System Administrator — manages users, roles, and system configuration |
| **COURT_MANAGER** | Oversees court operations, hearings, and decisions |
| **RECORD_OFFICER** | Registers cases, community members, and documents |
| **COMMUNITY_MEMBER** | Plaintiff or defendant — limited read-only access to own cases |

All permissions are enforced by the backend API. Hiding a button in the
UI does not grant or remove access — every request is independently
authorized on the server.

---

## 2. Getting Started

### 2.1 Default admin account

After the initial seed (`npm run seed` in `backend/`), the following
demo account is created:

| Field | Value |
|---|---|
| Email | `admin@otcms.local` |
| Password | `ChangeMe12345!` (set via `SEED_ADMIN_PASSWORD` in `.env`) |

**Change this password immediately** after the first login using
**Settings → Change Password**.

### 2.2 Starting the application

```powershell
# Backend (runs on port 4000)
cd backend
npm run dev

# Frontend (runs on port 5173)
cd ..        # project root
npm run dev
```

Open `http://localhost:5173` in a browser.

### 2.3 Environment configuration

Key variables in `backend/.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_ACCESS_SECRET` | Sign access tokens — use a long random value in production |
| `JWT_REFRESH_SECRET` | Sign refresh tokens — different from the access secret |
| `JWT_ACCESS_TTL` | Access token lifetime (default `15m`) |
| `JWT_REFRESH_TTL` | Refresh token lifetime (default `7d`) |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in milliseconds |
| `AUTH_RATE_LIMIT_MAX` | Max login attempts per window |
| `LOGIN_MAX_FAILED_ATTEMPTS` | Failed attempts before account lockout |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration |
| `SEED_ADMIN_PASSWORD` | Password used when seeding the demo admin account |

---

## 3. Dashboard

The dashboard is the first page after login. It shows:

- **Stats cards** — total cases, pending cases, active hearings, decided/closed cases
- **Recent cases table** — the latest 7 cases with case number, type, priority, and status
- **Today's hearings** — hearings scheduled for today with time and location
- **Charts** — cases by status and cases by type (visible to roles with `report:generate`)

The dashboard content adapts to the logged-in user's permissions. A
Community Member sees only their own case summary.

---

## 4. User Management

Navigate to **Administration → User Management** in the sidebar.

> Requires: `user:manage` permission (ADMIN role only)

### 4.1 Viewing users

The user table shows:

- **Name** and phone number
- **Email**
- **Role** (colour-coded badge)
- **Status** — Active, Inactive, or Suspended
- **Registered** date
- **Last Login** date

Use the search bar to find users by name or email.
Use the **All Roles** and **All Statuses** dropdowns to filter.

### 4.2 Creating a user

1. Click **Create User**.
2. Fill in Full Name (required), Email (required), Phone (optional).
3. Select a Role.
4. Optionally set a Temporary Password, or leave blank to auto-generate one.
5. Click **Create User**.

If the password was auto-generated, a one-time display shows it in the
success screen. **Copy and share it in person** — it cannot be retrieved
again after closing the modal.

Password policy (enforced on both frontend and backend):
- Minimum 12 characters
- At least one letter
- At least one number

### 4.3 Editing a user

Click the **⋮** menu on any row → **Edit Details** to update the user's
full name or phone number.

### 4.4 Changing a user's role

Click **⋮** → **Change Role** → select the new role → **Save Role**.

Security rules:
- You cannot remove your own ADMIN role through this action.
- The backend independently enforces this — the API returns 403 if
  you attempt it.

### 4.5 Resetting a password

Click **⋮** → **Reset Password** → enter and confirm a new password → **Reset Password**.

What this does:
- Sets a new password hash (the old password is immediately invalidated).
- Revokes all of the user's active refresh tokens (forces re-login on all devices).
- Records the action in the audit log.

The new password must meet the same policy as account creation.

### 4.6 Activating and deactivating accounts

Click **⋮** → **Deactivate** (or **Activate**). A confirmation dialog
appears before the change is applied.

Security rules:
- You cannot deactivate your own account.
- You cannot deactivate the **last active administrator**. The backend
  returns an error if you attempt it. Promote another user to ADMIN first.
- Deactivating a user does **not** delete their records. All cases,
  decisions, and documents associated with them are preserved.

---

## 5. Role Management

Navigate to **Administration → Role Management** in the sidebar.

> Requires: `role:manage` permission (ADMIN role only)

### 5.1 Viewing roles

The page is divided into two sections:

- **Custom Roles** — roles you have created. These can be edited and deleted.
- **System Roles** — the four built-in roles (ADMIN, COURT_MANAGER,
  RECORD_OFFICER, COMMUNITY_MEMBER). These are read-only and cannot be
  deleted.

Each role card shows the role name, description, permission count, and
the first few permission codes.

### 5.2 Creating a custom role

1. Click **Create Role**.
2. Enter a name in UPPERCASE_WITH_UNDERSCORES format (e.g. `FINANCE_OFFICER`).
3. Optionally add a description.
4. In the permission picker, expand each group and check the permissions
   this role should have. The group header checkbox selects all permissions
   in that group at once.
5. Click **Create Role**.

The new role is immediately available for assignment in User Management.

### 5.3 Editing a custom role

Click **Edit** on a custom role card. You can update the description and
permission set. Changes take effect for all users with that role on their
next login (access tokens refresh every 15 minutes by default).

> Note: System role permissions are defined in `backend/src/database/seed/rbacSeedData.ts`
> and cannot be changed through the UI. This protects core court operations
> from accidental misconfiguration.

### 5.4 Deleting a custom role

Click **Delete** on a custom role card. The role can only be deleted if
**no users are currently assigned to it**. Reassign or remove all users
from the role first.

---

## 6. Case Management

Navigate to **Case Management → View All Cases** in the sidebar.

### 6.1 Registering a case

> Requires: `case:create` permission (RECORD_OFFICER)

1. Go to **Case Management → Register Case**.
2. Select Case Type, Priority, Location, and Description.
3. Select the Complainant and Respondent from registered community members.
4. Click **Register Case**.

Both parties must be registered as community members before a case can
be created. Unverified members can be selected but should be verified
before proceedings begin.

### 6.2 Case workflow

Cases move through these statuses in order:

```
SUBMITTED → UNDER_REVIEW → VERIFIED → ASSIGNED → HEARING_SCHEDULED
    → HEARING_IN_PROGRESS → DECISION_PENDING → DECIDED → CLOSED
```

Alternative outcomes: `REJECTED`, `WITHDRAWN`

Status transitions are enforced by the backend. The Case Detail page
shows only the valid next actions for the current user's role.

### 6.3 Case Detail tabs

Each case has seven tabs:

| Tab | Contents |
|---|---|
| **Overview** | Case info, description, parties, available actions |
| **Witnesses** | Witnesses recorded for the case |
| **Elder Panel** | Assigned elders and their roles (Lead/Member) |
| **Hearings** | Scheduled and completed hearings |
| **Documents** | Uploaded case documents |
| **Decision** | Recorded decision and approval progress |
| **History** | Timeline of all status changes |

---

## 7. Community Members

Navigate to **Community → View Members**.

> Requires: `member:view` permission

### 7.1 Registering a member

> Requires: `member:register`

1. Click **Register Member**.
2. Enter Full Name, Gender, Phone, Address, Kebele, and ID Reference.
3. Click **Register Member**.

New members start with `PENDING` verification status.

### 7.2 Verifying a member

> Requires: `member:verify` (COURT_MANAGER)

1. Open a member's profile.
2. Click **Verify Member**.
3. Choose **Approve & Verify** or **Reject**.
4. Optionally add a verification note.

Only verified members can be added as parties to a case.

---

## 8. Hearings

Navigate to **Hearings → View Hearings**.

### 8.1 Scheduling a hearing

> Requires: `hearing:manage`

1. Click **Schedule Hearing** (or click the button from inside a Case Detail → Hearings tab).
2. Select the Case, Start Date/Time, End Date/Time, Location, and Purpose.
3. Click **Schedule Hearing**.

The hearing calendar view shows all hearings for the current month.
Switch between **List** and **Calendar** views using the toggle buttons.

### 8.2 Hearing statuses

| Status | Meaning |
|---|---|
| SCHEDULED | Hearing is confirmed and upcoming |
| IN_PROGRESS | Hearing is currently underway |
| COMPLETED | Hearing has concluded |
| POSTPONED | Hearing has been moved to a later date |
| CANCELLED | Hearing will not take place |

---

## 9. Decisions

Decisions are accessed from the Case Detail page → **Decision** tab.

### 9.1 Recording a decision

> Requires: `decision:record`

1. From a case in `DECISION_PENDING` status, go to the Decision tab.
2. Click **Record Decision**.
3. Enter the Outcome, Description, optional Remarks, Decision Date, and
   number of Required Approvals.
4. Click **Record Decision**.

### 9.2 Approving a decision

> Requires: `decision:approve`

1. Open the Decision Detail page.
2. Click **Submit Approval**.
3. Choose **Approve** or **Reject** and optionally add a comment.
4. Click the vote button.

The approval progress bar shows how many of the required approvals have
been received. Once the required number is reached, the decision status
changes to `APPROVED` and the case advances to `DECIDED`.

> By design, a finalized decision **cannot be modified** after approval.
> This protects the integrity of the elder panel's ruling.

---

## 10. Documents

Navigate to **Documents** in the sidebar, or access documents from the
Case Detail → Documents tab.

> Upload requires: `document:upload`
> Download requires: `document:read`

Documents are stored on the server file system and are never served via
a public URL. Every download request is authenticated and authorized
individually.

Maximum file size: controlled by `FILE_MAX_SIZE_MB` in `.env` (default 15 MB).

---

## 11. Notifications

Navigate to **Notifications** in the sidebar. All authenticated users
can see their own notifications.

Actions:
- **Mark as Read** — mark a single notification read
- **Mark All Read** — clear all unread indicators

The notification bell in the top bar shows the unread count and refreshes
every 60 seconds.

---

## 12. Reports

Navigate to **Reports** in the sidebar.

> Requires: `report:generate`

Available reports:
- **Cases by Status** — count of cases in each status
- **Cases by Type** — count of cases by dispute type
- **Hearing Schedule** — upcoming and past hearings
- **Decisions Summary** — decisions with approval status and outcomes
- Document statistics

All report data is live from the database — there is no cached or mocked
data in the reports module.

---

## 13. Audit Logs

Navigate to **Administration → Audit Logs**.

> Requires: `audit:read` (ADMIN only)

The audit log is **append-only**. No one — including the System
Administrator — can edit or delete a log entry. This is enforced at the
API level: there are no write routes on the audit endpoint.

Each entry records:

| Field | Description |
|---|---|
| Time | Exact UTC timestamp |
| Action | Machine-readable action code (e.g. `user.created`) |
| Entity | Resource type and ID that was affected |
| IP Address | Client IP address at the time of the action |

**Filter by action** (e.g. `user.` to see all user actions) or by
**Entity Type** (e.g. `case`) using the filter inputs at the top.

Common action codes:

| Action | Triggered by |
|---|---|
| `user.created` | Creating a new user account |
| `user.updated` | Editing user details |
| `user.status_changed` | Activating or deactivating a user |
| `user.roles_changed` | Changing a user's role |
| `user.password_reset_by_admin` | Admin-initiated password reset |
| `role.created` | Creating a custom role |
| `role.updated` | Updating a role's permissions |
| `role.deleted` | Deleting a custom role |
| `auth.login_succeeded` | Successful login |
| `auth.login_failed` | Failed login attempt |
| `auth.password_reset` | User-initiated password reset |
| `case.status_changed` | Case status transition |
| `case.created` | New case registered |

---

## 14. System Settings

Navigate to **Administration → System Settings**.

The settings page has three tabs:

### Profile
View your current account information (name, email, role, permission count).
To update your name or phone number, contact another administrator or
use the User Management page.

### Password
Change your own password. Requires the current password.

Policy:
- Minimum 12 characters
- At least one letter
- At least one number

### System Information
Displays the current application version, environment, database type, and
organization name.

---

## 15. Security Rules

The following rules are enforced by the backend and cannot be bypassed
by modifying the frontend:

| Rule | Enforcement |
|---|---|
| You cannot deactivate your own account | `users.service.setStatus` checks `id === actorUserId` |
| You cannot remove your own ADMIN role | `users.service.assignRoles` checks against `actorUserId` |
| The last active administrator cannot be deactivated | Service counts active admins before allowing status change |
| Passwords are never stored in plain text | Argon2id hash with OWASP-recommended parameters |
| Refresh tokens are stored as SHA-256 hashes | Raw tokens never written to the database |
| Reused refresh tokens revoke the entire token family | Detects stolen tokens and kills all related sessions |
| System roles cannot be deleted or have permissions changed via UI | `rolesService.delete/update` checks `SYSTEM_ROLES` list |
| Custom roles can only be deleted if no users are assigned | Service checks `role.users.length` before deletion |
| All API endpoints require a valid JWT | `authenticate` middleware on every protected router |
| RBAC permissions checked independently per endpoint | `requirePermission` middleware — not only sidebar visibility |
| Finalized decisions cannot be modified | Business rule in `decisions.service` |
| Audit log is append-only | No write routes exist on the audit router |

---

## 16. Roles and Permissions Reference

### ADMIN
| Permission | Description |
|---|---|
| `user:manage` | Create, update, activate/deactivate users |
| `role:manage` | Manage roles and permissions |
| `audit:read` | View audit logs |
| `member:register` | Register a community member |
| `member:view` | View community member records |
| `case:view_all` | View all cases |
| `case:assign` | Assign/reassign a case to a panel |
| `document:upload` | Upload a document |
| `document:read` | Download/view an authorized document |
| `report:generate` | Generate reports |

### COURT_MANAGER
| Permission | Description |
|---|---|
| `member:verify` | Verify a community member |
| `member:view` | View community member records |
| `case:view_assigned` | View cases assigned to self |
| `case:transition` | Move a case through workflow states |
| `hearing:manage` | Schedule and manage hearings |
| `decision:record` | Record a decision |
| `decision:approve` | Approve/finalize a decision |
| `document:upload` | Upload a document |
| `document:read` | Download/view an authorized document |
| `report:generate` | Generate reports |

### RECORD_OFFICER
| Permission | Description |
|---|---|
| `member:register` | Register a community member |
| `member:view` | View community member records |
| `case:create` | Register a new case |
| `case:view_all` | View all cases |
| `case:update` | Update case details |
| `case:transition` | Move a case through workflow states |
| `case:assign` | Assign/reassign a case to a panel |
| `hearing:manage` | Schedule and manage hearings |
| `document:upload` | Upload a document |
| `document:read` | Download/view an authorized document |
| `report:generate` | Generate reports |

### COMMUNITY_MEMBER
| Permission | Description |
|---|---|
| `case:view_own` | View own submitted cases |
| `document:read` | Download/view authorized documents |

---

## 17. Troubleshooting

### Login returns 401 — Invalid email or password
- Check the email and password are correct.
- If the account was recently created, use the temporary password
  provided at creation time.
- Temporary passwords must meet the policy (12+ chars, letter + number).

### Login returns 429 — Too Many Requests
- You have exceeded the rate limit for the current window.
- Restart the backend server to clear in-memory counters during development.
- Wait for the rate-limit window to expire (default 15 minutes).
- In production, increase `AUTH_RATE_LIMIT_MAX` in `.env` if needed.

### Login returns 403 — Account not active
- The account has been deactivated. Contact another administrator to
  reactivate it via User Management.

### Cannot reach database — `localhost:3306`
- The MySQL service is not running. Start it:
  ```powershell
  Start-Service MySQL80
  ```
- If `localhost` resolves to IPv6 (`::1`) but MySQL listens on IPv4, change
  `DATABASE_URL` in `backend/.env` to use `127.0.0.1` instead of `localhost`.

### Password I set for a new user doesn't work
- Confirm the password meets the policy: minimum 12 characters, at least
  one letter and one number.
- If you left the password blank during creation and closed the modal
  without copying the auto-generated password, use **Reset Password** from
  the ⋮ menu to set a new one.

### Cannot deactivate a user — "last active administrator"
- There is only one active ADMIN account. Promote another user to ADMIN
  first (Change Role → ADMIN), then deactivate the original account.

### Role change doesn't take effect immediately
- JWT access tokens are valid for `JWT_ACCESS_TTL` (default 15 minutes).
- The user must log out and back in, or wait for the token to expire and
  be refreshed, for the new permissions to appear in their session.

### Cannot delete a custom role
- The role is still assigned to one or more users. Go to User Management,
  filter by that role, change all those users to a different role, then
  try deleting the role again.

### Backend TypeScript errors on `npm run dev`
- Some pre-existing type errors exist in modules other than `users/`
  (related to `exactOptionalPropertyTypes` in `cases`, `hearings`, and
  the `argon2` version). These do not affect runtime behaviour — the
  backend runs correctly with `tsx` despite these warnings. They will be
  resolved in a future refactor pass.

---

*Last updated: October 2026 — reflects OTCMS v1.0 with full User Management,
Role Management, Case Workflow, Hearings, Decisions, Documents, Notifications,
Reports, and Audit Log modules.*

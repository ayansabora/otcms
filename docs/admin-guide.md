# OTCMS — Administrator Guide

## Status note

The frontend currently has screens for **login, dashboard, and cases**
only (see docs/architecture.md's Phase 14 status). Everything below marked
"via API" means the backend fully supports it, but you'd need a tool like
Postman/curl or the (not-yet-built) admin UI screens to do it today. This
guide documents the intended workflow either way, so it stays useful as
those screens get built.

## Signing in

Go to `/login`. Your account must be `ACTIVE` and you must know your
password. If you're locked out after failed attempts, wait for the
configured lockout window (`LOGIN_LOCKOUT_MINUTES`, default 15) or have
another administrator reactivate your account.

## Managing users (via API today)

Administrators create every other user account — there is no public
self-registration for court personnel accounts (only community members
have a registration flow, and even that requires a Record Officer/Admin
to submit it — see docs/architecture.md §27 Q7, still an open question).

```
POST /api/v1/users
{
  "email": "officer@example.com",
  "fullName": "Officer Name",
  "roleIds": ["<role-uuid>"],
  "temporaryPassword": "optional — server generates one if omitted"
}
```

The response includes a one-time `temporaryPassword` field if you didn't
supply one — hand it to the new user through a secure channel; it is never
stored or retrievable again after this response.

To deactivate someone: `PATCH /api/v1/users/:id/status` with
`{ "status": "INACTIVE" }`. You cannot deactivate your own account (a
deliberate safeguard against accidental lockout).

To change someone's roles: `PATCH /api/v1/users/:id/roles` with
`{ "roleIds": [...] }` — this replaces their full role set, it doesn't add
to it.

## Roles and permissions

Four roles ship by default (see `database/seed/rbacSeedData.ts`):
**ADMIN**, **COURT_MANAGER** (combined Court Manager/Elder role — see the
open question about splitting this in docs/architecture.md §27 Q4),
**RECORD_OFFICER**, **COMMUNITY_MEMBER**. `GET /api/v1/roles` lists each
role's permission set. There is currently no UI or API to create a
*new* role beyond these four — that would require a code change to the
seed data and a migration, not a runtime admin action.

## Verifying community members

Before a member can be added as a party to a case, someone with
`member:verify` (an Admin or Court Manager/Elder) must approve their
registration: `PATCH /api/v1/community-members/:id/verification` with
`{ "approve": true }`.

## Viewing audit logs

`GET /api/v1/audit-logs`, filterable by entity type, actor, action, and
date range. This is read-only by design — there is no way to edit or
delete an audit entry through the API, from any role, including Admin.

## Reports

`GET /api/v1/reports/{cases-by-status, cases-by-type, pending-cases,
hearing-schedule, decisions-summary, document-statistics}`, each
supporting `?format=csv` for a downloadable export. See docs/api.md.

## What Admins cannot do (by design)

- Modify a finalized (`APPROVED`) decision — see docs/architecture.md §7
  and `modules/decisions/decisions.service.ts`. This is intentional: it
  protects the integrity of elder-panel decisions from after-the-fact
  tampering, even by an administrator.
- Delete an audit log entry.
- Bypass the case workflow state machine — an Admin still has to follow
  valid transitions, same as anyone else with the right permission.

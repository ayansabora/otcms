# OTCMS — User Guide

## Who this is for

Record Officers, Court Managers/Elders, and Community Members. If you
manage user accounts or system configuration, see docs/admin-guide.md
instead.

## Signing in

Go to the OTCMS web address provided by your court administrator, sign in
with your email and password. If you don't have an account, contact the
court office — accounts are created by an administrator, not
self-registered (see docs/admin-guide.md).

## For Record Officers

**Registering a community member** (required before they can be a party
in a case): Cases → your court's member registration flow (currently only
available via the API — `POST /api/v1/community-members` — until that
screen is built; ask a developer/admin to do this for you in the meantime
if the UI isn't there yet).

**Registering a case:** Cases → Register case. Both the complainant and
respondent must already be **verified** community members — if someone
isn't in the dropdown, they need to be registered and then verified by an
elder or admin first.

**Moving a case forward:** Open the case, use the status buttons shown
under "Move this case forward." Only the transitions currently valid for
that case's status are offered — you can't skip steps.

## For Court Managers / Elders

You'll see cases assigned to your panel. Key steps once a case reaches
you:

1. **Schedule a hearing** for the case (via API today — `POST
   /api/v1/hearings` — until the hearings screen exists).
2. **Conduct the hearing**, then mark it in progress/completed.
3. **Record a decision** once the case reaches "Decision pending."
4. **Approve the decision** — each assigned elder approves individually;
   the case only moves to "Decided" once enough panel members have
   approved (the required count is shown on the decision — by default,
   the whole assigned panel, pending confirmation of the exact rule, see
   docs/architecture.md §27 Q1).

**A decision cannot be edited once finalized** — if something needs to
change after approval, that requires a new decision entry, not an edit to
the old one.

## For Community Members

You can view your own cases and their status/history. You cannot see
anyone else's case — this is enforced by the system, not just hidden in
the interface.

Submitting a case yourself (rather than through a Record Officer) is not
yet available — currently only Record Officers/Admins can formally
register a case (see docs/architecture.md §27 Q7, an open policy question
about self-service submission). If you need to bring a dispute to the
court, contact the court office directly for now.

## Understanding case statuses

| Status | Meaning |
|---|---|
| Submitted | Case has been registered, awaiting review |
| Under review | Record Officer is reviewing the case details |
| Verified | Reviewed and confirmed (may require witness testimony first for marriage/divorce cases) |
| Assigned | An elder panel has been assigned |
| Hearing scheduled | A hearing date/time/location has been set |
| Hearing in progress | The hearing is underway or has occurred; more hearings may follow |
| Decision pending | The panel is deliberating |
| Decided | The panel has reached and approved a decision |
| Closed | The case is fully resolved |
| Rejected / Withdrawn | The case did not proceed (rejected by court, or withdrawn by a party) |

## Getting help

For anything not covered here, or if something looks wrong, contact your
court's system administrator — see docs/admin-guide.md for what they can
and cannot do.

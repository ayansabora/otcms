# OTCMS — Testing Strategy

Three layers, per docs/architecture.md §23. Status of each as of Phase 15:

## 1. Unit tests (`backend/src/**/__tests__/*.test.ts`)

No database, no network — pure logic. Run:

```bash
cd backend
npm run test
```

Covers:
- **Case workflow state machine** (`modules/cases/__tests__/case.workflow.test.ts`) — every valid/invalid transition, terminal states, the marriage/divorce witness-requirement flag.
- **Password utils** — Argon2id hash/verify round-trip, malformed-hash handling, password policy enforcement.
- **JWT utils** — access/refresh token sign+verify, rejection of forged/tampered tokens, refresh-token hashing.
- **CSV export utility** — RFC 4180 escaping, column ordering, null handling.
- **Pagination utility** — skip/take math, page-count rounding.
- **AppError hierarchy** — every error class maps to its correct HTTP status/code.

## 2. Integration tests (`backend/src/test/integration/*.integration.test.ts`)

Real Express app + real MySQL database via Prisma + Supertest — no mocking
of the database layer. **Requires a dedicated test database** (never point
this at dev or prod — it truncates tables between tests).

Setup:
```bash
cd backend
# .env should already exist from docs/installation.md; for a SEPARATE test
# database, create backend/.env.test with DATABASE_URL pointing at e.g.
# mysql://otcms_test:test@localhost:3306/otcms_test — the name must
# contain "test" (see src/test/dbReset.ts's safety guard).
NODE_ENV=test npx prisma migrate deploy
npm run test:integration
```

Covers:
- **Auth flow** (`auth.integration.test.ts`) — login success/failure (enumeration-safe), account lockout after repeated failures, refresh-token rotation, protected-route 401/403 enforcement, logout invalidation.
- **Case lifecycle** (`cases-workflow.integration.test.ts`) — the full blueprint §18 critical path across three real roles (Record Officer, Admin, Court Manager/Elder): register members → verify → create case → block-then-allow the ASSIGNED transition around panel assignment → schedule a hearing → progress through hearing states → record and approve a decision (confirming the case auto-advances to DECIDED) → close the case → verify the complete history log. Also covers: rejecting an unverified party, rejecting an invalid direct state transition, and confirming a community member cannot view another member's case.

## 3. End-to-end tests (`e2e/*.spec.ts`, Playwright)

Real browser against the real running frontend + backend + database. **Not
auto-started** — provision everything yourself first:

```bash
# Terminal 1
cd backend && npm run dev
# Terminal 2
cd frontend && npm run dev
# Terminal 3, from repo root
npm install         # installs Playwright
npx playwright install chromium
npm run test:e2e
```

Covers so far: admin login, invalid-credentials error display, navigating
to the cases list, and unauthenticated redirect-to-login. This is a
**starting scaffold, not the full critical path** — see "Still missing" below.

## Still missing (honest gap list)

- E2E coverage of the rest of the blueprint §18 critical path (create user,
  member registration, case submission through closure, all from the UI —
  currently only exercised via the integration tests' direct API calls).
- Integration tests for hearings scheduling conflicts, document
  upload/download authorization, notifications, and reports endpoints —
  the case-lifecycle test exercises hearings/decisions only as steps
  toward closing a case, not their edge cases in isolation.
- No CI pipeline wiring any of this up to run automatically on push —
  these all currently require a human to run them locally.
- No load/performance testing.

# OROMOO TRADITIONAL COURT MANAGEMENT SYSTEM (OTCMS)
## System Blueprint v0.1 — Bale Robe City, Ethiopia

Status: **DRAFT — awaiting your approval before any implementation begins.**
Repo state reviewed: `otcms-main.zip` contains only a fresh Vite + React + TypeScript + Tailwind scaffold (frontend) and an empty `package.json` (backend). No application code exists yet, so this blueprint starts from a clean slate.

---

## 1. Executive Architecture

A modular monolith, not microservices — the right call at this scale (single city court system, one deployment target, small ops team). Microservices would add operational overhead (service discovery, distributed tracing, network security between services) without a corresponding benefit here.

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│   React SPA (Vite)  │ ───────────────────────▶ │  Express API (Node)  │
│   TanStack Query    │ ◀─────────────────────── │  Layered/modular     │
└─────────────────────┘                           └──────────┬───────────┘
                                                              │ Prisma
                                                    ┌─────────▼──────────┐
                                                    │      MySQL 9.7     │
                                                    └─────────────────────┘
                                                              │
                                                    ┌─────────▼──────────┐
                                                    │ Local/S3-compatible │
                                                    │ document storage    │
                                                    └─────────────────────┘
```

Nginx sits in front in production as TLS-terminating reverse proxy, serving the built SPA as static files and proxying `/api` to the Node process.

---

## 2–4. Technology Stack, Verified Current Versions, and Rationale

I researched current versions rather than relying on training data (per your instruction). Dates below reflect what's actually shipping as of **September 2026**.

| Layer | Technology | Verified current version | Why |
|---|---|---|---|
| Frontend framework | React | **19.2.8** (already in your scaffold) | Current stable major; no React 20 announced. Matches what's already installed. |
| Language | TypeScript | **6.0.x** | Current stable; last JS-codebase release before the Go-based TS 7 rewrite. Safe, mature choice — not adopting a not-yet-released rewrite. |
| Build tool | Vite | **8.0.x** | Current stable; unified Rust/Rolldown-based toolchain. Already in scaffold. |
| CSS | Tailwind CSS | **4.3.x** | Current stable v4 line (CSS-first config, no `tailwind.config.js` needed by default). Already in scaffold. |
| Routing | React Router | Latest v7.x (verify at implementation time) | De facto standard, works cleanly with Vite + TS. |
| Server state | TanStack Query | Latest v5.x | Best-in-class caching/retry/pagination for a REST backend; avoids hand-rolled fetch state. |
| Forms | React Hook Form + Zod | Latest stable | Minimal re-renders, first-class TS inference, and a **single Zod schema reused on both frontend and backend** for validation (write once, no drift). |
| Runtime | Node.js | **24.x "Krypton" (Active LTS)** | Node 24 is Active LTS as of now; Node 22 ("Jod") is in Maintenance; Node 26 is Current (not yet LTS). Active LTS is the correct production choice. |
| Web framework | Express | **5.2.x** | Express 5 is now the Express Technical Committee's production-recommended release (Express 4 is being sunset). Native promise/async error handling removes a whole class of unhandled-rejection bugs Express 4 required middleware to patch over. |
| Database | **MySQL** | **9.7.x LTS** (per your request to switch from PostgreSQL) | Oracle's first new LTS series since 8.4; 9.7 LTS gets a long support window (EOL ~2034) vs. the older 8.4 LTS line. I'm pinning to the **LTS track**, not the quarterly "Innovation" releases (currently 26.7.x) — an Innovation release is the wrong choice for a system holding legal records, since it isn't meant for long-term production stability. |
| ORM | Prisma ORM | **7.x** | Latest *stable, production-recommended* major, with first-class MySQL support (identical to the Postgres setup, just a different `provider` in the Prisma schema). Prisma 8 exists only as an early-access "Prisma Next" rewrite not recommended for production yet — so we pin to 7, not 8. |
| Auth | Argon2id (via `node-argon2` or equivalent) + JWT (access) / rotating refresh tokens in HTTP-only cookies | current | Argon2id is the OWASP-recommended password hash. Cookie-based refresh avoids `localStorage` token theft via XSS. |
| Validation | Zod | Latest v4.x | Shared schema library between frontend and backend (see above). |
| Testing | Vitest (unit/component) + Supertest (API integration) + Playwright (E2E) | current | Vitest shares Vite's config/transform pipeline (fast, zero extra config). Playwright is the strongest current E2E tool for multi-role browser flows. |
| Linting/formatting | ESLint 10.x + Prettier (latest) | current | Already partly in scaffold. |
| Containerization | Docker + docker-compose | current | For local dev parity and a documented deployment path. |
| Reverse proxy | Nginx | current stable | TLS termination, static file serving, reverse proxy to API. |

**Note on the MySQL switch — trade-offs to be aware of, not blockers:**
- **UUIDs:** MySQL 9.7 doesn't have Postgres's `uuidv7()` built in. I'll generate time-ordered UUIDv7 values in the application layer (a small, well-established library, not hand-rolled crypto) and store them as `CHAR(36)` (or `BINARY(16)` via `UUID_TO_BIN`/`BIN_TO_UUID` for tighter indexes, if you want the extra performance). Either is fine at this system's scale — I'll default to `CHAR(36)` for simplicity and switch only if profiling shows it matters.
- **JSON columns:** `audit_logs.before/after` and similar fields use MySQL's `JSON` type. It lacks Postgres's `JSONB` binary indexing/operators, but for append-only audit rows that are read sequentially/filtered by other indexed columns (actor, entity, date), this is not a practical limitation here.
- **Check constraints & full-text search:** MySQL 8.0+/9.x support `CHECK` constraints (used for enums/status columns) and MySQL's native full-text index (used for case search) — both fully available, no functional gap versus the Postgres plan.
- Everything else in this blueprint (Prisma schema shape, API design, RBAC, workflow engine, document/audit architecture) is **unchanged** — the database swap is isolated to the persistence layer as designed.

**Decisions I made where multiple valid options existed:**
- **Prisma over raw SQL / Knex / Drizzle:** best TypeScript type-safety, mature migration tooling, and it's explicitly a required-unless-disqualified choice per your instructions. Drizzle is a reasonable alternative if you'd prefer lighter-weight/closer-to-SQL — flag if you want that instead.
- **JWT-in-httpOnly-cookie over pure session-store (Redis) auth:** simpler ops (no extra service to run/back up) for a single-city deployment, while keeping tokens out of JS-accessible storage. If you expect multi-server horizontal scaling soon, a Redis session store is the better long-term choice — your call.
- **Modular monolith over microservices:** justified above; revisit only if usage/scale genuinely demands it.

---

## 5. System Actors (confirmed from your spec)

1. **System Administrator**
2. **Court Manager / Abbaa Seeraa / Elder (Jaarsaa Biyyaa)** — see open question in §26 about whether these are one role or should be split
3. **Record Officer / Registrar**
4. **Community Member**

---

## 6. Role/Permission Matrix (draft — confirm before implementation)

Permissions are modeled as **granular, named permissions grouped by role** (not just 4 hardcoded roles), so future roles (e.g., a "Senior Elder" who can approve decisions vs. a regular elder who cannot) can be added without code changes.

| Capability | Admin | Court Manager/Elder | Record Officer | Community Member |
|---|:---:|:---:|:---:|:---:|
| Manage users/roles | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ |
| Register community member | ✅ | Verify only | ✅ | Self-register (pending verification) |
| Register new case | ❌ | ❌ | ✅ | Submit request (not "registered" until Record Officer confirms) |
| View all cases | ✅ | Assigned only | ✅ | Own only |
| Assign/reassign case | ✅ | Limited (per workflow) | ✅ | ❌ |
| Schedule/manage hearing | ❌ | ✅ | ✅ (logistics) | ❌ |
| Record decision | ❌ | ✅ | ❌ | ❌ |
| Approve/finalize decision | ❌ | ✅ (per elders' consensus rule — see §11) | ❌ | ❌ |
| Upload documents | ✅ | ✅ | ✅ | Own case only, where permitted |
| Download/view documents | Per role+ownership | Per role+ownership | Per role+ownership | Own case, authorized only |
| Generate reports | ✅ (all) | ✅ (assigned cases) | ✅ (operational) | ❌ |

This table is a **starting draft** — I need your confirmation on the flagged cells before I encode it as the authorization source of truth.

---

## 7. System Modules

1. Authentication
2. User Management (users, roles, permissions)
3. Community Member Management
4. Case Management (central module)
5. Case Tracking / Workflow Engine
6. Hearing Management
7. Decision Management
8. Document Management
9. Notifications
10. Reports
11. Audit & Security Logging

---

## 8. Case Lifecycle (state machine)

```
SUBMITTED
   → UNDER_REVIEW
      → VERIFIED
         → ASSIGNED
            → HEARING_SCHEDULED
               → HEARING_IN_PROGRESS  ──┐ (may loop: multiple hearings)
                  → DECISION_PENDING ◀──┘
                     → DECIDED
                        → CLOSED

Side branches (from most states): REJECTED, WITHDRAWN
```

Implementation approach: an explicit **state-transition table** in the backend (allowed `from → to` pairs, plus which role(s) may trigger each transition), enforced server-side on every status-changing endpoint — never inferred from frontend state. Every transition writes a `case_history`/`audit_log` row.

**Open question (see §26):** should `REJECTED` be reachable from `UNDER_REVIEW` only, or also later stages (e.g., a case found improperly filed after assignment)? I've left this configurable but need your ruling before locking the transition table.

---

## 9. Functional Requirements (summary — full list will accompany each phase)

- Authenticate users; enforce role-based access on every endpoint.
- Register and verify community members (verification workflow involving elders, per §11 rule 1).
- Register, search, retrieve, and update cases with full audit trail.
- Enforce the case lifecycle state machine.
- Schedule hearings without double-booking a location or an elder.
- Record decisions with an approval step reflecting elder consensus.
- Store and protect documents behind authorization, never via public URLs.
- Generate filterable, exportable reports (CSV/PDF) respecting permissions.
- Notify relevant users of key case events (in-app first; SMS/email pluggable later).

## 10. Non-Functional Requirements

- **Security:** OWASP ASVS-aligned; no secrets in Git; backend-enforced authorization everywhere.
- **Availability:** single-region deployment target adequate for Bale Robe City scale; documented backup/restore.
- **Performance:** paginated list endpoints, indexed search columns, sub-second typical response for case lookups.
- **Accessibility:** WCAG 2.1 AA-aware components (focus states, labels, contrast, keyboard nav).
- **Internationalization:** English + Afaan Oromo from day one, i18n framework structured for more languages later; culturally/legally sensitive terms kept untranslated where translation risk exists (per your §11 instruction).
- **Auditability:** every state-changing action on a case, decision, document, or user is logged with actor, timestamp, and before/after where relevant.
- **Maintainability:** strict TypeScript, layered backend, no `any` without justification, tests on business-critical logic.

---

## 11. Business Rules — status of each

I'm implementing your 10 listed rules, but flagging where I need a decision rather than inventing one (per your explicit instruction in §4/§28):

| # | Rule | Status |
|---|---|---|
| 1 | Community member may require elder verification before registration/access | **Needs decision:** is verification mandatory for *all* members, or only for those requesting to submit certain case types? I'll default to "configurable per case type" unless told otherwise. |
| 2 | Marriage cases require community confirmation + witness testimony before registration | **Needs decision:** who confirms — any elder, or a quorum? I'll model this as a configurable minimum-witness-count field, defaulting to a value you specify. |
| 3 | Divorce cases require witness testimony + elders' approval per defined workflow | **Needs decision:** single elder sign-off, or consensus among an assigned panel? This determines whether "Decision approval" is a single-approver or multi-approver step (see decision workflow below). |
| 4 | Member must be registered before requesting court services/documents | Straightforward — will enforce as a hard precondition. |
| 5 | Only authorized court personnel register/manage official case info | Enforced via RBAC (§6). |
| 6 | Valid credentials required for authenticated users | Standard auth — enforced. |
| 7 | Community members access only their own authorized case info | Enforced via row-level authorization checks on every case/document endpoint (never client-side filtering alone). |
| 8 | Record officers maintain/update/secure official records | Enforced via RBAC. |
| 9 | Sensitive info protected per role/permission | Enforced via RBAC + document access checks (§14 architecture). |
| 10 | Every important case change is auditable | Enforced via audit log middleware on all mutating case/hearing/decision/document endpoints. |

**On the elder decision/consensus model specifically:** Gadaa-based traditional justice is fundamentally about *collective* elder decision-making, not a single judge ruling. I do **not** want to hard-code "one elder decides" as a default, since that would misrepresent the process. My proposed default — **pending your confirmation** — is:

- A case is assigned to a **panel of elders** (configurable size, e.g., 3–5).
- Each assigned elder can record their input/notes during `HEARING_IN_PROGRESS`.
- A decision moves to `DECIDED` only once a configurable **quorum/consensus threshold** of the panel has recorded approval (e.g., unanimous, or majority — your call).
- A single non-panel actor (e.g., Record Officer) can never finalize a decision alone.

This is a legally/culturally significant default and I want your explicit sign-off before building it.

---

## 12. Database Entities (ERD narrative)

Core entities, normalized to 3NF with junction tables for many-to-many relationships:

- **users** — login identity (admin, elders, record officers). `id (uuid)`, `email`, `password_hash`, `status (active/inactive)`, `created_at`, timestamps.
- **roles**, **permissions**, **role_permissions** — RBAC tables; `user_roles` join table (supports a user holding >1 role, e.g., an elder who is also a record officer, if that occurs in practice — flag if this should be disallowed).
- **community_members** — separate from `users` (a community member may or may not have a login). Links to `users.id` nullable, plus verification status, identification/reference info.
- **cases** — `case_number` (human-readable, sequential/formatted per your convention — needs a decision, see §26), `case_type`, `status`, `priority`, `location`, `description`, `submitted_by`, `created_at`, `updated_at`.
- **case_parties** — junction: links `cases` to `community_members` with a `role_in_case` (complainant/respondent).
- **witnesses**, **case_witnesses** — witnesses can be linked to multiple cases over time; junction table carries per-case testimony metadata.
- **case_assignments** — junction: `cases` ↔ `users` (elders/panel members), replacing a naive single `assigned_to` column so the elder-panel model in §11 is representable.
- **hearings** — `case_id`, `date`, `start_time`, `end_time`, `location`, `purpose`, `status`, `outcome_notes`.
- **hearing_participants** — junction: `hearings` ↔ `users`/`community_members`/`witnesses`.
- **decisions** — `case_id`, `decision_date`, `outcome`, `description`, `approval_status`.
- **decision_approvals** — junction: `decisions` ↔ `users` (panel members), one row per elder's approval — this is what makes consensus auditable and queryable.
- **documents** — metadata only (`filename`, `mime_type`, `size`, `case_id`, `uploaded_by`, `storage_key`); physical bytes live in the storage layer, never a public path.
- **notifications** — `user_id`, `type`, `payload`, `read_at`.
- **audit_logs** — `actor_id`, `action`, `entity_type`, `entity_id`, `before/after (JSON)`, `ip_address`, `created_at`. Append-only; no update/delete permission for any application role.

All PKs are application-generated UUIDv7 (time-ordered — good index locality on MySQL's clustered InnoDB indexes, unlike random v4), stored as `CHAR(36)`. All FKs enforce referential integrity; soft-delete (`archived_at`) is used for cases/documents (legal records shouldn't be hard-deleted); hard delete is reserved for true junk data by admins only, itself audit-logged.

---

## 13. API Architecture

```
/api/v1/auth            login, logout, refresh, password-reset
/api/v1/users            admin user CRUD, activation
/api/v1/roles            role/permission management
/api/v1/community-members  registration, verification, search
/api/v1/cases             CRUD, search/filter/paginate, status transitions
/api/v1/hearings          scheduling, conflict checks
/api/v1/decisions         recording, approvals
/api/v1/documents         upload, protected download, metadata
/api/v1/notifications     list, mark-read
/api/v1/reports           filtered/exportable report endpoints
/api/v1/audit-logs        admin-only read
/api/v1/health            liveness/readiness for deployment
```

Every list endpoint: cursor or offset pagination (offset+limit to start, simpler for admin UIs), `sort`, and filter query params validated by a shared Zod schema. Every error response uses one consistent envelope (`{ error: { code, message, requestId } }`) — no stack traces, no raw DB errors, ever, in production responses.

---

## 14. Frontend Architecture

```
src/
  api/          # typed API client functions, one per resource
  components/   # reusable, presentation-focused UI (buttons, tables, badges)
  features/     # feature-sliced modules (cases/, hearings/, decisions/, users/…)
  forms/        # React Hook Form + Zod schemas (shared with backend where possible)
  hooks/        # shared hooks (usePermission, useAuth, etc.)
  layouts/      # role-specific dashboard shells
  pages/        # route-level components
  routes/       # React Router route config, guarded by role
  types/        # shared TS types (generated/derived from Zod where possible)
  utils/
  i18n/         # English + Afaan Oromo resource files
```

Role-specific dashboards (Admin / Court Manager / Record Officer / Community Member) share layout primitives but have separate route trees, each guarded both by a route guard (UX) and — critically — the backend re-checking authorization independently (never trust the frontend guard as a security boundary).

---

## 15. Backend Architecture

```
src/
  config/        # env loading/validation (fails fast on missing secrets)
  modules/       # one folder per domain: auth/, users/, cases/, hearings/, decisions/, documents/, notifications/, reports/, audit/
    <module>/
      <module>.routes.ts
      <module>.controller.ts
      <module>.service.ts        # business logic, state machine rules
      <module>.repository.ts     # Prisma queries isolated here
      <module>.validators.ts     # Zod schemas
  middleware/    # auth, error handler, request-id, rate limiter, RBAC guard
  database/      # Prisma schema, migrations, seed scripts
  jobs/          # scheduled/background tasks (e.g., hearing reminders)
  utils/
  types/
```

Controllers stay thin (parse/validate → call service → shape response). Services hold business rules (state transitions, consensus logic, workflow rules) and are the unit-test target. Repositories isolate all Prisma calls so business logic never leaks SQL/ORM concerns.

---

## 16. Security Architecture

- Argon2id password hashing; account lockout after N failed attempts (configurable) + rate limiting on `/auth/*`.
- Access token (short-lived JWT) + refresh token (longer-lived, HTTP-only, `Secure`, `SameSite=Strict` cookie, rotated on use).
- CSRF protection on cookie-authenticated mutating routes.
- RBAC + permission middleware on every route; row-level ownership checks for community members' own data.
- Helmet-equivalent security headers; strict CORS allow-list (no wildcard origins).
- All input validated server-side with Zod regardless of frontend validation.
- File upload: MIME/type allow-list, size limits, storage outside the web root, virus-scan integration point left as a pluggable hook (no scanner is bundled by default — flag if you want a specific engine, e.g., ClamAV, wired in).
- Structured audit logging (§17) separate from application/error logs, append-only, admin-only readable.
- Secrets via environment variables only, validated at boot (app refuses to start if a required secret is missing) — never defaulted silently.

---

## 17. Document-Management Architecture

- Documents are **never** served from a static/public path.
- Upload: `POST /api/v1/documents` (multipart) → file streamed to storage, row written to `documents` table with a `storage_key`, not a URL.
- Download: `GET /api/v1/documents/:id` → middleware chain checks (1) authenticated (2) role (3) permission (4) case-ownership/assignment → then streams the file through the API (or issues a short-lived signed URL if using S3-compatible storage) — the browser never gets a durable direct link.
- Storage abstraction (`StorageAdapter` interface) with a local-filesystem implementation for v1 and a drop-in S3-compatible implementation for later, so migrating off local disk doesn't touch business logic.

---

## 18. Notification Architecture

- In-app notifications table (§12) populated by domain events (case submitted, hearing scheduled, decision recorded, etc.) via a simple internal event/listener pattern — not a message queue, which would be over-engineering at this scale.
- Notification "channel" is abstracted (`NotificationChannel` interface) so an SMS or email adapter can be added later without changing the call sites that raise notifications.

## 19. Reporting Architecture

- Shared report-query layer: each report is a parameterized, permission-checked query (filters: date range, status, type, assignee) with a common pagination/summary-statistics shape.
- Export: CSV generated directly from the query result; PDF export via a server-side rendering step (e.g., a lightweight PDF library) reusing the same underlying data — never two divergent code paths for "screen" vs "export" numbers.

## 20. Audit Architecture

- Append-only `audit_logs` table, populated by a single centralized `recordAudit()` service call invoked from within each mutating service method (not scattered ad hoc across controllers) — this guarantees consistency and makes "did we log this action" reviewable in one place.
- Audit log read access restricted to Administrators only, per your rule 9/10.

---

## 21. Folder Structure (top level)

```
otcms/
  frontend/            # current Vite app content moves here (or stays at root — see §26)
  backend/
  docker/
    docker-compose.yml
    Dockerfile.backend
    Dockerfile.frontend
    nginx.conf
  docs/
    architecture.md
    database.md
    api.md
    security.md
    deployment.md
    user-guide.md
    admin-guide.md
  .env.example
  .gitignore
  README.md
```

**Note:** your uploaded scaffold currently has the frontend at the repo root and an empty `backend/` folder. I'd restructure to `frontend/` + `backend/` siblings for clean separation — flag if you'd rather keep frontend at root.

---

## 22. Development Phases (per your §29, unchanged)

Setup → Database/migrations → Auth → Users/Roles/Permissions → Community Members → Case Management → Case Workflow → Hearings → Decisions → Documents → Notifications → Reports → Audit Logs → Frontend integration → Testing → Security hardening → Docker/deployment → Final documentation.

Each phase ends with: TypeScript compiles clean, lint passes, tests for that phase's business logic pass, and a short written summary of what's implemented vs. deferred (no "everything is complete" claims per your §34 rule).

## 23. Testing Strategy

- **Unit:** service-layer business rules — state transitions, consensus/approval logic, RBAC decisions, validation schemas.
- **Integration:** Supertest against a real (test) MySQL database via Prisma — auth flows, permission enforcement, case workflow end-to-end at the API layer.
- **E2E:** Playwright covering the critical path you listed in §18 (admin login → user creation → member registration → case submission → review → assignment → hearing → decision → closure → member tracking) plus explicit unauthorized-access attempts (e.g., a community member trying to fetch another member's case by ID must get 403/404, not data).

## 24. Deployment Architecture

- Docker Compose for local dev (MySQL 9.7 + backend + frontend dev server).
- Production: multi-stage Docker build for backend; frontend built to static assets served by Nginx, which also reverse-proxies `/api` to the backend container.
- HTTPS via Nginx (Let's Encrypt/cert of your choosing) — guidance provided, not automated, since certificate provisioning depends on your hosting environment.
- `/api/v1/health` endpoint for container health checks.
- Documented backup strategy: scheduled `mysqldump` (or `mydumper` for larger datasets), retention policy, and a tested restore procedure (a backup that's never been restored isn't a real backup — this gets an explicit test in the deployment docs).
- I will **not** claim the system is "production-ready" until Phase 16 (security hardening) and Phase 17 (deployment) are actually done and verified — per your §22/§34 rules.

---

## 25. Risks

- **Legal/cultural risk:** getting the elder-consensus and verification workflows wrong would misrepresent Gadaa-based process, not just be a software bug. This is why §11's open items are gated on your explicit decision rather than my assumption.
- **Translation risk:** incorrect Afaan Oromo legal terminology could cause real confusion; default is to preserve original terms where translation is uncertain, per your instruction.
- **Single point of failure:** a single-server deployment (likely, at this scale) means backup/restore discipline matters more than exotic scaling work — reflected in the phase ordering above.
- **Scope size:** this is a large system. I'll build and check it in the ordered phases (§29) rather than attempting everything at once, so problems surface early and cheaply.

## 26. Assumptions Made (flag any you want changed)

- Repo will be restructured into `frontend/` + `backend/` siblings.
- Offset-based pagination for v1 (simpler; can move to cursor-based later if lists get very large).
- Local filesystem storage for documents in v1, with the storage layer abstracted for a later move to S3-compatible storage.
- Case numbers: I'll default to a format like `OTCMS-{year}-{sequence}` unless you specify Bale Robe City's actual existing case-numbering convention (if one exists from the current paper process, we should match it for continuity).
- A user account may hold more than one role unless you tell me to restrict to exactly one role per user.

## 27. Questions Requiring Your Decision (please answer before I start Phase 1)

1. **Elder consensus model (§11):** Is my proposed panel + quorum/threshold model correct, and if so, what's the default panel size and approval threshold (unanimous vs. majority)?
2. **Verification rule (§11, rule 1):** Should elder verification be mandatory for every community member, or only for members submitting certain case types?
3. **Marriage/divorce witness rules (§11, rules 2–3):** What is the minimum witness count, and who has authority to confirm/approve — any assigned elder, or specifically a quorum?
4. **Court Manager vs. Elder — one role or two?** Your spec (§5.2) merges "Court Manager / Abbaa Seeraa / Judge / Elders" into one actor. Should these be modeled as one role with one permission set, or should "Court Manager" (administrative/case-assignment authority) be separated from "Elder/Jaarsaa Biyyaa" (panel decision-maker)? This materially affects the permission matrix in §6.
5. **Case status branches:** Should `REJECTED` be reachable only from early states (`SUBMITTED`/`UNDER_REVIEW`), or from any state up to `DECIDED`?
6. **Case numbering convention:** Is there an existing paper-process numbering format we should match?
7. **Community self-registration:** Can a community member self-register and request verification, or must an elder/officer always initiate registration on their behalf?
8. **Storage target:** Local disk is fine for v1 — do you already know your production hosting environment (e.g., a specific VPS, or eventual cloud/object storage), so I size the storage abstraction correctly from the start?

---

### Next step

This is the full architecture blueprint per your Phase 0 instructions — **I have not written any implementation code.** Please review, correct anything that doesn't match your intent, and answer the questions in §27 (even partial answers unblock most of the work — items 4–7 are the ones that actually gate Phase 1–6 implementation). Once confirmed, I'll proceed to Phase 1 (project setup) in the order you specified.

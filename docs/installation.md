# OTCMS — Installation & Local Verification Guide

This walks through getting Phases 1–13 running and verified on your machine.
None of this has been executed from the build sandbox (no network/DB access
there), so please run through it before we build the frontend on top of it.

## 1. Prerequisites

- Node.js 24+ (`node -v`)
- MySQL 9.7 running locally, OR Docker + Docker Compose (recommended — skips
  installing MySQL yourself)
- `openssl` (for generating secrets) — preinstalled on macOS/Linux

## 2. Fastest path: Docker Compose (MySQL only)

```bash
# From the repo root
docker compose up -d mysql
```

This starts just the database so you can run the backend natively (faster
iteration than rebuilding a container on every change).

## 3. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
- Set `DATABASE_URL` to match the Compose MySQL credentials, e.g.:
  `mysql://otcms:changeme@localhost:3306/otcms`
- Generate real secrets and paste them in:
  ```bash
  openssl rand -base64 48   # run twice — once for JWT_ACCESS_SECRET, once for JWT_REFRESH_SECRET
  ```

Install and run migrations:

```bash
npm install
npm run prisma:migrate:dev -- --name init
```

This is the step that actually generates `prisma/migrations/` SQL from
`schema.prisma` — I could not run this from the sandbox, so this migration
does not exist in the zip yet. Prisma will create it and apply it to your
MySQL instance.

Seed baseline roles/permissions + a demo admin account:

```bash
npm run seed
```

You should see a log line confirming the demo admin
(`admin@otcms.local` / the password from `.env`'s `SEED_ADMIN_PASSWORD`,
default `ChangeMe12345!`) was created.

Start the API:

```bash
npm run dev
```

Expected: `OTCMS API listening` on port 4000, no errors.

## 4. Verify it's alive

```bash
curl http://localhost:4000/api/v1/health/live
curl http://localhost:4000/api/v1/health/ready   # confirms DB connectivity
```

## 5. Smoke-test the API

```bash
# Log in as the seeded demo admin
curl -i -c cookies.txt -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@otcms.local","password":"ChangeMe12345!"}'
```

Copy the `accessToken` from the JSON response, then:

```bash
TOKEN="paste-the-access-token-here"

curl http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:4000/api/v1/roles \
  -H "Authorization: Bearer $TOKEN"

# Refresh flow (uses the httpOnly cookie saved by -c above)
curl -i -b cookies.txt -X POST http://localhost:4000/api/v1/auth/refresh
```

If all of these return 200s with sensible JSON (not 500s), Phases 1–4 and
the auth/RBAC plumbing are verified working end-to-end against a real
MySQL database.

## 6. Run the automated tests

```bash
npm run typecheck   # tsc --noEmit — should report 0 errors
npm run lint         # should report 0 errors/warnings
npm run test         # runs the case-workflow unit tests (no DB required)
```

If `typecheck` or `lint` surface anything, that's genuinely useful signal —
please share the output and I'll fix it. I wrote this code carefully but
have not had a compiler or linter confirm it, which is a real gap I want
closed before we build more on top of it.

## 7. Try a full case lifecycle manually (optional but recommended)

Roughly: create a community member → verify them (needs an ADMIN/
COURT_MANAGER-roled user) → create a Record Officer user and log in as
them → create a case with that member as a party → transition
`SUBMITTED → UNDER_REVIEW → VERIFIED` → assign an elder panel → transition
through hearings → record and approve a decision → confirm the case lands
on `DECIDED` then `CLOSED`. Each step's required role/permission is listed
in `docs/architecture.md` §6.

## 8. Everything via Docker Compose (optional, once the above works)

```bash
docker compose up --build
```

Frontend will be at `http://localhost:8080`, proxying `/api` to the backend
container. (Note: the frontend has no OTCMS-specific UI yet — Phase 14 is
still pending — so this currently just serves the default Vite starter page.)

## Known gaps to expect

- No `prisma/migrations/` folder is checked in yet — step 3 generates it.
- `package-lock.json` is not checked in for either frontend or backend —
  `npm install` will generate one; commit it once you're happy with the
  resolved versions.
- If MySQL 9.7 isn't available in your environment, MySQL 8.4 LTS will also
  work with this schema — just adjust the Docker image tag and expect no
  `uuid(7)` acceleration benefit (Prisma still generates the UUIDs
  client-side either way, so functionally nothing breaks).

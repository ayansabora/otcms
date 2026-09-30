# OTCMS — Security Documentation

Status of every control listed in docs/architecture.md §13/§16, reviewed as
part of Phase 16. Legend: ✅ implemented · ⚠️ partial/needs attention before
production · ❌ not implemented.

## Authentication & session security

| Control | Status | Notes |
|---|:---:|---|
| Argon2id password hashing | ✅ | `utils/password.ts`, OWASP baseline params |
| Secure password policy | ✅ | 12+ chars, letter+number, enforced server-side (`isPasswordCompliant`) |
| Account lockout after repeated failures | ✅ | Configurable via `LOGIN_MAX_FAILED_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES` |
| Login-enumeration resistance | ✅ | Same error message/shape for unknown-email vs. wrong-password; same for password-reset requests |
| Short-lived access token + rotating refresh token | ✅ | Access token: `Authorization` header only, never a cookie. Refresh: httpOnly/Secure(prod)/SameSite=Strict cookie, rotated every use, with reuse-detection killing the token family |
| CSRF protection on cookie-authenticated routes | ✅ | `middleware/csrf.ts` — custom-header check on `/auth/refresh` and `/auth/logout` (the only two cookie-authenticated routes), on top of SameSite=Strict |
| Session invalidation on password change/reset | ✅ | All refresh tokens revoked in `authService.changePassword`/`resetPassword` |

## Authorization

| Control | Status | Notes |
|---|:---:|---|
| RBAC enforced server-side | ✅ | `requirePermission`/`requireRole` middleware + in-service checks (e.g. `casesService.assertCanView`) — never trusts a frontend route guard |
| Row-level ownership checks | ✅ | Cases, hearings (partial — see below), documents, decisions all check caller-specific access, not just role |
| Least privilege / granular permissions | ✅ | ~19 named permission codes rather than 4 coarse roles — see `database/seed/rbacSeedData.ts` |
| Hearings list row-level scoping | ⚠️ | Requires an explicit `caseId` + ownership check for `case:view_own`-only callers; not yet scoped for a hypothetical unscoped "my hearings" view |

## Input validation & injection

| Control | Status | Notes |
|---|:---:|---|
| Server-side validation on every input | ✅ | Zod schemas on every controller, independent of frontend validation |
| SQL injection prevention | ✅ | Prisma parameterizes all queries; the one raw-SQL usage (`dbReset.ts`) is test-only, guarded against non-test databases, and never takes user input |
| XSS protection | ✅ | React escapes all rendered content by default; no `dangerouslySetInnerHTML` anywhere in the frontend; API responses are JSON, not rendered HTML |
| File upload type validation | ✅ | MIME allow-list (`upload.middleware.ts`) **and** magic-byte signature verification (`utils/fileSignature.ts`) — the latter added in Phase 16 specifically to stop a spoofed Content-Type header |
| File upload size limits | ✅ | `FILE_MAX_SIZE_MB`, enforced by multer |
| Malware scanning | ❌ | Deliberately left as a pluggable hook, no scanner bundled — flagged in architecture.md §13. **Do not deploy to production accepting real user uploads without wiring one in** (e.g. ClamAV) |

## Transport & headers

| Control | Status | Notes |
|---|:---:|---|
| Security headers (Helmet) | ✅ | `app.ts` — CSP, frame-ancestors, noSniff, etc. |
| Production CSP | ✅ | Explicit directive list added in Phase 16 (previously deferred to Helmet defaults) |
| HSTS | ✅ | Enabled only in production (meaningless without HTTPS, which is only guaranteed in the Nginx-fronted production deployment) |
| CORS allow-list | ✅ | `CORS_ORIGIN` env var, comma-separated, credentials-aware |
| HTTPS | ⚠️ | Nginx config provisions the reverse-proxy side; actual TLS certificate provisioning is an operational step, not code — see docs/deployment.md |

## Rate limiting & abuse prevention

| Control | Status | Notes |
|---|:---:|---|
| General rate limiting | ✅ | `middleware/rateLimiter.ts`, `RATE_LIMIT_*` env vars |
| Stricter auth-endpoint rate limiting | ✅ | `AUTH_RATE_LIMIT_MAX`, applied to the whole `/auth` router |
| Brute-force protection | ✅ | Combination of rate limiting + account lockout |

## Secrets & configuration

| Control | Status | Notes |
|---|:---:|---|
| No hardcoded secrets | ✅ | `config/env.ts` fails fast (`process.exit(1)`) if `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` are missing or under 32 chars |
| `.env` never committed | ✅ | `.gitignore` at root and in `backend/` |
| Demo/seed accounts clearly marked | ✅ | `database/seed/index.ts` — gated behind `NODE_ENV !== "production"`, logged with an explicit "development only" warning |

## Logging & auditing

| Control | Status | Notes |
|---|:---:|---|
| Structured logging | ✅ | Pino, with `redact` config stripping passwords/tokens/cookies even from accidental logging calls |
| No sensitive data in logs | ✅ | Same redact list; document contents are never logged (only metadata) |
| Audit trail for sensitive actions | ✅ | `recordAudit()` called from every mutating auth/case/hearing/decision/document/user service method |
| Audit log tamper-resistance | ⚠️ | Append-only by convention (no update/delete route exists) — not enforced at the database level via a trigger/permission grant, which would be the stronger guarantee for a production deployment |

## Known gaps / recommended before a real production launch

1. **Malware scanning** is not wired in — see above.
2. **Database-level audit-log immutability** (a DB user/trigger that physically cannot UPDATE/DELETE `audit_logs`) is stronger than application-level convention alone.
3. **Secrets rotation process** is not documented — `JWT_*_SECRET` rotation would currently invalidate all sessions at once; a rotation strategy (e.g. dual-secret verification during a transition window) isn't built.
4. **Dependency vulnerability scanning** (`npm audit` / Dependabot / Snyk) isn't wired into any CI process, because there is no CI process yet (see docs/testing.md).
5. This entire checklist reflects **code review, not a penetration test**. A real pre-launch security review should include one.

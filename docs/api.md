# OTCMS — API Reference

Base URL: `/api/v1`. All endpoints except `/health/*` and `/auth/login`
require `Authorization: Bearer <accessToken>`. Responses are JSON;
errors follow `{ error: { code, message, requestId, details? } }`.

This is a hand-written reference matching the actual implemented routes —
not a generated OpenAPI spec (that's a documented gap; see bottom).

## Auth — `/auth`
| Method & path | Auth | Permission | Notes |
|---|---|---|---|
| POST `/login` | none | — | Returns `{ accessToken, user }`, sets refresh cookie |
| POST `/refresh` | refresh cookie + CSRF header | — | Rotates the refresh token |
| POST `/logout` | refresh cookie + CSRF header | — | Revokes the token family |
| POST `/password-reset/request` | none | — | Always 202, regardless of whether the email exists |
| POST `/password-reset/confirm` | none | — | `{ token, newPassword }` |
| GET `/me` | bearer | — | Returns the decoded token's `sub`/`roles`/`permissions` |
| POST `/change-password` | bearer | — | `{ currentPassword, newPassword }` |

## Users — `/users`
| Method & path | Permission |
|---|---|
| GET `/` | `user:manage` |
| POST `/` | `user:manage` |
| GET `/:id` | `user:manage` |
| PATCH `/:id` | `user:manage` |
| PATCH `/:id/status` | `user:manage` |
| PATCH `/:id/roles` | `role:manage` |

## Roles — `/roles`
| Method & path | Permission |
|---|---|
| GET `/` | `user:manage` or `role:manage` |

## Community Members — `/community-members`
| Method & path | Permission |
|---|---|
| GET `/` | `member:view` |
| POST `/` | `member:register` |
| GET `/:id` | `member:view` |
| PATCH `/:id/verification` | `member:verify` |

## Cases — `/cases`
| Method & path | Permission | Notes |
|---|---|---|
| GET `/` | view scope¹ | Filters: `status`, `caseType`, `search`, `dateFrom`, `dateTo` |
| POST `/` | `case:create` | Both parties must be `VERIFIED` community members |
| GET `/:id` | view scope¹ | |
| GET `/:id/history` | view scope¹ | |
| POST `/:id/transition` | target-specific² | `{ toStatus, note? }` |
| POST `/:id/assign-panel` | `case:assign` | `{ userIds[], leadUserId? }` |
| POST `/:id/witnesses` | `case:update` or `case:create` | |

¹ view scope = `case:view_all` (everything) / `case:view_assigned` (assigned cases only) / `case:view_own` (own submitted cases only) — enforced server-side per caller.
² see `modules/cases/case.workflow.ts` — each target status requires a specific permission.

## Hearings — `/hearings`
| Method & path | Permission |
|---|---|
| GET `/` | view scope (requires `caseId` unless caller has `case:view_all`/`case:view_assigned`/`hearing:manage`) |
| POST `/` | `hearing:manage` |
| GET `/:id` | view scope |
| PATCH `/:id/reschedule` | `hearing:manage` |
| PATCH `/:id/status` | `hearing:manage` |
| POST `/:id/participants` | `hearing:manage` |

## Decisions — `/decisions`
| Method & path | Permission |
|---|---|
| GET `/?caseId=` | view scope or `decision:record`/`decision:approve` |
| POST `/` | `decision:record` (and must be an assigned panel member) |
| GET `/:id` | view scope |
| POST `/:id/approve` | `decision:approve` (and must be an assigned panel member) |

## Documents — `/documents`
| Method & path | Permission | Notes |
|---|---|---|
| GET `/?caseId=` | `document:read` | |
| POST `/` (multipart, field `file`) | `document:upload` | `{ caseId? or decisionId?, category? }` in body |
| GET `/:id` | `document:read` | Streams the file — this is the ONLY way to fetch document bytes |
| DELETE `/:id` | `document:upload` | Soft-archive, not a hard delete |

## Notifications — `/notifications`
| Method & path | Permission |
|---|---|
| GET `/` | none beyond auth (self-scoped) |
| PATCH `/:id/read` | none beyond auth (self-scoped) |
| PATCH `/read-all` | none beyond auth (self-scoped) |

## Reports — `/reports`
All require `report:generate`. Each accepts `?dateFrom=&dateTo=&format=csv|json`.

- GET `/cases-by-status`
- GET `/cases-by-type`
- GET `/pending-cases`
- GET `/hearing-schedule`
- GET `/decisions-summary`
- GET `/document-statistics`

## Audit Logs — `/audit-logs`
| Method & path | Permission |
|---|---|
| GET `/` | `audit:read`. Filters: `entityType`, `entityId`, `actorUserId`, `action`, `dateFrom`, `dateTo` |

## Health — `/health`
| Method & path | Auth |
|---|---|
| GET `/live` | none |
| GET `/ready` | none |

## Gaps

- **No OpenAPI/Swagger spec** — architecture.md §9 suggested this "if
  appropriate"; a hand-maintained markdown table was judged sufficient
  for the current API surface, but a generated spec (e.g. via
  `zod-to-openapi` on the existing Zod validators) would be the right
  next step if third-party API consumers are ever expected.
- **No pagination/response-envelope examples** — see `utils/pagination.ts`
  for the exact shape (`{ items, page, pageSize, total, totalPages }`).

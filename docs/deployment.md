# OTCMS — Deployment Guide

## Status

`docker-compose.yml`, `docker/Dockerfile.backend`, `docker/Dockerfile.frontend`,
and `docker/nginx.conf` exist and are believed correct, but **have never
been built or run** — I have no network/Docker access in the environment
that wrote this code. Building these for the first time counts as testing
them, not just deploying them. Budget time for that.

## Architecture recap

```
Internet → Nginx (TLS termination, static SPA, reverse-proxy /api) → Node API → MySQL
```

Nginx and the backend run in separate containers; MySQL runs in its own
container with a named volume for data persistence.

## Pre-deployment checklist

Work through `docs/security.md` first — in particular:
- [ ] Real, unique secrets generated for `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (never the `.env.example` placeholders)
- [ ] `NODE_ENV=production` set for the backend container
- [ ] Demo/seed admin account either not seeded in production, or its password changed immediately (the seed script already refuses to run when `NODE_ENV=production`, per `database/seed/index.ts` — confirm this is actually the env value in your deployment)
- [ ] `CORS_ORIGIN` set to your real domain, not `localhost`
- [ ] A malware-scanning hook wired into the document upload path if this will accept real user uploads (see docs/security.md gap #1)
- [ ] TLS certificate provisioned (see below)

## HTTPS / TLS

`docker/nginx.conf` as shipped serves plain HTTP on port 80 — it does not
provision a certificate itself (certificate acquisition depends on your
hosting environment: a reverse proxy in front like Caddy/Traefik with
automatic Let's Encrypt, a managed load balancer's TLS termination, or
running `certbot` against this Nginx container directly). Whichever you
choose, mount the resulting cert/key into the frontend container and add
a `listen 443 ssl;` server block to `nginx.conf`, redirecting port 80 to
443. `HSTS` is already enabled in the backend's Helmet config specifically
for `NODE_ENV=production`, but it only makes sense once HTTPS is actually
in front of it — don't enable HSTS before HTTPS works, or you can lock
users out of a broken HTTP-only deployment for the `max-age` duration.

## First deployment

```bash
# From the repo root
cp backend/.env.example backend/.env
# edit backend/.env: real secrets, NODE_ENV=production, real CORS_ORIGIN

docker compose up --build -d

# Run migrations against the containerized MySQL
docker compose exec backend npx prisma migrate deploy

# Seed baseline roles/permissions (safe to run in production — this part
# is NOT gated by NODE_ENV, only the demo admin account is)
docker compose exec backend npm run seed
```

## Backups

```bash
# Backup
docker compose exec mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" otcms > backup-$(date +%F).sql

# Restore (into a FRESH database — this does not merge, it replaces)
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" otcms < backup-2026-01-01.sql
```

Schedule the backup command via cron/systemd-timer on the host, with
off-host retention (a backup that lives on the same disk as the database
protects against nothing but human error, not hardware failure). **Test
the restore command at least once before you need it for real** — an
unverified backup is not a backup.

## Health checks

- `GET /api/v1/health/live` — process is up (container orchestrators use this for restart decisions)
- `GET /api/v1/health/ready` — process is up AND can reach MySQL (use this before routing real traffic to a newly-started container)

Both Dockerfiles already declare a `HEALTHCHECK` using these.

## Rolling back

Docker Compose here doesn't implement blue/green or rolling deploys —
`docker compose up --build -d` replaces containers in place. For a
court-records system, prefer: take a backup immediately before any
deploy, deploy, run `health/ready`, and keep the previous image tag
available to `docker compose up -d --no-build <service>` back to if the
new version misbehaves.

## What's NOT set up here

- No CI/CD pipeline (see docs/testing.md)
- No automated backup scheduling (the commands above are manual)
- No log aggregation/shipping beyond stdout (Pino logs to stdout;
  pipe/collect this with your platform's usual tooling — e.g. `docker
  compose logs`, or a log shipper if you have a centralized logging stack)
- No monitoring/alerting on the health endpoints

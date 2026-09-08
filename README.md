# OTCMS — Oromoo Traditional Court Management System

A case-management system for Oromo traditional court activities in Bale Robe City, Ethiopia,
built to support (not replace) Gadaa-based traditional justice processes: elder-panel
decision-making, witness testimony, community verification, and confidential case handling.

**Status:** Phase 1 (project setup) in progress. See `docs/architecture.md` for the full
system blueprint, open business-rule decisions, and phase plan.

## Structure

```
otcms/
  frontend/   React + TypeScript + Vite + Tailwind SPA
  backend/    Node + TypeScript + Express + Prisma API
  docker/     Dockerfiles + Nginx config
  docs/       Architecture, database, API, security, deployment docs
```

## Tech stack (verified current, September 2026)

| Layer | Choice | Version |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS | 19.2 / 6.0 / 8.0 / 4.3 |
| Backend | Node.js + Express | 24 LTS / 5.2 |
| Database | MySQL | 9.7 LTS |
| ORM | Prisma | 7 |

Full rationale for each choice is in `docs/architecture.md`.

## Local development

### Prerequisites
- Node.js 24+
- MySQL 9.7 (or run via Docker Compose — see below)

### Backend
```bash
cd backend
cp .env.example .env      # then fill in real secrets — never commit .env
npm install
npm run prisma:migrate:dev
npm run dev                # http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

### Everything via Docker Compose
```bash
docker compose up --build
```

## Open decisions blocking full business-logic implementation

Several legally/culturally sensitive rules (elder-panel consensus thresholds, member
verification requirements, marriage/divorce witness rules, and whether "Court Manager"
and "Elder/Jaarsaa Biyyaa" are one role or two) are implemented with **configurable
defaults**, not final hard-coded behavior. See `docs/architecture.md` §11/§27 for the
full list — these need sign-off before Phase 6 (Case Management business logic) is
considered final.

## License

Proprietary — internal project for Bale Robe City court administration.

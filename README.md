# ATLAS — Real Estate Intelligence Operating System

ATLAS is the operating system for real estate financing, investment, crowdfunding and
fractional-ownership professionals. This repository contains the first delivery phase:
the technical foundation plus two fully functional modules, **Cockpit** and
**Portefeuille**.

This is not a demo. Every screen in this phase is wired to a real PostgreSQL-backed
API, with authentication, persistence, and no mocked data.

## What's in this phase

- **Foundation** — monorepo, auth (JWT access/refresh), multi-tenant data model,
  design system, Command Palette (⌘K), dark/light mode.
- **Cockpit** — daily dashboard: KPIs, today's tasks, priorities, 7-day agenda,
  pipeline chart, alerts, recent activity, and a deterministic auto-generated summary.
- **Portefeuille** — full deal portfolio: Kanban (drag-and-drop stage changes), List,
  sortable Table, and Map views, with filters, tags, and a deal detail drawer
  (overview, notes, tasks, documents).

Everything else in the product spec (Dossiers, Intelligence Marché, Intelligence
Concurrentielle, Knowledge Graph, Cartographie module, Agents IA…) is architected for
but intentionally **not** built in this phase — the sidebar marks those modules
"Bientôt" rather than shipping half-finished placeholders.

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui-style components,
  Framer Motion, React Router, React Hook Form + Zod, Zustand, TanStack Query,
  Recharts, dnd-kit, react-leaflet.
- **Backend**: NestJS, Prisma, PostgreSQL, Redis (BullMQ-ready), JWT auth.
- **Storage**: pluggable — local disk by default, S3-compatible (AWS S3, MinIO,
  Scaleway, OVH…) via env vars.

## Monorepo layout

```
apps/
  api/    NestJS backend (REST API, Prisma schema, migrations, seed)
  web/    React frontend (Vite)
packages/
  shared/ (reserved for cross-app shared types as the product grows)
docker-compose.yml   Postgres, Redis, Meilisearch for local dev
```

## Getting started

```bash
pnpm install

# Start infra (Postgres, Redis, Meilisearch)
docker compose up -d

# Configure env
cp .env.example apps/api/.env
cp .env.example apps/web/.env   # only VITE_API_URL is read by the frontend

# Database
pnpm --filter @atlas/api prisma:migrate
pnpm --filter @atlas/api prisma:seed

# Run
pnpm dev:api    # http://localhost:3001/api/v1  (Swagger: /api/docs)
pnpm dev:web    # http://localhost:5173
```

Demo login (seeded): `nick.banza@outlook.com` / `Atlas2026!`

## API documentation

OpenAPI/Swagger is served at `/api/docs` when the API is running.

# ATLAS — Real Estate Intelligence Operating System

ATLAS is the operating system for real estate financing, investment, crowdfunding and
fractional-ownership professionals.

This is not a demo. Every screen is wired to a real PostgreSQL-backed API, with
authentication and persistence — no mocked data.

## What's built

- **Foundation** — monorepo, auth (JWT access/refresh), multi-tenant data model,
  design system, Command Palette (⌘K) with federated search, dark/light mode.
- **Cockpit** — daily dashboard: KPIs, today's tasks, priorities, 7-day agenda,
  pipeline chart, alerts, recent activity, and a deterministic auto-generated summary.
- **Portefeuille** — full deal portfolio: Kanban (drag-and-drop stage changes), List,
  sortable Table, and Map views, with filters, tags, and a deal detail drawer.
- **Dossiers** — dedicated per-deal page: guarantees, a financial model with
  sensitivity scenarios, and a full Score ATLAS breakdown.
- **Score ATLAS** — a transparent, explainable scoring engine computed from real
  platform data (documentation, punctuality, funding progress, network density…).
  Not an official financial rating.
- **Knowledge Graph** — promoteurs, banques, notaires, architectes, collectivités,
  investisseurs and plateformes, with an interactive React Flow visualization of
  every relation.
- **Cartographie** — dedicated full-page map layering opérations and géolocalised
  intervenants, with toggleable layers.
- **Intelligence Concurrentielle** — profiles for the named crowdfunding and
  fractional-ownership platforms, seeded with public facts only (name/category/site).
- **Intelligence Marché** — a news pipeline (BullMQ + dedup + priority alerts) with a
  working data.gouv.fr open-data connector plus manual entry.
- **Agents IA** — seven specialized agents (Analyst, Market, Competitor, Risk, Legal,
  Investment, Committee) with dedicated system prompts and a chat UI, wired to the
  Anthropic API.

Two integration points need credentials/network this environment may not have:
- **Agents IA** requires `ANTHROPIC_API_KEY` — without it, the endpoint returns a
  clear error instead of a fabricated reply.
- **Recherche Universelle** requires Meilisearch running — without it, universal
  search degrades gracefully (deals still searchable via PostgreSQL).

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui-style components,
  React Router, React Hook Form + Zod, Zustand, TanStack Query, Recharts, dnd-kit,
  react-leaflet, @xyflow/react.
- **Backend**: NestJS, Prisma, PostgreSQL, Redis + BullMQ, Meilisearch, JWT auth,
  Anthropic SDK.
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
# To activate Agents IA, set ANTHROPIC_API_KEY in apps/api/.env

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

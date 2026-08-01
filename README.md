# ATLAS — Estrella Capital OS

Le système d'exploitation d'Estrella Capital : plateforme privée d'analyse et de gestion d'investissements immobiliers. Non commercialisée — conçue uniquement pour Estrella Capital.

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). **Aucune configuration n'est requise** pour explorer l'application : sans variables d'environnement, elle tourne sur un jeu de données de démonstration (`lib/data/seed.ts`) qui reflète le schéma réel.

## Activer Atlas (Claude API)

Les agents Atlas (CIO, Risk, Analyst) génèrent des synthèses réelles via l'API Claude. Copiez `.env.example` en `.env.local` et renseignez :

```
ANTHROPIC_API_KEY=sk-ant-...
```

Sans cette clé, chaque écran affiche un bandeau « Atlas indisponible » explicite plutôt que de planter.

## Brancher Supabase (production)

L'application fonctionne en mode démo tant que Supabase n'est pas configuré. Pour brancher une vraie base :

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Exécutez `supabase/migrations/0001_init.sql` puis, si vous voulez retrouver le jeu de données de démo, `supabase/seed.sql`.
3. Renseignez dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Aucun changement de code n'est nécessaire — `lib/data/index.ts` bascule automatiquement de la donnée de démonstration vers Supabase dès que ces variables sont présentes.

## Architecture

Stack : Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL) · API Claude (`@anthropic-ai/sdk`).

```
app/(app)/          Shell applicatif (sidebar + 13 modules)
  home/              Module 1 — Home (briefing quotidien, priorités, note Atlas CIO)
  pipeline/          Module 2 — Pipeline (sourcing → défaut) + fiche dossier
  comite/            Module 3 — Investment Committee (dossiers en vote)
  portfolio/         Module 4 — Portfolio (répartitions, concentration, stress test, Atlas Risk)
  risque/            Module 5 — Risk Office (moteur de risque déterministe par dossier)
  gestion-actifs/    Module 6 — Asset Management (suivi des actifs financés + alertes)
  investisseurs/     Module 7 — Investor Relations (TRI/TVPI/DPI/Multiple)
  recherche/         Module 8 — Research (en construction)
  connaissance/      Module 9 — Knowledge (recherche plein texte)
  documents/         Module 10 — Document AI (en construction)
  operateurs/        Module 11 — Operator Intelligence
  marche/            Module 12 — Market Intelligence (en construction)
  taches/            Module 13 — Task Engine

lib/
  types.ts             Types partagés (schéma des données)
  data/                 Couche d'accès aux données (Supabase ↔ démo)
  atlas/                Agents Atlas (CIO, Risk, Analyst) — appels à l'API Claude
  portfolio.ts          Calculs : concentration, diversification, stress test
  risk-engine.ts        Scoring de risque déterministe par dossier (Module 5)
  investor-relations.ts Calculs de performance simplifiés (Module 7)
  knowledge-search.ts   Recherche plein texte (Module 9)
  format.ts             Formatage FR (devise, pourcentage, dates)

supabase/
  migrations/0001_init.sql   Schéma PostgreSQL complet
  seed.sql                    Jeu de données de démonstration (miroir de lib/data/seed.ts)
```

### Modules livrés

**Fonctionnels, sur données réelles (ou de démonstration) :**

- **Home** — briefing quotidien plafonné à 5 priorités, note Atlas CIO (IA)
- **Pipeline** — cycle de vie complet du dossier (sourcing → défaut), timeline, documents, notes, minutes de comité, Atlas Analyst à la demande (IA)
- **Investment Committee** — dossiers en vote, échéances
- **Portfolio** — 10 répartitions de diversification, concentration, stress test simplifié, note Atlas Risk (IA)
- **Risk Office** — scoring de risque déterministe par dossier (score, causes, probabilité, impact, actions), recalculé à chaque chargement, sans appel IA
- **Asset Management** — suivi des actifs en gestion active, alertes de retard liées
- **Investor Relations** — TRI, TVPI, DPI, Multiple calculés par dossier et au niveau portefeuille (méthode explicitée, projeté vs réalisé)
- **Operator Intelligence** — fiche de confiance par opérateur (TRI moyen, délais, défauts, retards)
- **Knowledge** — recherche plein texte sur les notes, décisions, alertes, tâches et dossiers
- **Task Engine** — tâches générées automatiquement par les alertes, groupées par statut

**Posés en architecture, pas encore implémentés** (route, navigation, description des capacités prévues) : Research, Document AI, Market Intelligence — chacun nécessite une intégration externe (flux de données, upload de fichiers, cartographie) hors scope de cette itération. L'architecture modulaire permet de les construire indépendamment, un par un.

## Philosophie

Chaque fonctionnalité doit répondre à une question : *si elle disparaissait demain, combien d'heures Estrella Capital perdrait-elle par mois ?* Si la réponse est moins d'une heure, elle n'a pas sa place ici.

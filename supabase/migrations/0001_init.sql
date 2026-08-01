-- Estrella Capital OS — schéma initial
-- Reflète les types définis dans lib/types.ts. Un "deal" est l'entité unique
-- qui traverse tout le cycle de vie : Pipeline (sourcing → comité → collecte)
-- puis Portfolio (financé → suivi → remboursé/défaut).

create type deal_stage as enum (
  'sourcing', 'analyse', 'comite', 'conditions', 'collecte',
  'finance', 'suivi', 'rembourse', 'defaut'
);

create type deal_type as enum (
  'promotion', 'marchand_de_biens', 'dette_privee', 'value_add', 'core_plus'
);

create type decision_type as enum ('approuve', 'refuse', 'conditionnel', 'en_attente');
create type task_priority as enum ('haute', 'moyenne', 'basse');
create type task_status as enum ('a_faire', 'en_cours', 'fait');
create type task_source as enum ('alerte', 'manuel');
create type alert_severity as enum ('critique', 'elevee', 'moderee');

create table operators (
  id text primary key,
  name text not null,
  tri_moyen numeric not null default 0,
  delai_moyen_jours integer not null default 0,
  defauts_count integer not null default 0,
  retards_count integer not null default 0,
  operations_count integer not null default 0,
  qualite_reporting integer not null default 5 check (qualite_reporting between 1 and 10),
  indice_confiance integer not null default 50 check (indice_confiance between 0 and 100),
  derniere_actualite text,
  notes text
);

create table deals (
  id text primary key,
  name text not null,
  operator_id text not null references operators(id),
  stage deal_stage not null default 'sourcing',
  type deal_type not null,
  region text not null,
  ville text not null,
  montant numeric not null,
  rendement_cible numeric not null,
  duree_mois integer not null,
  risque integer not null check (risque between 1 and 10),
  banque text,
  origine text not null,
  commercialisateur text,
  statut_detail text not null default '',
  sourced_at date not null default now(),
  echeance_prevue date not null,
  vote_expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_stage_idx on deals(stage);
create index deals_operator_idx on deals(operator_id);

create table deal_notes (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  author text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index deal_notes_deal_idx on deal_notes(deal_id);

create table deal_documents (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  name text not null,
  type text not null,
  uploaded_at timestamptz not null default now()
);

create index deal_documents_deal_idx on deal_documents(deal_id);

create table decisions (
  id text primary key,
  deal_id text not null references deals(id) on delete cascade,
  committee_date date not null,
  decision decision_type not null,
  rationale text not null,
  risques_identifies text[] not null default '{}',
  decided_by text not null,
  vote_result text not null default ''
);

create index decisions_deal_idx on decisions(deal_id);

create table tasks (
  id text primary key,
  title text not null,
  description text,
  priority task_priority not null default 'moyenne',
  status task_status not null default 'a_faire',
  due_date date,
  related_deal_id text references deals(id) on delete set null,
  source task_source not null default 'manuel',
  created_at timestamptz not null default now()
);

create table alerts (
  id text primary key,
  type text not null,
  severity alert_severity not null,
  message text not null,
  related_deal_id text references deals(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);

-- Row Level Security : à activer et affiner selon le modèle d'accès retenu
-- (utilisateur unique interne vs. multi-utilisateurs Estrella Capital).
alter table operators enable row level security;
alter table deals enable row level security;
alter table deal_notes enable row level security;
alter table deal_documents enable row level security;
alter table decisions enable row level security;
alter table tasks enable row level security;
alter table alerts enable row level security;

create policy "service role full access" on operators for all using (true);
create policy "service role full access" on deals for all using (true);
create policy "service role full access" on deal_notes for all using (true);
create policy "service role full access" on deal_documents for all using (true);
create policy "service role full access" on decisions for all using (true);
create policy "service role full access" on tasks for all using (true);
create policy "service role full access" on alerts for all using (true);

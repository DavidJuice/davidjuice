-- Verified Insurance Intelligence Platform - initial schema
-- Conventions: every tenant table carries agency_id and is RLS-protected.
-- Reference data (carriers, plans, benefit_types) is global/shared, read-only to agents.

create extension if not exists "pgcrypto";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------- tenancy

create table agencies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_at    timestamptz not null default now()
);

create type user_role as enum (
  'platform_admin','agency_admin','manager','agent','reviewer'
);

-- mirrors auth.users (Supabase); app_users holds tenant + role
create table app_users (
  id            uuid primary key,              -- = auth.users.id
  agency_id     uuid not null references agencies(id) on delete cascade,
  email         text not null unique,
  role          user_role not null default 'agent',
  created_at    timestamptz not null default now()
);
create index on app_users(agency_id);

-- ---------------------------------------------------------------- reference: carriers & plans

create table carriers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text not null unique,          -- 'UHC','HUMANA','AETNA'
  created_at    timestamptz not null default now()
);

create type plan_product_line as enum (
  'MA','MAPD','PDP','MEDSUPP','ACA','LIFE','ANNUITY','LTC','PC','OTHER'
);
create type plan_org_type as enum ('HMO','HMO_POS','PPO_LOCAL','PPO_REGIONAL','PFFS','MSA','COST','OTHER');
create type snp_type    as enum ('NONE','DSNP','CSNP','ISNP');

create table plans (
  id            uuid primary key default gen_random_uuid(),
  carrier_id    uuid not null references carriers(id),
  product_line  plan_product_line not null default 'MA',
  plan_name     text not null,
  contract_id   text,                          -- H1234
  pbp           text,                          -- 001
  segment_id    text default '000',
  plan_id_ext   text,                          -- H1234-001-000 (denormalized key agents use)
  plan_year     int  not null,
  org_type      plan_org_type,
  snp           snp_type not null default 'NONE',
  created_at    timestamptz not null default now(),
  -- one row per plan PER YEAR. Year is part of identity, never an attribute to overwrite.
  constraint plans_identity_uq unique (carrier_id, contract_id, pbp, segment_id, plan_year)
);
create index on plans(plan_year);
create index on plans(plan_id_ext, plan_year);
create index plans_name_trgm on plans using gin (plan_name gin_trgm_ops);

create table plan_service_areas (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references plans(id) on delete cascade,
  state         char(2) not null,
  county        text not null,
  county_fips   char(5),
  unique (plan_id, state, county)
);
create index on plan_service_areas(state, county);

-- ---------------------------------------------------------------- ontology

create type benefit_value_kind as enum ('currency','percent','boolean','text','count','copay_or_coins');
create type benefit_frequency  as enum (
  'per_month','per_quarter','per_year','per_visit','per_day','per_stay','per_admission',
  'per_trip','per_item','per_pair','one_time','not_applicable'
);

create table benefit_types (
  code          text primary key,              -- 'specialist_copay'
  category      text not null,                 -- plan|cost|medical|supplemental|rx
  label_en      text not null,
  label_ko      text not null,
  value_kind    benefit_value_kind not null,
  default_unit  text,
  -- frequency MUST be explicit for these; extraction without it is invalid
  frequency_required boolean not null default false,
  is_mvp        boolean not null default false,
  sort_order    int not null default 1000,
  notes         text
);

-- ---------------------------------------------------------------- documents

create type document_type as enum (
  'SOB','EOC','FORMULARY','PROVIDER_DIRECTORY','BULLETIN','AGENT_GUIDE','TRAINING',
  'BENEFIT_GRID','COMMISSION','ENROLLMENT_GUIDE','OTHER'
);
create type ingest_status as enum ('uploaded','parsing','classified','extracting','embedded','ready','failed');

create table documents (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  carrier_id      uuid references carriers(id),
  plan_id         uuid references plans(id),          -- null until classified
  plan_year       int,
  document_type   document_type,
  original_filename text not null,
  storage_path    text not null,
  content_sha256  char(64) not null,
  page_count      int,
  ocr_required    boolean not null default false,
  ingest_status   ingest_status not null default 'uploaded',
  ingest_error    text,
  uploaded_by     uuid references app_users(id),
  uploaded_at     timestamptz not null default now(),
  -- same file re-uploaded inside one agency is a no-op, not a duplicate corpus entry
  unique (agency_id, content_sha256)
);
create index on documents(agency_id, plan_id, plan_year);

-- versioning: never overwrite. A new version supersedes, the old stays queryable as archive.
create table document_versions (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references documents(id) on delete cascade,
  version_label       text not null,                -- carrier-published date or 'v1'
  published_date      date,
  is_active           boolean not null default true,
  archived_at         timestamptz,
  replaced_by_document_id uuid references documents(id),
  created_at          timestamptz not null default now()
);
create index on document_versions(document_id) where is_active;

create table document_pages (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  page_number   int not null,
  text          text not null,
  -- text blocks with bbox, retained for column-shift detection (see risks R5)
  blocks        jsonb not null default '[]'::jsonb,
  unique (document_id, page_number)
);

create table document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  agency_id     uuid not null references agencies(id) on delete cascade,
  page_number   int not null,
  chunk_index   int not null,
  section       text,
  text          text not null,
  -- retrieval metadata is duplicated onto the chunk so prefiltering is a plain WHERE
  plan_id       uuid references plans(id),
  plan_year     int,
  carrier_id    uuid references carriers(id),
  document_type document_type,
  embedding     vector(1536),
  tsv           tsvector generated always as (to_tsvector('english', coalesce(text,''))) stored,
  unique (document_id, chunk_index)
);
create index chunks_tsv_idx    on document_chunks using gin (tsv);
create index chunks_filter_idx on document_chunks (agency_id, plan_id, plan_year);
create index chunks_vec_idx    on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------- facts + provenance

create type verification_status as enum ('extracted','verified','needs_review','conflict','rejected');
create type fact_source_kind    as enum ('carrier_document','cms_file','manual_entry');

create table extracted_facts (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references agencies(id) on delete cascade,
  plan_id             uuid not null references plans(id) on delete cascade,
  plan_year           int not null,
  benefit_code        text not null references benefit_types(code),
  value_numeric       numeric,
  value_text          text,
  value_boolean       boolean,
  unit                text,
  frequency           benefit_frequency not null default 'not_applicable',
  is_conditional      boolean not null default false,  -- SSBCI / chronic-condition gated
  conditions          text,
  limits              text,
  network_scope       text,                            -- in_network | out_of_network | combined
  extraction_confidence numeric(4,3),
  verification_status verification_status not null default 'extracted',
  rejected_reason     text,
  extracted_by_model  text,
  created_at          timestamptz not null default now(),
  reviewed_by         uuid references app_users(id),
  reviewed_at         timestamptz,
  superseded_by       uuid references extracted_facts(id),
  -- plan_year is stored on the fact as well as the plan, and must agree (trigger below)
  constraint fact_has_a_value check (
    value_numeric is not null or value_text is not null or value_boolean is not null
  )
);
create index on extracted_facts(plan_id, plan_year, benefit_code);
create index on extracted_facts(agency_id, verification_status);
-- at most one live verified fact per (plan, year, benefit, network scope)
create unique index one_verified_fact
  on extracted_facts(plan_id, plan_year, benefit_code, coalesce(network_scope,''))
  where verification_status = 'verified' and superseded_by is null;

create table fact_sources (
  id              uuid primary key default gen_random_uuid(),
  fact_id         uuid not null references extracted_facts(id) on delete cascade,
  source_kind     fact_source_kind not null default 'carrier_document',
  document_id     uuid references documents(id),
  page_number     int,
  section         text,
  source_text     text not null,          -- immutable verbatim excerpt. never edited.
  bbox            jsonb,
  cms_file        text,
  cms_row_key     text,
  created_at      timestamptz not null default now()
);
create index on fact_sources(fact_id);

create table fact_conflicts (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  plan_id         uuid not null references plans(id) on delete cascade,
  plan_year       int not null,
  benefit_code    text not null references benefit_types(code),
  fact_a          uuid not null references extracted_facts(id) on delete cascade,
  fact_b          uuid not null references extracted_facts(id) on delete cascade,
  resolved        boolean not null default false,
  resolved_fact   uuid references extracted_facts(id),
  resolved_by     uuid references app_users(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- convenience view: the fact set Strict Evidence Mode is allowed to use
create view plan_benefits as
  select f.*, p.plan_id_ext, p.plan_name, p.carrier_id, p.org_type, p.snp
  from extracted_facts f
  join plans p on p.id = f.plan_id
  where f.verification_status = 'verified' and f.superseded_by is null;

-- ---------------------------------------------------------------- Q&A + audit

create table questions (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references agencies(id) on delete cascade,
  user_id       uuid references app_users(id),
  raw_text      text not null,
  language      char(2) not null default 'en',
  route         text,                          -- structured|evidence|compare|compare_years
  filters       jsonb,
  plan_year     int,
  created_at    timestamptz not null default now()
);

create table answers (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references questions(id) on delete cascade,
  answer_text   text not null,
  refused       boolean not null default false,
  provider      text,
  model         text,
  latency_ms    int,
  created_at    timestamptz not null default now()
);

create table citations (
  id            uuid primary key default gen_random_uuid(),
  answer_id     uuid not null references answers(id) on delete cascade,
  document_id   uuid references documents(id),
  fact_id       uuid references extracted_facts(id),
  page_number   int,
  section       text,
  quoted_text   text not null
);

create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid references agencies(id) on delete cascade,
  user_id       uuid references app_users(id),
  action        text not null,                 -- document.upload, fact.verify, answer.generate...
  entity_type   text,
  entity_id     uuid,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index on audit_logs(agency_id, created_at desc);

-- ---------------------------------------------------------------- integrity triggers

create or replace function fact_year_must_match_plan() returns trigger
language plpgsql as $$
begin
  if new.plan_year is distinct from (select plan_year from plans where id = new.plan_id) then
    raise exception 'plan_year %, does not match plans.plan_year for plan %', new.plan_year, new.plan_id;
  end if;
  return new;
end $$;
create trigger trg_fact_year before insert or update on extracted_facts
  for each row execute function fact_year_must_match_plan();

create or replace function chunk_year_must_match_plan() returns trigger
language plpgsql as $$
begin
  if new.plan_id is not null and new.plan_year is distinct from
     (select plan_year from plans where id = new.plan_id) then
    raise exception 'chunk plan_year mismatch for plan %', new.plan_id;
  end if;
  return new;
end $$;
create trigger trg_chunk_year before insert or update on document_chunks
  for each row execute function chunk_year_must_match_plan();

-- frequency must be explicit where the ontology says so
create or replace function fact_frequency_required() returns trigger
language plpgsql as $$
declare req boolean;
begin
  select frequency_required into req from benefit_types where code = new.benefit_code;
  if req and new.frequency = 'not_applicable' then
    raise exception 'benefit % requires an explicit frequency', new.benefit_code;
  end if;
  return new;
end $$;
create trigger trg_fact_freq before insert or update on extracted_facts
  for each row execute function fact_frequency_required();

-- ---------------------------------------------------------------- RLS

alter table app_users        enable row level security;
alter table documents        enable row level security;
alter table document_chunks  enable row level security;
alter table extracted_facts  enable row level security;
alter table fact_conflicts   enable row level security;
alter table questions        enable row level security;
alter table audit_logs       enable row level security;

create or replace function current_agency_id() returns uuid
language sql stable as $$
  select agency_id from app_users where id = auth.uid()
$$;

create policy tenant_rw on documents       using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());
create policy tenant_rw on document_chunks using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());
create policy tenant_rw on extracted_facts using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());
create policy tenant_rw on fact_conflicts  using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());
create policy tenant_rw on questions       using (agency_id = current_agency_id()) with check (agency_id = current_agency_id());
create policy tenant_ro on audit_logs      for select using (agency_id = current_agency_id());
create policy self_read  on app_users      for select using (agency_id = current_agency_id());

-- document_pages / fact_sources / citations inherit isolation through their parent FK;
-- they are never queried without a join to an RLS-protected parent, and the API never
-- exposes a direct route to them.

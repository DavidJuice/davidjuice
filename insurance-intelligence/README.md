# Verified Insurance Intelligence Platform

Source-grounded carrier product search for licensed US insurance agents. Starting vertical:
Medicare Advantage, Washington State (Snohomish / King / Pierce).

**Core principle:** AI interprets the question. Structured data and official carrier
documents determine the facts. The model is never the datastore.

> Internal research tool for licensed agents. Output is not CMS-approved marketing
> material and must not be presented to a beneficiary.

## Read this first

- [`docs/architecture/00-overview.md`](docs/architecture/00-overview.md) — the three engines and the invariants
- [`docs/architecture/01-risks-and-challenges.md`](docs/architecture/01-risks-and-challenges.md) — **where this spec is wrong or under-specified.** Start here if you are deciding whether to fund the build
- [`docs/product/mvp-scope.md`](docs/product/mvp-scope.md) — what is built, what is deliberately not
- [`docs/insurance-ontology/README.md`](docs/insurance-ontology/README.md) — the 20 MVP fields and the rules behind them

## Layout

```
supabase/migrations/     schema + ontology seed (0001, 0002)
services/api/app/
  ontology/              language-neutral benefit vocabulary
  ingest/                pdf -> pages -> facts -> validation -> chunks
  llm/                   provider abstraction (mock | anthropic | openai)
  query/                 natural language -> deterministic filters
  retrieval/             metadata-prefiltered hybrid search
  routers/               documents, facts, plans, search, ask, compare
apps/web/                Next.js: upload, review, plan detail, ask, search
tests/{unit,benchmark}/  43 unit tests + a 30-question benchmark seed
scripts/seed_dev.py      one agency, three users, one ingested SOB
```

## Run it

Nothing here requires an API key: `LLM_PROVIDER=mock` is a deterministic regex-based
provider that exercises the full pipeline, and the test suite uses it exclusively.

```bash
cp .env.example .env
make install
createdb insurance && DATABASE_URL=postgresql://localhost/insurance make migrate
DATABASE_URL=postgresql://localhost/insurance make seed     # prints X-User-Id values
make api      # http://localhost:8000/docs
make web      # http://localhost:3000
make test     # 43 unit tests, no database or network needed
make bench
```

Set `NEXT_PUBLIC_DEV_USER_ID` in `apps/web/.env.local` to a user id printed by `make seed`.

To use a real provider: `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`, or
`LLM_PROVIDER=openai` + `OPENAI_API_KEY`. Embeddings are configured separately
(`EMBED_PROVIDER`) because changing the embedding model invalidates the whole index.

## What the guarantees actually are

| Guarantee | Enforced by |
|---|---|
| A quoted source exists on the cited page | substring anchor in `ingest/validate.py` |
| A number appears inside its own evidence | `ingest/validate.py` |
| A plan year is never inferred | `interpret()` returns `None`; API returns 422; `YearScopeError` in retrieval |
| Facts never cross plan years | DB trigger `trg_fact_year` + plan year in plan identity |
| $100/month ≠ $100/quarter | `frequency` column, per-field allow-list, DB trigger, `same_value()` |
| A corrected fact never erases the original | `superseded_by` + copied evidence rows |
| Conflicts are shown, not resolved | `fact_conflicts`, both facts marked `conflict` |
| An uncited answer is a refusal | Strict Evidence Mode in `routers/ask.py` |
| Agency A cannot see Agency B | `agency_id` + Postgres RLS |

## Verification actually performed

- 43 unit tests pass (validation, extraction, conflicts, query interpretation, retrieval
  scoping, chunking, ontology drift).
- Both migrations apply cleanly to Postgres 16, and
  `tests/integration/schema_guarantees.sql` confirms each DB-level invariant rejects the
  bad write: cross-year facts, missing frequency, valueless facts, duplicate verified
  facts, cross-year chunks.
- The benchmark's 11 interpreter-scorable cases pass; the other 19 need an ingested corpus.

Not verified, and you should not assume otherwise:

- **pgvector was not exercised** — the validation server had no `vector` extension, so the
  embedding column and the ivfflat index were stubbed out for the migration run. Run the
  migration once on Supabase before trusting it.
- **No real carrier PDF has been through the pipeline.** Everything so far runs on a
  synthetic SOB and the deterministic provider. Real multi-column benefit grids are where
  this will break first — see risks R5.
- RLS policies were created but not tested under a real Supabase JWT.

## Status

Milestone 1 (spec §53) is implemented end to end against the deterministic provider.
Next step is the accuracy work in `docs/product/mvp-scope.md` — CMS ground truth first,
then one real SOB per carrier.

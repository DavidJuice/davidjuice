# Architecture Overview

## 1. Design principle

```
AI interprets intent.  Structured data + carrier documents determine facts.
```

The LLM is never the datastore. Three engines, one router:

| Engine | Backing store | Answers |
|---|---|---|
| E1 Structured | `plan_benefits` (verified rows) | deterministic values, filters, cross-plan ranking, year deltas |
| E2 Evidence | `document_chunks` (hybrid FTS + pgvector) | nuance: rollover, inclusions, limits, PA, SSBCI eligibility |
| E3 Verification | `extracted_facts` + `fact_sources` + `fact_conflicts` | provenance, status, conflicts, audit |

Router (`app/query/router.py`) classifies a question into `structured | evidence | compare | compare_years`
using a deterministic field-vocabulary match FIRST, LLM only as fallback. Reason: field
lookups must not depend on model mood.

## 2. Request flows

### Structured query
```
NL question -> interpret_query (LLM, JSON-only) -> QueryFilters (pydantic, validated)
            -> SQL over plan_benefits WHERE plan_year = :year AND verification_status IN ('verified')
            -> rows + fact_source per cell -> renderer
```
The LLM emits filters, never values. Filters are validated against the ontology; an
unknown field is rejected, not guessed.

### Evidence query
```
question + plan_id + plan_year -> metadata prefilter (plan_id, plan_year, doc active)
  -> hybrid retrieve (BM25/tsvector + pgvector cosine, RRF fuse)
  -> top-k chunks -> summarize_evidence(passages only)
  -> answer + citations | "Unable to verify from the available carrier documents."
```
Prefilter is a SQL `WHERE`, not a post-filter on vector hits. A vector index cannot be
trusted to keep plan years apart.

### Ingestion
```
upload -> sha256 dedupe -> store original (immutable)
  -> PyMuPDF text w/ page + block bbox -> pages
  -> classify (carrier, doc_type, plan_year, contract, PBP)  [cheap model]
  -> extract 20 MVP fields, each REQUIRING quoted source_text + page  [capable model]
  -> anchor check: source_text must literally occur on the cited page, else reject fact
  -> deterministic validators -> status extracted|needs_review|conflict
  -> chunk + embed
  -> human review queue
```

## 3. Non-negotiable invariants (enforced in code + DB, not prompts)

1. `extracted_facts.source_text` must be a substring of the cited page text (normalized).
   Enforced in `ingest/extract.py`; a fact that fails is stored `rejected` with reason.
2. Every structured query carries an explicit `plan_year`. `retrieval/hybrid.py` and
   `routers/search.py` raise if it is absent. No default-to-latest.
3. Strict Evidence Mode (default ON) restricts E1 to `verification_status='verified'`
   and forbids E2 answers without >=1 citation.
4. Frequency is a first-class column (`frequency` enum), never folded into the value.
   `$100/quarter` and `$100/month` are different rows and never compare equal.
5. `flex`, `otc`, `food` are distinct `benefit_type` codes. No aliasing.
6. Conflicting values for (plan, year, benefit_type) create a `fact_conflicts` row and
   both facts go `conflict`. Nothing is auto-selected in MVP.

## 4. Stack

- Web: Next.js 15 App Router / React / TS, Vercel.
- API: FastAPI (Python 3.11), sync psycopg3. PDF work is CPU-bound; endpoints that parse
  run in a worker, not the request.
- DB: Postgres (Supabase) + pgvector + `tsvector` FTS. RLS on every tenant table.
- Queue MVP: `documents.ingest_status` + a polling worker loop (`workers/document_ingestion`).
  No Celery/Redis until throughput demands it.
- LLM: provider abstraction (`app/llm/base.py`). Anthropic + OpenAI impls + a deterministic
  `MockProvider` used by the whole test suite so CI needs no API key.

## 5. What is deliberately NOT built

Precedence rules engine, formulary/provider lookup, CRM integrations, carrier monitoring,
autonomous recommendation, PHI handling. See `docs/product/mvp-scope.md`.

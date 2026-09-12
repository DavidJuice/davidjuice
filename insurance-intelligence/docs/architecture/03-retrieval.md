# Retrieval Strategy

## Hybrid, metadata-first

```
plan_year (required) + agency_id + plan_id [+ document_type]   <- SQL WHERE
        |                                    |
   tsvector FTS                        pgvector cosine
        \__________ reciprocal rank fusion (k=60) __________/
```

Both legs carry the same `WHERE`. Post-filtering vector hits is the wrong-year bug: the
index has no notion of a plan year, so the right passage can be pushed out of top-k before
any filter runs.

`YearScopeError` is raised — not defaulted — when a caller omits `plan_year`.

## Why hybrid rather than embeddings alone

SOB text is dominated by exact tokens: `H1234-001-000`, `$2,500`, `Tier 3`, `prior
authorization`. Embeddings blur exactly these. FTS catches them; vectors catch paraphrase
("does it roll over" vs "unused balance carries forward"). RRF fuses by rank so the two
score scales never have to be reconciled.

## Chunking

Page-anchored, ~1200 chars with 150 char overlap, section heading captured when the page
has one. A chunk never spans a page boundary, so every citation is exact.

## Korean (spec §Module F, risks R8)

Postgres has no Korean FTS configuration. Korean questions are resolved to
language-neutral field codes (`ontology.resolve_field` matches Korean aliases directly) or
translated to English intent before retrieval. Korean is a presentation language; the facts
are not duplicated per language.

## Scale note

At <50 documents, retrieval tuning is noise. Do not spend a sprint on RRF weights or chunk
size until the corpus is large enough for the difference to be measurable.

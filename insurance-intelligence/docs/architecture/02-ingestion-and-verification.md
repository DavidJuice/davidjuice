# Document Ingestion, Extraction, Verification

## Flow (`services/api/app/ingest/pipeline.py`)

| # | Step | Module | Failure behavior |
|---|---|---|---|
| 1 | sha256 + store original | `pipeline.store_upload` | identical file in the same agency → no-op, returns existing id |
| 2 | text + block geometry per page | `pdf.parse_pdf` | page with <40 chars marks `ocr_required`; no OCR in MVP |
| 3 | persist `document_pages` | pipeline | immutable; re-ingest replaces text but never the original file |
| 4 | classify carrier/type/year/plan | `llm.classify_document` | **no plan_year ⇒ ingestion fails.** Never guessed |
| 5 | resolve/create plan row | `pipeline._resolve_plan` | year is part of plan identity |
| 6 | extract per page | `extract.extract_page` | model output validated before it is stored |
| 7 | validate | `validate.validate_fact` | `rejected` / `needs_review` / `extracted` |
| 8 | dedupe + conflict flag | `extract.dedupe_and_flag_conflicts` | disagreement ⇒ both facts `conflict` + a `fact_conflicts` row |
| 9 | chunk + embed | `chunk`, `llm.embed` | chunks never span pages |
| 10 | human review | `POST /facts/{id}/verify` | only `verified` facts reach Strict Evidence Mode |

## Why extraction is per-page, not per-document

A page is the citation unit. Feeding the whole PDF at once produces citations the model
has to reconstruct, which is precisely where page numbers drift. One page in, one page
number out, verified by substring anchor.

## The anchor check

`validate_fact` rejects any fact whose `source_text` is not present on its cited page after
whitespace normalization, and any numeric value that does not appear inside its own
`source_text`. These two rules kill the majority of fabrication and mis-citation without
a second model call. They are cheap, deterministic and run on every fact.

## Review semantics (spec §32)

`approve` flips status in place. `reject` records a reason. **`edit` never mutates the
original row**: it inserts a corrected fact (status `verified`, model `human:reviewer`),
copies the evidence rows, and marks the original `superseded_by` the new one. The audit
trail keeps the AI's original value, the reviewer, the timestamp and the correction.

## Conflict handling (spec §10)

Two different values for the same (plan, year, benefit, network scope) create a
`fact_conflicts` row and both sides go to `conflict`. Nothing is auto-selected. A
document-precedence engine is explicitly out of MVP scope — the MVP shows the conflict
and lets the reviewer decide, which is the behavior a compliance reviewer can defend.

Note that identical repeats are **not** conflicts: the same value restated on a later page
collapses to one fact with the higher-confidence witness.

# MVP Scope and Implementation Sequence

## Milestone 1 — the only workflow that matters first (spec §53)

```
Upload one SOB -> classify plan metadata -> extract 20 fields with page evidence
  -> review screen (approve / edit / reject) -> plan detail page -> ask questions
  -> every answer carries its source
```

Status in this repository:

| Step | Where | Done |
|---|---|---|
| Upload + dedupe + immutable original | `POST /documents/upload` | yes |
| Page text + geometry | `ingest/pdf.py` | yes |
| Classification (carrier/type/year/plan) | `ingest/pipeline.py` | yes |
| 20-field extraction with mandatory evidence | `ingest/extract.py` | yes |
| Deterministic validation | `ingest/validate.py` | yes |
| Conflict surfacing | `ingest/extract.py`, `fact_conflicts` | yes |
| Review UI + non-destructive corrections | `/review`, `POST /facts/{id}/verify` | yes |
| Plan detail with per-value provenance | `/plans/[planId]`, `GET /plans/{id}` | yes |
| Ask this plan (EN/KO) | `/ask` | yes |
| Structured plan search | `POST /search/plans` | yes |
| Compare plans / compare years | `POST /compare`, `/compare-years` | yes (API) |
| Strict Evidence Mode | default-on, enforced in API | yes |

Not yet built and deliberately so: OCR, EOC ingestion, precedence rules, carrier update
monitoring, formulary/provider lookup, CRM integrations, compare UI screens.

## Sequence from here

1. **Ground truth first.** Load CMS PBP data for WA 2026 (risks R1) and diff it against the
   PDF extraction. That diff is the accuracy number; without it, accuracy claims are vibes.
2. Run one real carrier SOB per carrier (UHC / Humana / Aetna) through the pipeline. Table
   layout differs per carrier and will break things — that is the point of the exercise.
3. Build the comparison screens only after the single-plan page is trusted.
4. Expand to 2027 documents on/after Oct 1 and use it as a live test of year isolation.
5. Only then widen the field set (spec §36).

## Non-goals (spec §51) — unchanged

Autonomous enrollment or recommendation, client medical profiles, PHI, carrier portal
automation, commissions, CRM replacement, telephone AI, ACA platform, native mobile,
self-hosted LLM infrastructure.

## Compliance guardrails carried into the MVP (risks R3)

- Agent-only access; no beneficiary-facing surface.
- "Internal research — not approved marketing material" banner on comparison and plan views.
- No export/print route for comparisons in v1.

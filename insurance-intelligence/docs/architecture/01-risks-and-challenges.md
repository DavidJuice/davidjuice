# Architectural Risks, Assumptions, and Challenges to the Spec

Written as a critique, not a confirmation. Ranked by expected damage.

## R1. The structured MA benefit database is largely a public dataset. The moat claim is weak.

CMS publishes, free, annually:
- **PBP (Plan Benefit Package) extract files** — machine-readable benefit values per contract/PBP,
  including MOOP, copays, dental/vision/hearing/OTC/transportation cost sharing and maxima.
- **Plan Landscape / Plan Finder files** — premium, plan type, SNP flag, service area by county.
- **MA/PD Contract & Enrollment, SCC (service area) files** — county mapping.
- **Part D formulary + pharmacy network files** — full drug tier data.

Building §6's structured engine by LLM-extracting SOB PDFs re-derives, with lower accuracy and
high labor cost, data that is already deterministic and free.

**Recommendation (materially changes the build):** invert the pipeline.
- Seed `plan_benefits` from CMS PBP files (deterministic loader, `verification_status='verified'`,
  source = CMS file + row, zero LLM).
- Use carrier PDFs for what CMS does **not** contain: SSBCI eligibility conditions, benefit
  rollover rules, implant/denture inclusion, trip counts and one-way vs round-trip, PA rules,
  network dental vs allowance distinction, flex-card mechanics, carrier corrections/bulletins.
- LLM extraction then becomes a *reconciliation* layer against a known-good baseline, which also
  gives you a free accuracy oracle (see R6).

This does not kill the product. It relocates the moat from "we typed in the numbers" to
"we normalized the nuance CMS never encodes, with provenance." That is the defensible part.
The architecture below supports both paths; `source_kind` on `fact_sources` distinguishes
`cms_file` from `carrier_document`.

## R2. Plan-year timing blocks the stated MVP target.

Spec repeatedly uses 2027. Today is 2026-09-12. CY2027 SOBs are not public until ~Oct 1 2026
(CMS marketing rules bar pre-Oct-1 dissemination). **MVP must be built and benchmarked on CY2026
documents**, then re-run on 2027 as a live test of the year-isolation guarantees. Treating 2027 as
the build target means no test data for the first several weeks.

## R3. CMS marketing-compliance exposure is unaddressed in the spec.

42 CFR §422.2260 et seq. define "marketing materials." Plan comparison output shown to a
beneficiary generally requires HPMS submission / plan approval. §26's positioning ("for licensed
agents") mitigates but does not eliminate this: an agent screen-sharing a comparison with a
prospect converts internal research into beneficiary-facing material.

**Required in MVP, cheap to build:** (a) agent-only access gate, (b) a non-exportable, watermarked
"internal research — not approved marketing material" banner on comparison views, (c) no PDF/print
export of comparisons in v1, (d) ToS language placing responsibility on the agency.
Implemented as a UI banner + no export route. Legal review is out of scope for engineering.

## R4. Human verification is the real cost driver, and §34 understates it.

WA has roughly 100–150 MA plans across the three target counties. 20 fields × ~120 plans ≈ 2,400
reviewer decisions per plan year, plus re-review on every carrier correction. At ~20s/decision
that is ~13 focused hours per year per state — tolerable. At 200 fields and 10 states it is
~1,100 hours/year and the business is a data-entry shop. R1's CMS seeding removes ~70% of this.
**Decision required from you:** who reviews, and is that person's time priced into the model?

## R5. Table extraction is the dominant technical failure mode, not hallucination.

SOB benefit grids are multi-column with per-column plan variants. A column shift silently maps
Plan A's copay to Plan B — a wrong-plan error that reads as perfectly confident. Mitigations
implemented: bbox-aware extraction (x-coordinate retained per text block), the substring anchor
check, and a validator that rejects a fact whose source_text sits in a column region not
associated with the target plan's header. This is heuristic and will not be 100%. It is the
top candidate for the human review queue and for a second-model review pass.

## R6. No accuracy oracle is defined in the spec.

§37–38 benchmark against competitors, but nothing says what ground truth *is*. Without an oracle
you cannot claim extraction accuracy. Two available oracles: (a) CMS PBP values as gold for the
overlapping fields (free, exact); (b) a hand-labeled set of ~40 nuance questions with page cites.
**Start with 40 questions, not 200.** 200 questions built before a single agent uses the product
is premature; the question distribution will be wrong.

## R7. Hybrid search on tiny corpora is over-engineering at Milestone 1.

At one document, retrieval quality is irrelevant. pgvector + tsvector are both cheap and are
implemented, but tuning (RRF weights, chunk sizes) should wait until ≥50 documents. Flagged so it
does not absorb a sprint.

## R8. Korean handling has a real, specific failure the spec glosses.

Postgres FTS has no Korean configuration by default; `to_tsvector('simple', ...)` on Korean
agglutinative text under-matches badly. MVP approach: Korean questions are **translated to English
intent + normalized field codes before retrieval** (the facts are language-neutral anyway, per §4),
and Korean is used only for the presentation layer. Do not attempt Korean FTS in v1.

## R9. Assumptions taken (flag if wrong)

1. Documents are text-layer PDFs; OCR is a later add (`ocr_required` flag set, not processed).
2. Single Postgres, no read replica; Supabase RLS is the tenant boundary.
3. Agencies upload carrier-provided PDFs they are licensed to hold. Redistribution rights are
   the agency's problem; the platform stores tenant-private copies and does not share documents
   across tenants. **Carrier-owned copyrighted PDFs must not be pooled into a shared corpus
   without carrier permission** — this constrains the cross-tenant data-network effect.
4. No PHI in MVP (§25). Enforced by having no client tables at all, not by policy.

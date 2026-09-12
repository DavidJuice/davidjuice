# Insurance Benchmark

## Position

Spec §37 asks for 200+ questions immediately. Start at **40**, sourced from real agent
questions, and grow the set from logged `questions` rows. A large synthetic set written
before any agent uses the product encodes the wrong distribution and then anchors the
roadmap to it.

## Ground truth (the part the spec omits)

Two oracles, both cheap:

1. **CMS PBP extract files** — exact gold values for the overlapping structured fields
   (premium, MOOP, copays, several supplemental maxima). Free, deterministic, no labeling.
2. **Hand-labeled nuance set** — ~40 questions with the answer, the document, and the page,
   labeled once by a licensed agent. This is the only oracle for rollover rules, implant
   inclusion, trip semantics, SSBCI conditions, PA requirements.

## Categories and the behavior each tests

| Category | Example | Correct behavior |
|---|---|---|
| Exact benefit | What is the specialist copay? | verified value + page cite |
| Nuance | Does dental cover implants? | passage-grounded answer + cite |
| Cross-plan | Which plan has the lowest MOOP? | ranked, all verified |
| Filters | Plans with dental ≥ $2,000 | correct filter, correct frequency |
| Plan-year | What changed 2026 → 2027? | both years requested explicitly |
| Korean | OTC가 매달 얼마예요? | same field code, same value |
| Negative evidence | Does this plan include pest control? | *Unable to verify from the available carrier documents.* |
| Adversarial year | 2027 copay when only 2026 is loaded | refusal, never the 2026 value |
| Adversarial plan | similarly named sibling plan | no cross-plan borrowing |

The last two categories are not in the spec and matter more than the rest: they test the
failure modes that destroy agent trust (§40).

## Metrics

Per question: correct / incorrect / unsupported, wrong-plan, wrong-year, wrong-source,
citation present, citation actually supports the claim, correct refusal, latency.
Aggregate separately for structured vs evidence routes — mixing them hides which engine
is failing.

## Competitive comparison

Running the same set through NotebookLM / ChatGPT / Claude / Gemini is useful and cheap.
**Do not publish or sell on a superiority claim until the set is ≥100 questions with agent
-labeled ground truth**, and state the corpus the competitor was given: a generic model
handed the same PDFs is a fair comparison; one handed nothing is not.

# Insurance Ontology

Normalized, language-neutral benefit vocabulary. Facts are stored against a `benefit_code`;
English and Korean are labels on the code, never separate data (spec §4).

Source of truth: `supabase/migrations/0002_benefit_types_mvp.sql` (DB) and
`services/api/app/ontology/fields.py` (API). `tests/unit/test_ontology_matches_sql.py`
fails the build if they drift.

## Field shape

Every fact carries, beyond its value: `unit`, `frequency`, `network_scope`,
`is_conditional` + `conditions`, `limits`, and at least one `fact_sources` row.

## Rules that exist because of specific real-world errors

| Rule | The error it prevents |
|---|---|
| `frequency` is a column, never folded into the value | $100/quarter read as $100/month |
| `frequency_required` per field, enforced by a DB trigger | a copay stored with no unit of time |
| `allowed_frequencies` per field | an annual MOOP stored as per-visit |
| `otc_allowance` ≠ `flex_allowance` ≠ `food_allowance` | flex card counted as OTC |
| `dental_comprehensive_max` ≠ `dental_preventive` | preventive schedule read as the allowance |
| `inpatient_hospital` allows per_day / per_stay / per_admission and stores which | per-day copay compared against a per-stay copay |
| `is_conditional` + mandatory `conditions` text | SSBCI benefit shown as universally available |
| absence ≠ `$0` | a benefit the document never mentions rendered as free |

## MVP field set (20)

plan_type, snp_type, monthly_premium, part_b_giveback, moop_in_network, drug_deductible,
pcp_copay, specialist_copay, urgent_care_copay, emergency_room_copay, inpatient_hospital,
outpatient_hospital, dental_comprehensive_max, vision_eyewear_allowance,
hearing_aid_allowance, otc_allowance, transportation_trips, fitness_benefit,
rx_tier1_preferred_30, rx_tier2_preferred_30.

## Adding a field

1. Add the row to a new migration (never edit 0002).
2. Add the `BenefitType` to `MVP_FIELDS` with aliases, allowed frequencies, `max_plausible`.
3. Add a test case to `tests/unit/test_validation.py`.
4. Only then widen the extraction prompt. A field without a validator is a liability.

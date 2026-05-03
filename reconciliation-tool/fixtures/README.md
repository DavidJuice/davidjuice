# Fixtures

These small CSVs let an admin smoke-test the tool end-to-end without using real PHI. They are intentionally tiny so the expected counts can be verified by eye.

| File | Purpose |
|---|---|
| `ab_individual_sample.csv` | Tiny AB Individual report. 5 clients across 3 agents. |
| `ab_policy_sample.csv` | AB Policy report — overlaps with the Individual report, with one deliberate plan mismatch and one client missing entirely. |
| `uhc_bob_sample.csv` | UHC Book of Business — overlaps partially with AB; uses different column names. |
| `humana_bob_sample.csv` | Humana Book of Business — multiple rows per policy with `Event Date`; collapse should keep only the latest. |

**Never commit real PHI to this folder.** Generate richer synthetic fixtures locally as needed.

## Expected results when running all 3 checks with all 5 agents

- AB ↔ AB internal: 1 only-in-Individual, 1 only-in-Policy, 1 field_mismatch (plan_name).
- AB ↔ UHC: 1 only-in-AB, 1 only-in-UHC, 1 field_mismatch (status).
- AB ↔ Humana: Humana's history rows for `H-100` collapse to the 2025-02-01 TERMINATED row before comparison. Expect 1 field_mismatch on status.

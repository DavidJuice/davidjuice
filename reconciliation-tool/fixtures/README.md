# Fixtures

These small CSVs let an admin smoke-test the tool end-to-end without using real PHI. They are intentionally tiny so the expected counts can be verified by eye.

| File | Purpose |
|---|---|
| `ab_individual_sample.csv` | Tiny AB Individual report. 5 clients across 3 agents. |
| `ab_policy_sample.csv` | AB Policy report — overlaps with the Individual report, with one deliberate plan mismatch and one client missing entirely. |
| `uhc_bob_sample.csv` | UHC Book of Business — overlaps partially with AB; uses different column names. |
| `humana_bob_sample.csv` | Humana Book of Business — multiple rows per policy with `Event Date`; collapse should keep only the latest. |

**Never commit real PHI to this folder.** Generate richer synthetic fixtures locally as needed.

## Real-world sanitized samples (local only — not committed)

The repo's `.gitignore` blocks `fixtures/*.csv` for everything except the four synthetic files above. Sanitized exports of the real AB reports live on the developer machine at:

```
fixtures/real_ab_individual.csv
fixtures/real_ab_policy.csv
fixtures/real_ab_custom_report.csv
```

These hold real client names + DOBs + ZIPs (with SSN/MBI/phone/email/street scrubbed). That combination is still PHI under HIPAA, so they stay out of git. Re-request from the data owner if you need them on a fresh checkout.

| File | Source export | Rows | What it adds beyond the synthetic samples |
|---|---|---|---|
| `real_ab_individual.csv` | AgencyBloc Individual report | 27 | Full 52-column header set. Carries `Medicaid Level (Current)`, `Medicaid ID`, `Cancel Date`, `Cancel Reason: Other`, `Primary Language`, `Country/Region (Self-Identified)`. Some rows have blank `Individual Status` despite a populated `Individual Type` — Rule 1 should surface those. |
| `real_ab_policy.csv` | AgencyBloc Policy + Individuals + Groups | 18 | Full 72-column header set. Includes `Enrollment Type` (values seen: Onboard, Switch - Different Carrier, Switch - Same Carrier — Cancel is NOT one), 5 `Agent/Affiliate` slots, `Renewal Confirmation`, `Enrollment Period` (AEP / OEP). `Medicaid Number (DELETE SOON)` column is flagged for retirement on the AB side — readers should ignore it. |
| `real_ab_custom_report.csv` | AB Custom report (Plog Sync source) | 86 | 51-column join of Individual + Policy, one row per (individual, policy) pair. Headers carry trailing spaces ("Individual ID ", "Coverage Type ") — readers must normalize. Carries secondary `Carrier Name 2` and `Coverage Type 2` columns (e.g. previous carrier on a switch). Group-policy rows have blank `Individual ID` and should be skipped in Plog Sync. Some rows carry legacy `Individual Status = "Cancelled"` which is not in the official status enum — Rule 1 will surface as a data-quality warning. |

## Expected results when running all 3 checks with all 5 agents

- AB ↔ AB internal: 1 only-in-Individual, 1 only-in-Policy, 1 field_mismatch (plan_name).
- AB ↔ UHC: 1 only-in-AB, 1 only-in-UHC, 1 field_mismatch (status).
- AB ↔ Humana: Humana's history rows for `H-100` collapse to the 2025-02-01 TERMINATED row before comparison. Expect 1 field_mismatch on status.

# AgencyBloc Reconciliation Tool

A drag-and-drop reconciliation tool for the agency, built as a Google Sheet + Google Apps Script project.

It reconciles:

1. **AB Individual report ↔ AB Policy report** — internal AgencyBloc consistency.
2. **AB ↔ United Healthcare Book of Business**.
3. **AB ↔ Humana Book of Business** — Humana's history log is collapsed to the latest event per policy before comparing.

PHI never leaves Google Workspace. The tool requires a signed Google Workspace BAA.

---

## For end users (the agents)

1. Open the **Master Control Sheet** in your `Insurance Ops - PHI` Shared Drive.
2. From the menu bar, click **Reconciliation → Open Tool**.
3. Drag your AgencyBloc Individual and Policy CSVs into the two boxes.
4. Pick which agents you want included, then click **Confirm**.
5. Pick which checks to run (AB↔AB, AB↔UHC, AB↔Humana). If you pick UHC or Humana, drag the carrier file into the box that appears.
6. Click **Run**. A new results Sheet opens when it's done. Each selected agent also gets an email with a CSV of their own exceptions.

If you close the sidebar mid-run, the tool keeps working in the background and emails you when it's finished.

---

## For administrators

### One-time setup

1. **Shared Drive:** create a Shared Drive named `Insurance Ops - PHI`. Add the 5 employees.
2. **Folder layout** inside that Shared Drive:
   ```
   /Reconciliation Tool/
     /Runs/
     /Archive/
     /Config/
     /Logs/
   ```
3. **Master Control Sheet:** create a new Google Sheet named `Master Control Sheet` inside `/Reconciliation Tool/`. Open `Extensions → Apps Script` to create the bound script project. Copy the script ID from the script's URL.
4. **Local checkout & push:**
   ```bash
   cd reconciliation-tool
   npm install
   npx clasp login
   cp .clasp.json.example .clasp.json
   # paste the scriptId from step 3
   npm run push
   ```
5. **Initialize:** open the Master Control Sheet in your browser and reload. The `Reconciliation` menu appears. Click **Reconciliation → Install / Initialize** once. This:
   - Creates the `Agents`, `FieldMappings`, `Settings`, `AuditLog`, `RunIndex` tabs.
   - Registers the daily retention trigger.
   - Prompts for OAuth consent (one-time per user).
6. **Agents tab:** edit the `Agents` tab to fill in real names, emails, branches.

### Day-to-day administration

- **Add a new agent:** add a row to the `Agents` tab. No code change needed.
- **Add a new carrier or check type:** edit `config/field_mappings.json` and `config/reconciliation_types.json`, then `npm run push`. No code change.
- **Adjust retention or chunk sizes:** edit the `Settings` tab in the Master Control Sheet, or edit `config/settings.json` and re-push.
- **Tune AB-only data-quality rule enums:** edit `config/ab_only_rules.json` (individual_type values, status values, policy product families, pending threshold) and re-push. No code change.

### Plog Sync setup checklist

Plog Sync ships as a scaffold. Before turning it on:

1. **Confirm AgencyBloc supports scheduled email reports** with CSV attachments. (As of this writing this hasn't been verified for our account.) If it does:
2. **Create a Workspace service mailbox** (e.g. `ops-feeds@yourdomain.com`) — Plog Sync will scan it via `GmailApp`.
3. **Configure AB scheduled emails** to send the Individual + Policy + Customer reports to that mailbox on a 12-hour cadence (or whatever makes sense). Note the:
   - sender address AB uses
   - subject pattern AB uses
   - report list and column headers
4. **Fill in `config/plog_sync.json`** with `from`, `subject_substring`, `plog_sheet_id`, and the AB-delta → event mapping table (newborn / onboard / switch / renewal / cancel / transfer).
5. **Install the trigger** by running `installPlogSync()` once from the Apps Script editor. Verify it shows up in `Triggers`.

Until step 4 is filled in, `plogSyncTick()` no-ops with a `safeLog`.

### Updating

```bash
cd reconciliation-tool
git pull
npm run push
```

Optionally tag a versioned deployment for rollback:

```bash
npx clasp version "v1.2.0 — note about the change"
```

---

## Architecture overview

See `/root/.claude/plans/i-want-to-create-jaunty-storm.md` (kept locally; not in this repo) for the full design rationale. The short version:

- `src/` — Apps Script source (`.gs` + `.html`). Number prefixes simulate modules; Apps Script flattens at runtime.
- `html/` — UI templates, copied into `src/` by the build script.
- `config/` — canonical schema mappings and check registry, embedded into `src/` by the build script as `99_Embedded_Config.gs`. Admins can override at runtime by editing the copies that live in `/Config/` in Drive.
- `scripts/build.sh` — copies html + config into src before `clasp push`.
- `tests/` — Apps Script unit tests, exposed via the `Reconciliation → Run All Tests` menu.
- `fixtures/` — synthetic CSVs for testing. **Never commit real PHI here.**

---

## HIPAA controls

1. **Domain-private Sheets in a Shared Drive.** No link sharing, no per-file shares.
2. **No external-network OAuth scope.** `appsscript.json` does not request `script.external_request`, so `UrlFetchApp` to non-Google URLs fails at runtime — defense in depth against accidental data egress.
3. **PHI is never logged.** A `safeLog()` wrapper in `80_Audit.gs` strips known-PHI keys before anything reaches `Logger`/Stackdriver.
4. **Audit log on every run.** User identity, file SHA-256s, row counts, agents/checks selected, output sheet ID, duration, status.
5. **Original CSV bytes are not persisted.** Only normalized rows + the SHA-256 of the source file land in Drive.
6. **Email body never contains PHI.** Counts only. PHI travels in the attached CSV, in-domain, under the Workspace BAA.
7. **Per-agent emails are filtered.** An agent only ever receives their own exceptions. `only_in_carrier` rows have no AB-side agent and are never emailed; they live only in the output Sheet.
8. **Retention.** Run Sheets older than `retention_days` (default 60) are moved to `/Archive/`; archived Sheets older than `retention_days * 2` are deleted.

---

## Verification

See `tests/` for Apps Script tests. From the Sheet menu, click `Reconciliation → Run All Tests`. Results land in a `TestResults` tab.

End-to-end smoke (with the synthetic fixtures in `fixtures/`):

| Check       | only_in_AB | only_in_carrier | field_mismatch | fuzzy_review |
|-------------|------------|-----------------|----------------|--------------|
| AB↔AB       | 12         | 12              | 50             | 0            |
| AB↔UHC      | 100        | 100             | 80             | 20           |
| AB↔Humana   | varies     | varies          | varies         | varies       |

Generate fresh fixtures with:

```bash
node tests/generate_fixtures.js
```

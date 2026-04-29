# Humana Member Data Scraper

A Tampermonkey userscript that automatically collects `srcMemberID`, `mbrName`,
and `medicareId` for every active member from the Humana broker / agent portal
and exports them as a CSV (opens directly in Excel / Google Sheets).

## How it works

1. **Network interception** – Patches `fetch` and `XMLHttpRequest` so any
   response from a URL containing `member?recordID=` is parsed and the three
   target fields are captured into `localStorage` (deduped by `srcMemberID`).
2. **URL template learning** – The first time you click a member manually, the
   script records the API URL pattern (e.g.
   `https://…/member?recordID={ID}&…`) and saves it.
3. **Bulk auto-fetch** – Once the template is known, the script can iterate
   over every `recordID` it finds on the Active Policies page and call the API
   directly with your existing session cookies — no clicking required.
4. **Export** – One click downloads a CSV (UTF-8 with BOM, opens cleanly in
   Excel and Google Sheets).

## Install

1. Install the Tampermonkey browser extension (Chrome / Edge / Firefox).
2. Click the Tampermonkey icon → **Create a new script**.
3. Paste the contents of `humana-member-scraper.user.js` and save (Ctrl/Cmd+S).
4. Reload the Humana portal tab.

## Use

1. Log in to the Humana portal and open **Active Policies**.
2. A small blue panel labeled **"Humana Member Scraper"** appears in the top
   right of the page.
3. **First run only** – click any one member's name normally. The script
   detects the `member?recordID=` request and saves the URL template. The
   panel will update from "(waiting…)" to show the captured URL.
4. Go back to the Active Policies list. Click **"Scan IDs on page"** – it
   finds every `recordID` on the visible list. If your portal paginates,
   scroll / load more first, then re-scan.
5. Click **"Auto-Fetch All"**. The script calls the member API for each ID
   with a configurable delay (default 300 ms — kind to the server).
6. Watch the counter rise. When done, click **"Export CSV"**.

## Notes

- Records persist in `localStorage` across page reloads, so you can collect
  in batches over multiple sessions.
- Use **Clear All** before starting a fresh export if you don't want old data
  mixed in.
- If your portal exposes recordIDs differently (e.g. only via JS state),
  use **"Paste IDs"** to feed them in manually from another source.
- The script only runs on `*.humana.com` (see `@match` in the header).
- No data leaves your browser — everything is stored locally and exported
  directly to your machine.

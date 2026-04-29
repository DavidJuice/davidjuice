// ==UserScript==
// @name         Humana Member Data Scraper
// @namespace    davidjuice.aceinsurance
// @version      1.0.0
// @description  Auto-collect srcMemberID, mbrName, medicareId for every active member from the Humana portal and export to CSV/Excel.
// @match        *://*.humana.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'humana_member_scraper_v1';
    const TEMPLATE_KEY = 'humana_member_scraper_template_v1';

    // ---------- storage ----------
    const load = () => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch (e) { return {}; }
    };
    const save = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    let records = load(); // keyed by srcMemberID to dedupe

    let urlTemplate = localStorage.getItem(TEMPLATE_KEY) || '';
    // urlTemplate is the captured URL with the recordID value replaced by {ID}

    // ---------- response handling ----------
    function ingestResponse(url, bodyText) {
        try {
            const data = JSON.parse(bodyText);
            // Recursively search for the keys we want — schema may be nested.
            const found = findFields(data, ['srcMemberID', 'mbrName', 'medicareId']);
            if (found.srcMemberID || found.medicareId || found.mbrName) {
                const key = found.srcMemberID || found.medicareId || found.mbrName;
                records[key] = {
                    srcMemberID: found.srcMemberID || '',
                    mbrName: found.mbrName || '',
                    medicareId: found.medicareId || '',
                    capturedAt: new Date().toISOString(),
                };
                save(records);
                refreshPanel();
            }
            // Capture URL template from the first matching call so we can replay.
            if (!urlTemplate) {
                const m = url.match(/([?&]recordID=)([^&]+)/i);
                if (m) {
                    urlTemplate = url.replace(m[0], m[1] + '{ID}');
                    localStorage.setItem(TEMPLATE_KEY, urlTemplate);
                    refreshPanel();
                }
            }
        } catch (e) { /* not JSON or missing fields — ignore */ }
    }

    function findFields(obj, keys, out) {
        out = out || {};
        if (!obj || typeof obj !== 'object') return out;
        if (Array.isArray(obj)) {
            for (const v of obj) findFields(v, keys, out);
            return out;
        }
        for (const k of Object.keys(obj)) {
            if (keys.includes(k) && !out[k] && obj[k] != null && typeof obj[k] !== 'object') {
                out[k] = String(obj[k]);
            }
            if (obj[k] && typeof obj[k] === 'object') findFields(obj[k], keys, out);
        }
        return out;
    }

    // ---------- network interception ----------
    const URL_MATCH = /member\?recordID=/i;

    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const res = await origFetch.apply(this, args);
        try {
            const reqUrl = (typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url) || '';
            if (URL_MATCH.test(reqUrl)) {
                const clone = res.clone();
                clone.text().then(t => ingestResponse(reqUrl, t)).catch(() => {});
            }
        } catch (e) {}
        return res;
    };

    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OrigXHR();
        let _url = '';
        const origOpen = xhr.open;
        xhr.open = function (method, url) {
            _url = url;
            return origOpen.apply(this, arguments);
        };
        xhr.addEventListener('load', function () {
            try {
                if (URL_MATCH.test(_url)) ingestResponse(_url, xhr.responseText);
            } catch (e) {}
        });
        return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    // ---------- recordID discovery ----------
    function findRecordIDsOnPage() {
        const ids = new Set();
        const html = document.documentElement.innerHTML;
        // Common patterns: recordID=ABC, recordId="ABC", data-record-id="ABC"
        const patterns = [
            /recordID["'=:\s]+([A-Za-z0-9_\-]{4,})/gi,
            /recordId["'=:\s]+([A-Za-z0-9_\-]{4,})/gi,
            /data-record-id=["']([A-Za-z0-9_\-]{4,})["']/gi,
        ];
        for (const re of patterns) {
            let m;
            while ((m = re.exec(html)) !== null) ids.add(m[1]);
        }
        // Also look in <a href> attributes
        document.querySelectorAll('a[href*="recordID"], a[href*="recordId"]').forEach(a => {
            const m = a.href.match(/record[Ii][Dd]=([A-Za-z0-9_\-]+)/);
            if (m) ids.add(m[1]);
        });
        return [...ids];
    }

    // ---------- bulk fetcher ----------
    let cancelRun = false;
    async function runBulk(ids, delayMs, onProgress) {
        cancelRun = false;
        if (!urlTemplate) {
            alert('No URL template yet. Manually click ONE member first so the scraper can learn the API URL, then re-run Auto-Fetch All.');
            return;
        }
        let done = 0, ok = 0, fail = 0;
        for (const id of ids) {
            if (cancelRun) break;
            const url = urlTemplate.replace('{ID}', encodeURIComponent(id));
            try {
                const r = await fetch(url, { credentials: 'include' });
                const t = await r.text();
                const before = Object.keys(records).length;
                ingestResponse(url, t);
                if (Object.keys(records).length > before) ok++; else fail++;
            } catch (e) { fail++; }
            done++;
            onProgress(done, ids.length, ok, fail);
            if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
        }
    }

    // ---------- export ----------
    function toCSV() {
        const rows = [['srcMemberID', 'mbrName', 'medicareId', 'capturedAt']];
        Object.values(records).forEach(r => {
            rows.push([r.srcMemberID, r.mbrName, r.medicareId, r.capturedAt]);
        });
        return rows.map(row =>
            row.map(v => {
                const s = String(v == null ? '' : v);
                return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            }).join(',')
        ).join('\n');
    }

    function downloadCSV() {
        const blob = new Blob(['﻿' + toCSV()], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'humana_members_' + new Date().toISOString().replace(/[:.]/g, '-') + '.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // ---------- UI ----------
    let panel, statusEl, countEl, templateEl, progressEl;

    function buildPanel() {
        panel = document.createElement('div');
        panel.id = 'humana-scraper-panel';
        panel.innerHTML = `
            <style>
                #humana-scraper-panel{position:fixed;top:12px;right:12px;width:300px;z-index:2147483647;
                    background:#0b3a5d;color:#fff;font:13px/1.4 system-ui,sans-serif;border-radius:8px;
                    box-shadow:0 6px 24px rgba(0,0,0,.35);padding:12px;}
                #humana-scraper-panel h3{margin:0 0 8px;font-size:14px;display:flex;justify-content:space-between;align-items:center;}
                #humana-scraper-panel button{background:#2ea3f2;color:#fff;border:0;border-radius:4px;
                    padding:6px 8px;margin:3px 3px 3px 0;cursor:pointer;font-size:12px;}
                #humana-scraper-panel button.warn{background:#c0392b;}
                #humana-scraper-panel button.ghost{background:#34557a;}
                #humana-scraper-panel button:hover{filter:brightness(1.1);}
                #humana-scraper-panel .row{margin:6px 0;}
                #humana-scraper-panel .meta{font-size:11px;opacity:.85;word-break:break-all;}
                #humana-scraper-panel input{width:60px;padding:3px;border-radius:3px;border:1px solid #ccc;color:#000;}
                #humana-scraper-panel .min{display:none;}
                #humana-scraper-panel.collapsed .min{display:none;}
                #humana-scraper-panel.collapsed .full{display:none;}
                #humana-scraper-panel .toggle{background:transparent;font-size:16px;padding:0 4px;}
            </style>
            <h3>Humana Member Scraper <button class="toggle" id="hms-toggle">_</button></h3>
            <div class="full">
                <div class="row" id="hms-count">Collected: 0</div>
                <div class="row meta" id="hms-template">URL template: (waiting — click 1 member manually)</div>
                <div class="row">
                    <button id="hms-scan">Scan IDs on page</button>
                    <button id="hms-fetch">Auto-Fetch All</button>
                </div>
                <div class="row">
                    Delay: <input id="hms-delay" type="number" value="300" min="0"> ms
                    <button id="hms-stop" class="warn">Stop</button>
                </div>
                <div class="row" id="hms-progress"></div>
                <div class="row">
                    <button id="hms-export">Export CSV</button>
                    <button id="hms-clear" class="warn">Clear All</button>
                    <button id="hms-paste" class="ghost">Paste IDs</button>
                </div>
                <div class="row meta" id="hms-status"></div>
            </div>
        `;
        document.body.appendChild(panel);

        countEl = panel.querySelector('#hms-count');
        templateEl = panel.querySelector('#hms-template');
        statusEl = panel.querySelector('#hms-status');
        progressEl = panel.querySelector('#hms-progress');

        panel.querySelector('#hms-toggle').onclick = () => panel.classList.toggle('collapsed');
        panel.querySelector('#hms-scan').onclick = () => {
            const ids = findRecordIDsOnPage();
            statusEl.textContent = `Found ${ids.length} recordIDs on this page.`;
            window.__humanaScrapedIDs = ids;
        };
        panel.querySelector('#hms-fetch').onclick = async () => {
            let ids = window.__humanaScrapedIDs;
            if (!ids || !ids.length) ids = findRecordIDsOnPage();
            if (!ids.length) { alert('No recordIDs found on this page. Make sure you are on the Active Policies list.'); return; }
            const delay = parseInt(panel.querySelector('#hms-delay').value, 10) || 300;
            statusEl.textContent = `Starting bulk fetch for ${ids.length} members...`;
            await runBulk(ids, delay, (done, total, ok, fail) => {
                progressEl.textContent = `Progress: ${done}/${total}  ok:${ok}  fail:${fail}`;
            });
            statusEl.textContent = 'Bulk fetch complete.';
        };
        panel.querySelector('#hms-stop').onclick = () => { cancelRun = true; statusEl.textContent = 'Stopping after current request...'; };
        panel.querySelector('#hms-export').onclick = downloadCSV;
        panel.querySelector('#hms-clear').onclick = () => {
            if (!confirm('Erase all collected records?')) return;
            records = {}; save(records); refreshPanel();
        };
        panel.querySelector('#hms-paste').onclick = async () => {
            const text = prompt('Paste recordIDs (comma, space, or newline separated):');
            if (!text) return;
            const ids = text.split(/[\s,]+/).filter(Boolean);
            window.__humanaScrapedIDs = ids;
            statusEl.textContent = `Loaded ${ids.length} recordIDs from paste.`;
        };

        refreshPanel();
    }

    function refreshPanel() {
        if (!panel) return;
        const n = Object.keys(records).length;
        countEl.textContent = `Collected: ${n} unique members`;
        templateEl.textContent = urlTemplate
            ? 'URL template: ' + urlTemplate.replace(/^https?:\/\/[^/]+/, '')
            : 'URL template: (waiting — click 1 member manually so the script learns the URL)';
    }

    function init() {
        if (document.body) buildPanel();
        else document.addEventListener('DOMContentLoaded', buildPanel);
    }
    init();
})();

/**
 * Ace Insurance Voice AI — Google Sheets Trigger
 *
 * Setup:
 * 1. Open the Google Sheet used by staff
 * 2. Extensions → Apps Script → paste this file
 * 3. Project Settings → Script Properties → add BACKEND_URL and TRIGGER_SECRET
 * 4. Triggers → Add Trigger:
 *      Function: checkAndTriggerCalls
 *      Event source: Time-driven
 *      Time interval: Every 5 minutes
 *
 * Sheet column layout:
 *   A: Client Name
 *   B: Phone Number (+1XXXXXXXXXX format)
 *   C: Preferred Language (Korean / English)
 *   D: Notes for AI
 *   E: Last Called (auto-filled by script)
 *   F: Status → set to "Call Today" to trigger a call
 */

function checkAndTriggerCalls() {
  const props = PropertiesService.getScriptProperties();
  const BACKEND_URL = props.getProperty('BACKEND_URL');
  const TRIGGER_SECRET = props.getProperty('TRIGGER_SECRET');

  if (!BACKEND_URL || !TRIGGER_SECRET) {
    Logger.log('ERROR: BACKEND_URL or TRIGGER_SECRET not set in Script Properties');
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // no data rows

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const clientName = row[0];  // A
    const phoneNumber = String(row[1]);  // B
    const language = row[2] || 'Korean';  // C
    const notes = row[3] || '';  // D
    // row[4] = E (Last Called — written by this script)
    const status = row[5];  // F

    if (status !== 'Call Today' || !phoneNumber || phoneNumber.trim() === '') continue;

    const payload = {
      clientName: clientName || '',
      phoneNumber: phoneNumber.trim(),
      language: language,
      notes: notes,
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: { 'x-trigger-secret': TRIGGER_SECRET },
      muteHttpExceptions: true,
    };

    let responseCode = null;
    try {
      const response = UrlFetchApp.fetch(BACKEND_URL + '/trigger/outbound-call', options);
      responseCode = response.getResponseCode();
      Logger.log('Call initiated for row ' + (i + 2) + ': ' + JSON.stringify(JSON.parse(response.getContentText())));
    } catch (e) {
      Logger.log('ERROR calling backend for row ' + (i + 2) + ': ' + e.message);
    }

    const sheetRow = i + 2; // +1 for 1-based, +1 for header row
    if (responseCode === 200) {
      sheet.getRange(sheetRow, 5).setValue(new Date()); // E: Last Called
      sheet.getRange(sheetRow, 6).setValue('Call Initiated'); // F: Status
    } else {
      sheet.getRange(sheetRow, 6).setValue('Call Failed (' + (responseCode || 'network error') + ')');
    }
  }
}

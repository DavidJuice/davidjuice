// Per-agent CSV email delivery.
//
// Safety guarantees:
// - An agent only receives rows where agent_of_record matches their name.
// - only_in_carrier rows have no AB-side agent and are NEVER emailed.
// - If any selected agent is missing an email address, the entire send aborts
//   BEFORE any email goes out — no partial sends.
// - The email body never contains PHI; PHI lives only in the attached CSV,
//   delivered in-domain under the Workspace BAA.

function emailPerAgent(runId, exceptions, agentsSelected, outputSheetUrl) {
  // Resolve all addresses up front; abort hard if any are missing.
  var directory = getAgentDirectory();
  var byName = {};
  for (var i = 0; i < directory.length; i++) byName[directory[i].name] = directory[i];

  var missing = [];
  for (var a = 0; a < agentsSelected.length; a++) {
    var entry = byName[agentsSelected[a]];
    if (!entry || !entry.email) missing.push(agentsSelected[a]);
  }
  if (missing.length) {
    throw new Error('Email aborted — missing addresses for: ' + missing.join(', '));
  }

  var sent = [];
  for (var k = 0; k < agentsSelected.length; k++) {
    var agent = agentsSelected[k];
    var rows = filterExceptionsForAgent_(exceptions, agent);

    // Strict filter: drop only_in_carrier (no AB agent attribution).
    rows = rows.filter(function (e) { return e.type !== EXCEPTION_TYPES.ONLY_IN_CARRIER; });
    if (rows.length === 0) {
      sent.push({ agent: agent, count: 0, skipped: true });
      continue;
    }

    var flat = rows.map(exceptionToFlatRow_);
    var csv = buildCsv(flat, EMAIL_CSV_COLUMNS);
    var blob = Utilities.newBlob(csv, 'text/csv', 'exceptions_' + agent.replace(/[^A-Za-z0-9]/g, '_') + '_' + runId + '.csv');

    var counts = summarizeCounts_(rows);
    var html = renderEmailHtml_(agent, runId, counts, outputSheetUrl);

    MailApp.sendEmail({
      to: byName[agent].email,
      subject: 'Reconciliation exceptions — ' + runId,
      htmlBody: html,
      attachments: [blob],
      noReply: true
    });
    audit('email_sent', runId, {
      agents_selected: [agent],
      detail: 'rows=' + rows.length
    });
    sent.push({ agent: agent, count: rows.length });
  }
  return sent;
}

function summarizeCounts_(rows) {
  var c = { only_in_AB: 0, field_mismatch: 0, fuzzy_review_needed: 0 };
  for (var i = 0; i < rows.length; i++) {
    c[rows[i].type] = (c[rows[i].type] || 0) + 1;
  }
  return c;
}

function renderEmailHtml_(agent, runId, counts, url) {
  var total = (counts.only_in_AB || 0) + (counts.field_mismatch || 0) + (counts.fuzzy_review_needed || 0);
  return [
    '<p>Hi ' + escapeHtml_(agent) + ',</p>',
    '<p>Your reconciliation results are ready.</p>',
    '<p><strong>Run:</strong> ' + escapeHtml_(runId) + '<br>',
    '<strong>Total exceptions for you:</strong> ' + total + '</p>',
    '<ul>',
    '<li>Only in AgencyBloc: ' + (counts.only_in_AB || 0) + '</li>',
    '<li>Field mismatches: ' + (counts.field_mismatch || 0) + '</li>',
    '<li>Need fuzzy-match review: ' + (counts.fuzzy_review_needed || 0) + '</li>',
    '</ul>',
    '<p>Details are in the attached CSV. The full results sheet (all agents) is here:<br>',
    '<a href="' + escapeHtml_(url || '') + '">' + escapeHtml_(url || '(no link)') + '</a></p>',
    '<p style="color:#888;font-size:12px;">This message and its attachment contain protected health information. Do not forward outside the company domain.</p>'
  ].join('');
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

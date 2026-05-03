// Data Search tool — scaffold.
//
// Implementation parked pending:
//   - The full Customer report column list.
//   - Confirmed output fields for the search results Sheet.
//   - DSNP/CSNP detection rule (plan-name substring vs. dedicated column).
//
// When the spec lands, fill in dataSearch_run() to load the canonical Customer
// rows, apply each filter from `criteria`, write results to a new run-named
// Sheet under /Reconciliation Tool/Searches/ and return its URL.

function dataSearch_loadCriteria() {
  return {
    age_range:        { type: 'range',  example: '65-75' },
    gender:           { type: 'select', options: ['all', 'male', 'female', 'other'] },
    county:           { type: 'multi',  example: 'King; Pierce' },
    zip:              { type: 'multi',  example: '98101; 98109' },
    city:             { type: 'multi',  example: 'Seattle; Bellevue' },
    primary_language: { type: 'multi',  example: 'English; Spanish' },
    country:          { type: 'multi',  example: 'United States' },
    medicaid:         { type: 'select', options: ['all', 'yes', 'no'] }
  };
}

function dataSearch_run(criteriaJson) {
  throw new Error('Data Search not yet configured. Send the admin the Customer report columns and the desired output fields.');
}

function dataSearch_export(searchId) {
  throw new Error('Data Search not yet configured.');
}

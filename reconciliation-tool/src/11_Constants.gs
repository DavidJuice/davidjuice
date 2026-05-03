// Canonical schema fields. Every source-specific column maps to one of these.
var CANONICAL_FIELDS = [
  'member_id',
  'policy_number',
  'mbi',
  'first_name',
  'last_name',
  'dob',
  'agent_of_record',
  'effective_date',
  'term_date',
  'plan_name',
  'plan_year',
  'status',
  'premium',
  'event_date',
  'carrier'
];

var EXCEPTION_TYPES = {
  ONLY_IN_AB:       'only_in_AB',
  ONLY_IN_CARRIER:  'only_in_carrier',
  FIELD_MISMATCH:   'field_mismatch',
  FUZZY_REVIEW:     'fuzzy_review_needed'
};

var RUN_PHASES = [
  'queued',
  'normalize',
  'collapse',
  'match',
  'categorize',
  'write',
  'email',
  'done',
  'failed'
];

// Columns included in per-agent CSV emails. PHI subset — minimum necessary.
var EMAIL_CSV_COLUMNS = [
  'check', 'type', 'matched_by',
  'policy_number', 'member_id', 'mbi',
  'first_name', 'last_name', 'dob',
  'plan_name', 'status', 'effective_date', 'term_date',
  'agent_of_record', 'carrier',
  'mismatch_field', 'left_value', 'right_value',
  'fuzzy_score', 'source_row_index'
];

// Property keys used by the chunked state machine.
var PROP_RUN_STATE_PREFIX = 'runState:';
var PROP_CURRENT_RUN_ID   = 'currentRunId';

// Tab name conventions
var TAB_AGENTS        = 'Agents';
var TAB_FIELD_MAP     = 'FieldMappings';
var TAB_SETTINGS      = 'Settings';
var TAB_AUDIT_LOG     = 'AuditLog';
var TAB_RUN_INDEX     = 'RunIndex';
var TAB_TEST_RESULTS  = 'TestResults';
var SCRATCH_TAB_PREFIX = '_scratch_';

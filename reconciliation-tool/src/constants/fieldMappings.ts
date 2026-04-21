/**
 * Known field name aliases per canonical field.
 * Used by fieldAutoMapper to auto-detect column mappings.
 * Organized by source type for more accurate matching.
 */

export const FIELD_ALIASES: Record<string, string[]> = {
  firstName: [
    'first name', 'first_name', 'fname', 'first',
    'insured first name', 'member first name',
    'subscriber first name', 'applicant first name',
    'client first name', 'given name',
  ],
  middleName: [
    'middle name', 'middle_name', 'mname', 'middle',
    'middle initial', 'mi', 'middle init',
    'insured middle name', 'member middle name',
  ],
  lastName: [
    'last name', 'last_name', 'lname', 'last',
    'insured last name', 'member last name',
    'subscriber last name', 'applicant last name',
    'client last name', 'surname', 'family name',
  ],
  dob: [
    'date of birth', 'dob', 'birth date', 'birthdate',
    'birth_date', 'member dob', 'insured dob',
    'date_of_birth', 'birthday', 'birth',
  ],
  ssn: [
    'ssn', 'social security', 'social security number',
    'ss#', 'ss #', 'ssn last 4', 'last 4 ssn',
    'social', 'tax id',
  ],
  phone: [
    'phone', 'phone number', 'phone_number', 'telephone',
    'contact phone', 'mobile', 'cell', 'cell phone',
    'home phone', 'primary phone', 'phone1', 'phone 1',
  ],
  email: [
    'email', 'email address', 'e-mail', 'email_address',
    'contact email', 'primary email',
  ],
  address: [
    'address', 'street address', 'address1', 'address 1',
    'street', 'mailing address', 'home address',
    'address line 1', 'address_line_1',
  ],
  city: [
    'city', 'city name', 'mailing city', 'home city',
  ],
  state: [
    'state', 'state code', 'st', 'mailing state',
    'home state', 'state/province',
  ],
  zip: [
    'zip', 'zip code', 'zipcode', 'zip_code', 'postal code',
    'postal', 'mailing zip', 'home zip', 'zip5',
  ],
  policyNumber: [
    'policy number', 'policy_number', 'policy #', 'policy no',
    'policy id', 'policy', 'member id', 'member number',
    'subscriber id', 'contract number', 'contract #',
    'enrollment id', 'id number', 'certificate number',
  ],
  carrier: [
    'carrier', 'insurance carrier', 'carrier name', 'company',
    'insurance company', 'insurer', 'payer',
  ],
  plan: [
    'plan', 'plan name', 'plan type', 'product',
    'product name', 'benefit plan', 'coverage',
    'plan description', 'product type',
  ],
  effectiveDate: [
    'effective date', 'eff date', 'eff_date', 'start date',
    'coverage start', 'effective_date', 'begin date',
    'enrollment date', 'policy effective date',
    'coverage effective date', 'start',
  ],
  terminationDate: [
    'termination date', 'term date', 'term_date', 'end date',
    'coverage end', 'termination_date', 'cancel date',
    'cancellation date', 'expiration date', 'policy end date',
    'disenrollment date',
  ],
  status: [
    'status', 'policy status', 'coverage status',
    'enrollment status', 'member status', 'active/inactive',
    'current status',
  ],
  premium: [
    'premium', 'monthly premium', 'premium amount',
    'mo premium', 'monthly amount', 'rate',
    'premium rate', 'payment amount',
  ],
  mbi: [
    'mbi', 'umid', 'medicare beneficiary identifier', 'medicare id',
    'medicare number', 'hicn', 'medicare',
  ],
};

export const IGNORE_FIELD = '__ignore__';

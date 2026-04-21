export const COMMISSION_FIELD_ALIASES: Record<string, string[]> = {
  mbi: [
    'mbi', 'umid', 'medicare beneficiary identifier', 'medicare id',
    'medicare number', 'hicn', 'medicare',
  ],
  grpNbr: [
    'grpnbr', 'group number', 'group nbr', 'group #', 'group no',
    'grp nbr', 'grp number', 'grp#', 'group',
  ],
  mbrNbr: [
    'mbrnbr', 'member number', 'member nbr', 'member #', 'member no',
    'mbr nbr', 'mbr#', 'member id',
  ],
  memberName: [
    'mbrname', 'member name', 'insured name', 'name',
    'client name', 'subscriber name',
  ],
  firstName: [
    'first name', 'first_name', 'fname', 'first',
    'member first name', 'insured first name',
  ],
  lastName: [
    'last name', 'last_name', 'lname', 'last',
    'member last name', 'insured last name',
  ],
  prodType: [
    'prodtype', 'product type', 'product', 'prod type',
    'product name', 'line of business', 'lob',
  ],
  planName: [
    'planname', 'plan name', 'plan', 'benefit plan',
    'plan description',
  ],
  paidToDate: [
    'paidtodate', 'paid to date', 'payment date', 'pay date',
    'date paid', 'paid date', 'paid_to_date',
  ],
  monthPaid: [
    'monthpaid', 'month paid', 'month_paid', 'commission month',
    'pay month', 'period', 'pay period',
  ],
  commAmt: [
    'commamt', 'commission amount', 'comm amt', 'comm amount',
    'commission', 'amount', 'comm_amt', 'payment amount',
  ],
};

export const AB_COMMISSION_FIELD_ALIASES: Record<string, string[]> = {
  mbi: [
    'mbi', 'umid', 'medicare beneficiary identifier', 'medicare id',
    'medicare number', 'hicn', 'medicare',
  ],
  firstName: [
    'first name', 'first_name', 'fname', 'first',
    'insured first name', 'member first name',
    'client first name', 'given name',
  ],
  lastName: [
    'last name', 'last_name', 'lname', 'last',
    'insured last name', 'member last name',
    'client last name', 'surname', 'family name',
  ],
  planName: [
    'plan', 'plan name', 'plan type', 'product',
    'product name', 'benefit plan', 'coverage',
    'plan description', 'product type',
  ],
  paidToDate: [
    'effective date', 'eff date', 'eff_date', 'start date',
    'coverage start', 'effective_date', 'begin date',
    'enrollment date', 'policy effective date',
  ],
  prodType: [
    'carrier', 'insurance carrier', 'carrier name', 'company',
    'insurance company', 'insurer', 'payer',
  ],
};

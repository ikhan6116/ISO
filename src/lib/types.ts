// Core data model for the ISO partner CRM.

export type ProgramCategory =
  | "debt_relief"
  | "credit_counseling"
  | "business_debt_relief"
  | "mortgage"
  | "heloc"
  | "home_equity_agreement"
  | "solar"
  | "solar_exit"
  | "hvac"
  | "timeshare_exit"
  | "equipment_financing"
  | "mca"
  | "business_loc"
  | "payment_processing"
  | "other";

export type RuleOp =
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "eq"
  | "neq"
  | "isTrue"
  | "isFalse"
  | "in"
  | "notIn"
  | "includesAny";

export interface Rule {
  id: string;
  field: string;
  op: RuleOp;
  /** number | string | string[] depending on the field/op; unused for isTrue/isFalse */
  value?: number | string | string[];
  /** required rules disqualify when failed; preferred rules only affect ranking */
  severity: "required" | "preferred";
  note?: string;
}

export interface ProgramProduct {
  id: string;
  name: string;
  description?: string;
  rules: Rule[];
}

export interface Program {
  id: string;
  name: string;
  partner: string;
  category: ProgramCategory;
  active: boolean;
  description?: string;
  /** Licensed / approved states. Empty means available in all states. */
  states: string[];
  rules: Rule[];
  /** Optional product lines (e.g. a mortgage lender's DSCR, Bank Statement, Reverse). */
  products: ProgramProduct[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  submissionNotes?: string;
  payoutNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PrimaryGoal =
  | "reduce_debt"
  | "refresh_loan"
  | "preserve_credit"
  | "home_financing"
  | "access_equity"
  | "business_funding"
  | "business_debt"
  | "lower_bills"
  | "exit_contract"
  | "other";

export type PropertyType = "primary" | "second_home" | "investment";

export type AccountType =
  | "credit_card"
  | "personal_loan"
  | "payday"
  | "collection"
  | "medical"
  | "auto"
  | "mortgage"
  | "heloc"
  | "student_loan"
  | "business"
  | "other";

export type AccountStatus = "current" | "late" | "charged_off" | "collection" | "closed" | "paid";

export interface Tradeline {
  id: string;
  creditor: string;
  accountType: AccountType;
  status: AccountStatus;
  balance: number;
  creditLimit?: number;
  monthlyPayment?: number;
  opened?: string;
  daysLate?: number;
  isBusiness?: boolean;
}

export interface CreditReport {
  fileName?: string;
  uploadedAt: string;
  source: "ai" | "parser" | "manual";
  bureauScores?: { experian?: number; equifax?: number; transunion?: number };
  tradelines: Tradeline[];
  warnings?: string[];
}

export type SubmissionStatus = "submitted" | "in_review" | "approved" | "funded" | "declined" | "withdrawn";

export interface Submission {
  id: string;
  programId: string;
  programName: string;
  productName?: string;
  status: SubmissionStatus;
  date: string;
  notes?: string;
}

export type ClientStage = "new" | "qualified" | "submitted" | "won" | "lost";

export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;
  stage: ClientStage;

  // Contact
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  state?: string;
  age?: number;
  creditScore?: number;
  monthlyIncome?: number;

  // Goals
  primaryGoal?: PrimaryGoal;
  interests: string[];

  // Consumer debt
  statedUnsecuredDebt?: number;
  hasPaydayLoans?: boolean;
  behindOnPayments?: boolean;

  // Home
  isHomeowner?: boolean;
  propertyType?: PropertyType;
  homeValue?: number;
  mortgageBalance?: number;
  mortgageInterests: string[];
  hasSolar?: boolean;
  monthlyEnergyBill?: number;
  wantsSolarExit?: boolean;
  hvacNeeds?: boolean;
  ownsTimeshare?: boolean;
  wantsTimeshareExit?: boolean;

  // Business
  isBusinessOwner?: boolean;
  businessName?: string;
  industry?: string;
  monthlyBusinessRevenue?: number;
  timeInBusinessMonths?: number;
  businessDebt?: number;
  behindOnBusinessDebt?: boolean;
  urgentFunding?: boolean;
  fundingAmountNeeded?: number;
  needsEquipment?: boolean;
  acceptsCards?: boolean;
  monthlyCardVolume?: number;

  creditReport?: CreditReport;
  submissions: Submission[];
  notes?: string;
}

export interface AppData {
  version: 1;
  clients: Client[];
  programs: Program[];
}

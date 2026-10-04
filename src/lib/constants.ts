import type { AccountStatus, AccountType, ClientStage, PrimaryGoal, ProgramCategory, PropertyType, SubmissionStatus } from "./types.ts";

export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
  ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"],
  ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
  ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));

export const CATEGORY_META: Record<ProgramCategory, { label: string; icon: string; group: "Consumer Debt" | "Home & Mortgage" | "Home Services" | "Business" | "Other" }> = {
  debt_relief: { label: "Debt Relief", icon: "💳", group: "Consumer Debt" },
  credit_counseling: { label: "Credit Counseling", icon: "🤝", group: "Consumer Debt" },
  mortgage: { label: "Mortgage Lending", icon: "🏠", group: "Home & Mortgage" },
  heloc: { label: "Digital HELOC", icon: "🏦", group: "Home & Mortgage" },
  home_equity_agreement: { label: "ESA / HEA / HEI", icon: "📈", group: "Home & Mortgage" },
  solar: { label: "Solar", icon: "☀️", group: "Home Services" },
  solar_exit: { label: "Solar Exit", icon: "🚪", group: "Home Services" },
  hvac: { label: "HVAC", icon: "❄️", group: "Home Services" },
  timeshare_exit: { label: "Timeshare Exit", icon: "🏝️", group: "Home Services" },
  business_debt_relief: { label: "Business Debt Relief", icon: "📉", group: "Business" },
  equipment_financing: { label: "Equipment Financing", icon: "🚜", group: "Business" },
  mca: { label: "Merchant Cash Advance", icon: "⚡", group: "Business" },
  business_loc: { label: "Business Line of Credit", icon: "💼", group: "Business" },
  payment_processing: { label: "Payment Processing", icon: "🧾", group: "Business" },
  other: { label: "Other", icon: "⭐", group: "Other" },
};

export const PRIMARY_GOALS: { value: PrimaryGoal; label: string; hint: string }[] = [
  { value: "reduce_debt", label: "Get out of debt / lower payments", hint: "Debt settlement or consolidation" },
  { value: "refresh_loan", label: "6-month refresh loan", hint: "Short program, then a new loan to rebuild" },
  { value: "preserve_credit", label: "Keep credit history intact", hint: "Credit counseling / DMP" },
  { value: "home_financing", label: "Buy or refinance a home", hint: "Mortgage partners" },
  { value: "access_equity", label: "Tap home equity", hint: "HELOC, HEI/HEA, cash-out refi" },
  { value: "business_funding", label: "Business funding", hint: "MCA, LOC, equipment" },
  { value: "business_debt", label: "Relief from business debt", hint: "Business debt relief partners" },
  { value: "lower_bills", label: "Lower home bills", hint: "Solar, HVAC efficiency" },
  { value: "exit_contract", label: "Exit a contract", hint: "Timeshare or solar exit" },
  { value: "other", label: "Other / not sure", hint: "" },
];

export const INTERESTS: { value: string; label: string }[] = [
  { value: "debt_relief", label: "Debt relief" },
  { value: "credit_counseling", label: "Credit counseling" },
  { value: "mortgage", label: "Mortgage" },
  { value: "heloc", label: "HELOC" },
  { value: "home_equity_agreement", label: "Home equity agreement (HEI/HEA)" },
  { value: "solar", label: "Solar" },
  { value: "hvac", label: "HVAC" },
  { value: "timeshare_exit", label: "Timeshare exit" },
  { value: "solar_exit", label: "Solar exit" },
  { value: "business_funding", label: "Business funding" },
  { value: "payment_processing", label: "Payment processing" },
];

export const MORTGAGE_INTERESTS: { value: string; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "rate_term_refi", label: "Rate/term refinance" },
  { value: "cash_out_refi", label: "Cash-out refinance" },
  { value: "debt_consolidation_refi", label: "Debt consolidation refi" },
  { value: "conventional", label: "Conventional" },
  { value: "fha", label: "FHA" },
  { value: "va", label: "VA" },
  { value: "usda", label: "USDA" },
  { value: "jumbo", label: "Jumbo" },
  { value: "non_qm", label: "Non-QM" },
  { value: "bank_statement", label: "Bank statement (self-employed)" },
  { value: "dscr", label: "DSCR (investor)" },
  { value: "fix_and_flip", label: "Fix & flip" },
  { value: "reverse", label: "Reverse mortgage (HECM)" },
];

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "primary", label: "Primary residence" },
  { value: "second_home", label: "Second home" },
  { value: "investment", label: "Investment property" },
];

export const STAGES: { value: ClientStage; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-slate-100 text-slate-700" },
  { value: "qualified", label: "Qualified", color: "bg-blue-100 text-blue-700" },
  { value: "submitted", label: "Submitted", color: "bg-amber-100 text-amber-800" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { value: "lost", label: "Lost", color: "bg-rose-100 text-rose-700" },
];

export const SUBMISSION_STATUSES: { value: SubmissionStatus; label: string; color: string }[] = [
  { value: "submitted", label: "Submitted", color: "bg-amber-100 text-amber-800" },
  { value: "in_review", label: "In review", color: "bg-blue-100 text-blue-700" },
  { value: "approved", label: "Approved", color: "bg-teal-100 text-teal-700" },
  { value: "funded", label: "Funded / Enrolled", color: "bg-emerald-100 text-emerald-700" },
  { value: "declined", label: "Declined", color: "bg-rose-100 text-rose-700" },
  { value: "withdrawn", label: "Withdrawn", color: "bg-slate-100 text-slate-600" },
];

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "credit_card", label: "Credit card" },
  { value: "personal_loan", label: "Personal loan" },
  { value: "payday", label: "Payday / high-cost loan" },
  { value: "collection", label: "Collection" },
  { value: "medical", label: "Medical" },
  { value: "auto", label: "Auto loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "heloc", label: "HELOC / home equity" },
  { value: "student_loan", label: "Student loan" },
  { value: "business", label: "Business debt" },
  { value: "other", label: "Other" },
];

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "late", label: "Late / past due" },
  { value: "charged_off", label: "Charged off" },
  { value: "collection", label: "In collections" },
  { value: "closed", label: "Closed" },
  { value: "paid", label: "Paid off" },
];

export const labelOf = <T extends string>(list: { value: T; label: string }[], v?: T | string) =>
  list.find((x) => x.value === v)?.label ?? (v || "—");

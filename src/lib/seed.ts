import type { Program, ProgramCategory, ProgramProduct, Rule } from "./types.ts";

// Starter partner programs. Partner names, states, and thresholds are SAMPLE values —
// edit them in the Programs section to match each partner agreement.

let n = 0;
const rid = (p: string) => `${p}-${++n}`;
const req = (field: string, op: Rule["op"], value?: Rule["value"], note?: string): Rule => ({ id: rid("r"), field, op, value, severity: "required", note });
const pref = (field: string, op: Rule["op"], value?: Rule["value"], note?: string): Rule => ({ id: rid("r"), field, op, value, severity: "preferred", note });
const product = (name: string, rules: Rule[], description?: string): ProgramProduct => ({ id: rid("p"), name, rules, description });

const now = "2026-01-01T00:00:00.000Z";
const program = (
  id: string,
  category: ProgramCategory,
  name: string,
  partner: string,
  fields: Partial<Program> & { rules?: Rule[] },
): Program => ({
  id,
  category,
  name,
  partner,
  active: true,
  states: [],
  rules: [],
  products: [],
  createdAt: now,
  updatedAt: now,
  ...fields,
});

// States where many debt settlement companies do not operate; used as an example exclusion list.
const DEBT_SETTLEMENT_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "DC", "FL", "HI", "ID", "IN", "IA", "KY", "LA", "MD", "MA", "MI", "MN",
  "MS", "MO", "MT", "NE", "NV", "NM", "NY", "NC", "OH", "OK", "PA", "SD", "TN", "TX", "UT", "VA", "WA", "WI", "WY",
];
const SUNBELT = ["AZ", "CA", "CO", "FL", "GA", "NV", "NC", "SC", "TX", "UT", "NJ", "NY", "MA", "IL"];

export const SEED_PROGRAMS: Program[] = [
  // ── Consumer debt ────────────────────────────────────────────────────────
  program("seed-dr-standard", "debt_relief", "Debt Settlement — Standard", "Debt Relief Partner A", {
    description: "Traditional debt settlement for unsecured debt. Does not accept payday loans.",
    states: DEBT_SETTLEMENT_STATES,
    rules: [
      req("unsecuredDebt", "gte", 10000, "Minimum $10,000 enrollable unsecured debt"),
      req("hasPaydayLoans", "isFalse", undefined, "Program does not accept payday loans"),
      pref("primaryGoal", "in", ["reduce_debt"], "Client wants to get out of debt"),
      pref("behindOnPayments", "isTrue", undefined, "Hardship / behind on payments"),
    ],
    submissionNotes: "Send last 2 months of statements or the credit report + hardship letter.",
  }),
  program("seed-dr-payday", "debt_relief", "Debt Relief — Payday Friendly", "Debt Relief Partner B", {
    description: "Accepts payday and high-cost online installment loans alongside unsecured debt.",
    states: DEBT_SETTLEMENT_STATES.filter((s) => !["NY", "PA"].includes(s)),
    rules: [
      req("unsecuredDebt", "gte", 5000, "Minimum $5,000 unsecured debt"),
      pref("hasPaydayLoans", "isTrue", undefined, "Specializes in payday loans"),
    ],
  }),
  program("seed-dr-refresh", "debt_relief", "6-Month Refresh Loan Program", "Debt Relief Partner C", {
    description: "Short debt-resolution program followed by a new consolidation/refresh loan after ~6 months.",
    states: SUNBELT,
    rules: [
      req("unsecuredDebt", "gte", 7500, "Minimum $7,500 unsecured debt"),
      req("monthlyIncome", "gte", 2500, "Verifiable income of $2,500+/month"),
      pref("primaryGoal", "in", ["refresh_loan"], "Primary goal is a 6-month refresh loan"),
      pref("hasPaydayLoans", "isFalse", undefined, "No payday loans preferred"),
    ],
  }),
  program("seed-cc-dmp", "credit_counseling", "Credit Counseling / Debt Management Plan", "Nonprofit Counseling Partner", {
    description: "Nonprofit DMP — lowers interest rates while keeping accounts in good standing. Best when preserving credit history matters most.",
    rules: [
      req("unsecuredDebt", "gte", 3000, "Minimum $3,000 unsecured debt"),
      pref("primaryGoal", "in", ["preserve_credit"], "Primary goal is maintaining credit history"),
      pref("monthlyIncome", "gte", 2000, "Income to support a single monthly payment"),
    ],
  }),

  // ── Home & mortgage ──────────────────────────────────────────────────────
  program("seed-mtg-a", "mortgage", "Full-Service Mortgage Lending", "Mortgage Partner A", {
    description: "Agency, Non-QM, investor and reverse mortgage products.",
    states: ["AZ", "CA", "CO", "FL", "GA", "IL", "MI", "NC", "NJ", "NV", "NY", "OH", "OR", "PA", "TN", "TX", "UT", "VA", "WA"],
    products: [
      product("Conventional / FHA / VA", [
        req("creditScore", "gte", 580, "580+ score (FHA)"),
        pref("mortgageInterests", "includesAny", ["purchase", "rate_term_refi", "conventional", "fha", "va"]),
      ]),
      product("Cash-Out / Debt Consolidation Refi", [
        req("isHomeowner", "isTrue"),
        req("ltv", "lte", 80, "CLTV at or below 80%"),
        req("creditScore", "gte", 620),
        pref("mortgageInterests", "includesAny", ["cash_out_refi", "debt_consolidation_refi"]),
        pref("unsecuredDebt", "gte", 15000, "High-interest debt to consolidate"),
      ]),
      product("Bank Statement Loan (Self-Employed)", [
        req("isBusinessOwner", "isTrue", undefined, "Business owner — qualify on bank statements"),
        req("timeInBusinessMonths", "gte", 24, "2+ years self-employed"),
        req("creditScore", "gte", 620),
      ], "Business owners can qualify using 12–24 months of bank statements instead of tax returns."),
      product("DSCR Investor Loan", [
        req("propertyType", "in", ["investment"], "Investment property"),
        req("creditScore", "gte", 640),
        pref("mortgageInterests", "includesAny", ["dscr", "fix_and_flip"]),
      ], "Qualifies on the property's rental income — no personal income docs."),
      product("Reverse Mortgage (HECM)", [
        req("age", "gte", 62, "Borrower age 62+"),
        req("isHomeowner", "isTrue"),
        req("propertyType", "in", ["primary"], "Primary residence"),
        req("ltv", "lte", 50, "Substantial equity (CLTV ≤ 50%)"),
      ], "Homeowners 62+ can convert equity to cash with no required monthly mortgage payment."),
    ],
  }),
  program("seed-heloc", "heloc", "Digital HELOC", "Digital HELOC Partner", {
    description: "Fully online HELOC — fast funding against home equity.",
    states: ["AL", "AZ", "CA", "CO", "FL", "GA", "IL", "IN", "KY", "MD", "MI", "MN", "MO", "NC", "NJ", "OH", "OR", "PA", "SC", "TN", "VA", "WA", "WI"],
    rules: [
      req("isHomeowner", "isTrue"),
      req("creditScore", "gte", 640, "640+ credit score"),
      req("ltv", "lte", 85, "CLTV at or below 85%"),
      pref("unsecuredDebt", "gte", 10000, "Use equity to pay off high-interest debt"),
    ],
  }),
  program("seed-hei", "home_equity_agreement", "Home Equity Agreement (HEI / HEA / ESA)", "Home Equity Investment Partner", {
    description: "Cash for a share of future home appreciation — no monthly payments. Works with lower credit scores.",
    states: ["AZ", "CA", "CO", "FL", "GA", "MA", "MD", "MI", "MN", "NC", "NJ", "NV", "NY", "OH", "OR", "PA", "SC", "TN", "UT", "VA", "WA"],
    rules: [
      req("isHomeowner", "isTrue"),
      req("ltv", "lte", 75, "At least 25% equity"),
      req("creditScore", "gte", 500),
      pref("propertyType", "in", ["primary", "second_home"]),
    ],
  }),

  // ── Home services ────────────────────────────────────────────────────────
  program("seed-solar", "solar", "Residential Solar", "Solar Partner", {
    states: ["AZ", "CA", "CO", "CT", "FL", "IL", "MA", "MD", "NJ", "NM", "NV", "NY", "TX", "UT"],
    rules: [
      req("isHomeowner", "isTrue"),
      req("hasSolar", "isFalse", undefined, "Home does not already have solar"),
      req("monthlyEnergyBill", "gte", 100, "Electric bill of $100+/month"),
      pref("creditScore", "gte", 650, "650+ for best financing"),
    ],
  }),
  program("seed-solar-exit", "solar_exit", "Solar Contract Exit", "Solar Exit Partner", {
    rules: [req("hasSolar", "isTrue"), req("wantsSolarExit", "isTrue", undefined, "Wants out of the solar contract/lease")],
  }),
  program("seed-hvac", "hvac", "HVAC Replacement & Financing", "HVAC Partner", {
    rules: [req("isHomeowner", "isTrue"), req("hvacNeeds", "isTrue", undefined, "Needs HVAC repair or replacement"), pref("monthlyEnergyBill", "gte", 200, "High energy bills")],
  }),
  program("seed-timeshare", "timeshare_exit", "Timeshare Exit", "Timeshare Exit Partner", {
    rules: [req("ownsTimeshare", "isTrue"), req("wantsTimeshareExit", "isTrue")],
  }),

  // ── Business ─────────────────────────────────────────────────────────────
  program("seed-bdr", "business_debt_relief", "Business Debt Relief", "Business Debt Relief Partner", {
    description: "Negotiates MCA, business loans and business credit card debt.",
    rules: [
      req("isBusinessOwner", "isTrue"),
      req("businessDebt", "gte", 50000, "Minimum $50,000 business debt"),
      pref("behindOnBusinessDebt", "isTrue", undefined, "Struggling to keep up with business debt"),
      pref("primaryGoal", "in", ["business_debt"]),
    ],
    submissionNotes: "Send the business debt schedule, 3 months bank statements, and MCA contracts.",
  }),
  program("seed-equip", "equipment_financing", "Equipment Financing", "Business Funding Partner", {
    rules: [
      req("isBusinessOwner", "isTrue"),
      req("timeInBusinessMonths", "gte", 12, "1+ year in business"),
      req("monthlyBusinessRevenue", "gte", 15000, "$15k+/month revenue"),
      req("creditScore", "gte", 600),
      pref("needsEquipment", "isTrue", undefined, "Needs equipment"),
    ],
  }),
  program("seed-mca", "mca", "Merchant Cash Advance", "Business Funding Partner", {
    description: "Fast funding for businesses in urgent need — revenue-based, credit-flexible.",
    rules: [
      req("isBusinessOwner", "isTrue"),
      req("monthlyBusinessRevenue", "gte", 10000, "$10k+/month revenue"),
      req("timeInBusinessMonths", "gte", 6, "6+ months in business"),
      pref("urgentFunding", "isTrue", undefined, "Urgent need for funds"),
    ],
  }),
  program("seed-loc", "business_loc", "Business Line of Credit", "Business Funding Partner", {
    description: "Revolving working-capital line.",
    rules: [
      req("isBusinessOwner", "isTrue"),
      req("monthlyBusinessRevenue", "gte", 20000, "$20k+/month revenue"),
      req("timeInBusinessMonths", "gte", 24, "2+ years in business"),
      req("creditScore", "gte", 650),
    ],
  }),
  program("seed-processing", "payment_processing", "Merchant Payment Processing", "Payment Processing Partner", {
    rules: [req("isBusinessOwner", "isTrue"), pref("acceptsCards", "isTrue"), pref("monthlyCardVolume", "gte", 10000, "$10k+/month card volume")],
  }),
];

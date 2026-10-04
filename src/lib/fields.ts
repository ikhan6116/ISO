import { analyzeCreditReport, type CreditAnalysis } from "./creditAnalysis.ts";
import { INTERESTS, MORTGAGE_INTERESTS, PRIMARY_GOALS, PROPERTY_TYPES, US_STATES } from "./constants.ts";
import type { Client, RuleOp } from "./types.ts";

export type FieldType = "number" | "boolean" | "select" | "multiselect";
export type FactValue = number | boolean | string | string[] | undefined;
export type Facts = Record<string, FactValue>;

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  group: "Client" | "Debt & Credit" | "Home" | "Business";
  unit?: "$" | "%" | "months" | "years";
  options?: { value: string; label: string }[];
  /** The plain-English question asked when this fact is missing */
  question?: string;
}

const goalOptions = PRIMARY_GOALS.map(({ value, label }) => ({ value, label }));
const stateOptions = US_STATES.map(({ code, name }) => ({ value: code, label: `${code} — ${name}` }));

/** Every fact a program rule can reference. */
export const FIELDS: FieldDef[] = [
  { key: "state", label: "State", type: "select", group: "Client", options: stateOptions, question: "What state does the client live in?" },
  { key: "age", label: "Age", type: "number", group: "Client", unit: "years", question: "How old is the client?" },
  { key: "monthlyIncome", label: "Monthly household income", type: "number", group: "Client", unit: "$", question: "What is the monthly household income?" },
  { key: "primaryGoal", label: "Primary goal", type: "select", group: "Client", options: goalOptions, question: "What is the client's primary goal?" },
  { key: "interests", label: "Interested in", type: "multiselect", group: "Client", options: INTERESTS },

  { key: "creditScore", label: "Credit score", type: "number", group: "Debt & Credit", question: "What is the client's approximate credit score?" },
  { key: "unsecuredDebt", label: "Unsecured debt", type: "number", group: "Debt & Credit", unit: "$", question: "How much unsecured debt (cards, personal loans, collections) does the client have?" },
  { key: "hasPaydayLoans", label: "Has payday loans", type: "boolean", group: "Debt & Credit", question: "Does the client have any payday loans?" },
  { key: "behindOnPayments", label: "Behind on payments", type: "boolean", group: "Debt & Credit", question: "Is the client behind on any payments?" },
  { key: "utilization", label: "Revolving utilization", type: "number", group: "Debt & Credit", unit: "%" },
  { key: "derogatoryCount", label: "Derogatory accounts", type: "number", group: "Debt & Credit" },

  { key: "isHomeowner", label: "Homeowner", type: "boolean", group: "Home", question: "Does the client own their home?" },
  { key: "propertyType", label: "Property type", type: "select", group: "Home", options: PROPERTY_TYPES, question: "Is the property a primary residence, second home, or investment property?" },
  { key: "homeValue", label: "Home value", type: "number", group: "Home", unit: "$", question: "What is the estimated home value?" },
  { key: "mortgageBalance", label: "Mortgage balance", type: "number", group: "Home", unit: "$", question: "What is the remaining mortgage balance?" },
  { key: "homeEquity", label: "Home equity", type: "number", group: "Home", unit: "$", question: "Home value and mortgage balance are needed to calculate equity." },
  { key: "ltv", label: "Combined loan-to-value", type: "number", group: "Home", unit: "%", question: "Home value and mortgage balance are needed to calculate CLTV." },
  { key: "mortgageInterests", label: "Mortgage programs wanted", type: "multiselect", group: "Home", options: MORTGAGE_INTERESTS, question: "Which mortgage programs is the client looking for?" },
  { key: "hasSolar", label: "Home already has solar", type: "boolean", group: "Home", question: "Does the home already have solar?" },
  { key: "monthlyEnergyBill", label: "Monthly energy bill", type: "number", group: "Home", unit: "$", question: "What is the average monthly electric bill?" },
  { key: "wantsSolarExit", label: "Wants out of solar contract", type: "boolean", group: "Home", question: "Does the client want out of their solar contract/lease?" },
  { key: "hvacNeeds", label: "Needs HVAC repair/replacement", type: "boolean", group: "Home", question: "Does the home need HVAC repair or replacement?" },
  { key: "ownsTimeshare", label: "Owns a timeshare", type: "boolean", group: "Home", question: "Does the client own a timeshare?" },
  { key: "wantsTimeshareExit", label: "Wants to exit timeshare", type: "boolean", group: "Home", question: "Does the client want to exit the timeshare?" },

  { key: "isBusinessOwner", label: "Business owner", type: "boolean", group: "Business", question: "Does the client own a business?" },
  { key: "monthlyBusinessRevenue", label: "Monthly business revenue", type: "number", group: "Business", unit: "$", question: "What is the average monthly business revenue?" },
  { key: "timeInBusinessMonths", label: "Time in business", type: "number", group: "Business", unit: "months", question: "How long has the business been established?" },
  { key: "businessDebt", label: "Business debt", type: "number", group: "Business", unit: "$", question: "How much business debt is outstanding?" },
  { key: "behindOnBusinessDebt", label: "Struggling with business debt", type: "boolean", group: "Business", question: "Is the business struggling to keep up with its debt payments?" },
  { key: "urgentFunding", label: "Urgent need for funds", type: "boolean", group: "Business", question: "Does the business urgently need funds?" },
  { key: "fundingAmountNeeded", label: "Funding amount needed", type: "number", group: "Business", unit: "$", question: "How much funding does the business need?" },
  { key: "needsEquipment", label: "Needs equipment", type: "boolean", group: "Business", question: "Does the business need to finance equipment?" },
  { key: "acceptsCards", label: "Accepts card payments", type: "boolean", group: "Business", question: "Does the business accept card payments?" },
  { key: "monthlyCardVolume", label: "Monthly card volume", type: "number", group: "Business", unit: "$", question: "What is the monthly card processing volume?" },
];

export const FIELD_MAP: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

export const OPS_FOR_TYPE: Record<FieldType, { op: RuleOp; label: string }[]> = {
  number: [
    { op: "gte", label: "is at least" },
    { op: "lte", label: "is at most" },
    { op: "gt", label: "is more than" },
    { op: "lt", label: "is less than" },
    { op: "eq", label: "equals" },
  ],
  boolean: [
    { op: "isTrue", label: "is Yes" },
    { op: "isFalse", label: "is No" },
  ],
  select: [
    { op: "in", label: "is one of" },
    { op: "notIn", label: "is not one of" },
  ],
  multiselect: [{ op: "includesAny", label: "includes any of" }],
};

/** Derive the facts used for matching, merging stated intake answers with credit-report findings. */
export function buildFacts(client: Client, analysis: CreditAnalysis | undefined = analyzeCreditReport(client.creditReport)): Facts {
  const s = analysis?.summary;
  const mortgageBalance = client.mortgageBalance ?? (s?.hasMortgage ? s.mortgageBalance : undefined);
  const liens = mortgageBalance != null ? mortgageBalance + (s?.helocBalance ?? 0) : undefined;
  const homeEquity = client.homeValue != null && liens != null ? client.homeValue - liens : undefined;
  const ltv = client.homeValue && liens != null ? Math.round((liens / client.homeValue) * 1000) / 10 : undefined;

  const hasPaydayLoans = client.hasPaydayLoans === true || (s ? s.paydayCount > 0 : false) ? true : client.hasPaydayLoans;
  const behindOnPayments = client.behindOnPayments === true || (s ? s.derogatoryCount > 0 : false) ? true : client.behindOnPayments;
  const businessDebt = s?.businessBalance ? Math.max(s.businessBalance, client.businessDebt ?? 0) : client.businessDebt;

  return {
    state: client.state || undefined,
    age: client.age,
    monthlyIncome: client.monthlyIncome,
    primaryGoal: client.primaryGoal,
    interests: client.interests,
    creditScore: client.creditScore ?? s?.averageScore,
    unsecuredDebt: s ? s.enrollableBalance : client.statedUnsecuredDebt,
    hasPaydayLoans,
    behindOnPayments,
    utilization: s?.utilization != null ? Math.round(s.utilization * 100) : undefined,
    derogatoryCount: s?.derogatoryCount,
    isHomeowner: client.isHomeowner ?? (s?.hasMortgage ? true : undefined),
    propertyType: client.propertyType,
    homeValue: client.homeValue,
    mortgageBalance,
    homeEquity,
    ltv,
    mortgageInterests: client.mortgageInterests,
    hasSolar: client.hasSolar,
    monthlyEnergyBill: client.monthlyEnergyBill,
    wantsSolarExit: client.wantsSolarExit,
    hvacNeeds: client.hvacNeeds,
    ownsTimeshare: client.ownsTimeshare,
    wantsTimeshareExit: client.wantsTimeshareExit,
    isBusinessOwner: client.isBusinessOwner,
    monthlyBusinessRevenue: client.monthlyBusinessRevenue,
    timeInBusinessMonths: client.timeInBusinessMonths,
    businessDebt,
    behindOnBusinessDebt: client.behindOnBusinessDebt,
    urgentFunding: client.urgentFunding,
    fundingAmountNeeded: client.fundingAmountNeeded,
    needsEquipment: client.needsEquipment,
    acceptsCards: client.acceptsCards,
    monthlyCardVolume: client.monthlyCardVolume,
  };
}

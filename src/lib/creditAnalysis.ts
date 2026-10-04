import type { AccountStatus, AccountType, CreditReport, ProgramCategory, Tradeline } from "./types.ts";

// Known payday / high-cost online lenders. Matching is case-insensitive and substring-based.
export const PAYDAY_LENDERS = [
  "advance america", "check into cash", "check n go", "check 'n go", "ace cash", "speedy cash", "cashnet",
  "cash net usa", "netcredit", "net credit", "oppfi", "opploans", "opp loans", "rise credit", "risecredit",
  "elastic", "elevate credit", "possible finance", "lendup", "mobiloans", "spotloan", "plain green",
  "big picture loans", "cashcall", "credit ninja", "creditninja", "lendly", "moneylion", "dave inc",
  "brigit", "earnin", "allied cash", "money tree", "moneytree", "titlemax", "loanmax", "check city",
  "curo", "greenline", "ad astra", "amplify funding", "blue trust", "maxlend", "minto money", "loan at last",
  "fig loans", "cashco", "approved cash", "cash express", "national cash", "purpose financial", "atlas lending",
  "personify", "xact", "applied bank", "zocaloans", "uprova", "ballstone", "arrowhead", "wheels financial",
];

const COLLECTION_AGENCIES = [
  "midland", "portfolio recovery", "lvnv", "cavalry", "jefferson capital", "enhanced recovery", "convergent",
  "credit collection", "ic system", "i.c. system", "transworld", "afni", "resurgent", "encore", "phoenix financial",
  "credit acceptance corp coll", "eos cca", "national credit systems", "receivables", "collection", "recovery",
  "radius global", "diversified consultants", "credence", "allied interstate", "unifin", "asset acceptance",
  "sherman", "velocity investments", "crown asset", "absolute resolutions",
];

const RULES: { type: AccountType; words: string[] }[] = [
  { type: "student_loan", words: ["navient", "nelnet", "mohela", "great lakes", "fedloan", "aidvantage", "edfinancial", "dept of ed", "department of education", "sallie mae", "student", "us dept ed", "ecmc"] },
  { type: "mortgage", words: ["mortgage", "mtg", "home loan", "rocket", "quicken", "mr. cooper", "mr cooper", "nationstar", "pennymac", "freedom mtg", "loandepot", "newrez", "shellpoint", "lakeview", "caliber", "cenlar", "dovenmuehle", "flagstar", "uwm", "united wholesale", "rushmore", "carrington", "phh"] },
  { type: "heloc", words: ["heloc", "home equity", "equity line"] },
  { type: "auto", words: ["auto", "motor", "toyota", "honda fin", "ford cred", "gm financial", "ally", "santander consumer", "carmax", "westlake", "credit acceptance", "exeter", "nissan", "hyundai", "kia motors", "chrysler", "capital one auto", "tesla", "bmw fin", "mercedes", "volkswagen", "subaru", "mazda", "lexus", "acura", "tidewater", "flagship credit", "global lending", "american credit acceptance", "cps", "regional acceptance"] },
  { type: "medical", words: ["medical", "hospital", "health", "clinic", "physician", "radiology", "anesthesia", "emergency", "ambulance", "pathology", "dental", "orthodont", "surgery"] },
  { type: "personal_loan", words: ["lending club", "lendingclub", "upstart", "sofi", "avant", "onemain", "one main", "best egg", "prosper", "marcus", "lightstream", "payoff", "happy money", "upgrade", "mariner", "world finance", "world acceptance", "regional finance", "lendmark", "heights finance", "republic finance", "personal loan", "installment"] },
  { type: "credit_card", words: ["card", "capital one", "cap one", "chase", "discover", "citi", "synchrony", "syncb", "amex", "american express", "barclays", "comenity", "credit one", "merrick", "mission lane", "milestone", "indigo", "total visa", "first premier", "celtic", "bank of america", "bk of amer", "wells fargo", "us bank", "u.s. bank", "td bank", "pnc", "goldman", "apple card", "kohls", "macys", "target", "walmart", "amazon", "best buy", "home depot", "lowes", "paypal", "jcpenney", "tjx", "ollo", "petal", "avant card", "fingerhut", "webbank", "concora", "genesis", "atlanticus", "ollo card", "bread", "visa", "mastercard"] },
];

const has = (name: string, words: string[]) => words.some((w) => name.includes(w));

export function isPaydayLender(creditor: string) {
  return has(creditor.toLowerCase(), PAYDAY_LENDERS);
}

/** Best-effort account type from the creditor name (and an optional raw type label from the report). */
export function classifyAccount(creditor: string, rawType = ""): AccountType {
  const name = `${creditor} ${rawType}`.toLowerCase();
  if (has(name, PAYDAY_LENDERS) || /payday|cash advance loan/.test(name)) return "payday";
  if (has(name, COLLECTION_AGENCIES) || /collection/.test(rawType.toLowerCase())) return "collection";
  if (/revolving|credit card|charge account/.test(rawType.toLowerCase())) return "credit_card";
  if (/mortgage|real estate|conventional|fha|va real/.test(rawType.toLowerCase())) return "mortgage";
  if (/auto|automobile|vehicle/.test(rawType.toLowerCase())) return "auto";
  if (/student|educational/.test(rawType.toLowerCase())) return "student_loan";
  if (/business|commercial/.test(name)) return "business";
  for (const r of RULES) if (has(name, r.words)) return r.type;
  if (/installment|unsecured/.test(rawType.toLowerCase())) return "personal_loan";
  return "other";
}

export function classifyStatus(raw: string): AccountStatus {
  const s = raw.toLowerCase();
  if (/charge.?off|charged off|profit and loss|bad debt/.test(s)) return "charged_off";
  if (/collection|placed for coll/.test(s)) return "collection";
  if (/paid|zero balance|settled/.test(s) && !/past due|late/.test(s)) return "paid";
  if (/\b(30|60|90|120|150|180)\b|late|past due|delinquent|derog/.test(s)) return "late";
  if (/closed/.test(s)) return "closed";
  return "current";
}

const UNSECURED: AccountType[] = ["credit_card", "personal_loan", "payday", "collection", "medical"];

export interface TradelineInsight {
  tradeline: Tradeline;
  unsecured: boolean;
  /** Eligible to enroll in a debt settlement / relief program */
  enrollable: boolean;
  /** Eligible for a credit-counseling DMP */
  dmpEligible: boolean;
  utilization?: number;
  priority: "high" | "medium" | "low";
  recommendation: string;
  programTags: ProgramCategory[];
}

export interface CreditSummary {
  totalBalance: number;
  unsecuredBalance: number;
  enrollableBalance: number;
  revolvingBalance: number;
  revolvingLimit: number;
  utilization?: number;
  mortgageBalance: number;
  hasMortgage: boolean;
  helocBalance: number;
  autoBalance: number;
  studentLoanBalance: number;
  businessBalance: number;
  paydayCount: number;
  paydayBalance: number;
  derogatoryCount: number;
  collectionsBalance: number;
  unsecuredMonthlyPayments: number;
  averageScore?: number;
  openAccounts: number;
}

export interface CreditAnalysis {
  insights: TradelineInsight[];
  summary: CreditSummary;
  highlights: string[];
}

const isOpenWithBalance = (t: Tradeline) => t.balance > 0 && t.status !== "paid";

export function analyzeTradeline(t: Tradeline): TradelineInsight {
  const unsecured = UNSECURED.includes(t.accountType) && !t.isBusiness;
  const active = isOpenWithBalance(t);
  const utilization = t.accountType === "credit_card" && t.creditLimit ? t.balance / t.creditLimit : undefined;
  const derog = t.status === "late" || t.status === "charged_off" || t.status === "collection";
  const base = { tradeline: t, unsecured, utilization };

  if (!active) {
    return { ...base, enrollable: false, dmpEligible: false, priority: "low", programTags: [], recommendation: "Paid or zero balance — no action needed. Positive history if it was paid as agreed." };
  }
  if (t.isBusiness || t.accountType === "business") {
    return { ...base, enrollable: false, dmpEligible: false, priority: "high", programTags: ["business_debt_relief"], recommendation: "Business obligation — package with other business debt and send to a business debt relief partner." };
  }
  switch (t.accountType) {
    case "payday":
      return { ...base, enrollable: true, dmpEligible: false, priority: "high", programTags: ["debt_relief"], recommendation: "Payday / high-cost lender — very high APR. Only route to a debt relief partner that accepts payday loans; most DMPs and standard settlement programs exclude these." };
    case "collection":
      return { ...base, enrollable: true, dmpEligible: false, priority: "high", programTags: ["debt_relief"], recommendation: "In collections — strong settlement candidate. Verify the debt is within the statute of limitations before enrolling." };
    case "medical":
      return { ...base, enrollable: true, dmpEligible: true, priority: "medium", programTags: ["debt_relief", "credit_counseling"], recommendation: "Medical debt — usually negotiable and often eligible for hardship reductions; can be enrolled in debt relief." };
    case "credit_card":
    case "personal_loan": {
      if (t.status === "charged_off") {
        return { ...base, enrollable: true, dmpEligible: false, priority: "high", programTags: ["debt_relief"], recommendation: "Charged off — settlement candidate; balance is no longer growing with the original creditor in most cases." };
      }
      if (t.status === "late") {
        return { ...base, enrollable: true, dmpEligible: true, priority: "high", programTags: ["debt_relief", "credit_counseling"], recommendation: "Past due — act before charge-off. Debt relief if the client can't catch up; a DMP if keeping credit history is the priority." };
      }
      if (utilization != null && utilization >= 0.7) {
        return { ...base, enrollable: true, dmpEligible: true, priority: "high", programTags: ["debt_relief", "credit_counseling", "heloc"], recommendation: `High utilization (${Math.round(utilization * 100)}%) — hurting the score. Candidate for a refresh/consolidation loan, a DMP to cut the rate, or a HELOC payoff if the client owns a home.` };
      }
      return { ...base, enrollable: true, dmpEligible: true, priority: "medium", programTags: ["debt_relief", "credit_counseling"], recommendation: t.accountType === "credit_card" ? "Current revolving account — include in a DMP or debt relief plan; consider leaving low-balance cards out to preserve history." : "Current unsecured installment loan — can be enrolled in debt relief or consolidated." };
    }
    case "mortgage":
      return { ...base, enrollable: false, dmpEligible: false, priority: derog ? "high" : "medium", programTags: ["mortgage", "heloc", "home_equity_agreement"], recommendation: derog ? "Mortgage is behind — secured by the home and not settleable. Discuss loss-mitigation; review refi options with a mortgage partner." : "Mortgage confirms home ownership — check equity for a cash-out refi, HELOC, or HEI to pay off high-interest debt." };
    case "heloc":
      return { ...base, enrollable: false, dmpEligible: false, priority: "low", programTags: ["mortgage"], recommendation: "Existing home equity line — secured; review whether a refinance could consolidate it." };
    case "auto":
      return { ...base, enrollable: false, dmpEligible: false, priority: derog ? "high" : "low", programTags: [], recommendation: derog ? "Auto loan is behind — secured, not eligible for settlement; client should keep it current to avoid repossession." : "Secured auto loan — not eligible for debt relief. Keep current." };
    case "student_loan":
      return { ...base, enrollable: false, dmpEligible: false, priority: "low", programTags: [], recommendation: "Student loan — not eligible for settlement programs. Federal loans may qualify for income-driven repayment (refer out)." };
    default:
      return { ...base, enrollable: false, dmpEligible: false, priority: "low", programTags: [], recommendation: "Unclassified account — review manually and set the account type." };
  }
}

export function analyzeCreditReport(report?: CreditReport): CreditAnalysis | undefined {
  if (!report || report.tradelines.length === 0) return undefined;
  const insights = report.tradelines.map(analyzeTradeline);
  const sum = (f: (i: TradelineInsight) => number) => insights.reduce((a, i) => a + f(i), 0);
  const active = (i: TradelineInsight) => isOpenWithBalance(i.tradeline);
  const typeBal = (type: AccountType) => sum((i) => (active(i) && i.tradeline.accountType === type ? i.tradeline.balance : 0));

  const revolving = insights.filter((i) => i.tradeline.accountType === "credit_card" && i.tradeline.status !== "paid" && i.tradeline.status !== "closed");
  const revolvingBalance = revolving.reduce((a, i) => a + i.tradeline.balance, 0);
  const revolvingLimit = revolving.reduce((a, i) => a + (i.tradeline.creditLimit ?? 0), 0);
  const scores = Object.values(report.bureauScores ?? {}).filter((n): n is number => typeof n === "number" && n > 0);

  const summary: CreditSummary = {
    totalBalance: sum((i) => (active(i) ? i.tradeline.balance : 0)),
    unsecuredBalance: sum((i) => (active(i) && i.unsecured ? i.tradeline.balance : 0)),
    enrollableBalance: sum((i) => (active(i) && i.enrollable ? i.tradeline.balance : 0)),
    revolvingBalance,
    revolvingLimit,
    utilization: revolvingLimit > 0 ? revolvingBalance / revolvingLimit : undefined,
    mortgageBalance: typeBal("mortgage"),
    hasMortgage: insights.some((i) => i.tradeline.accountType === "mortgage" && i.tradeline.status !== "paid" && i.tradeline.status !== "closed"),
    helocBalance: typeBal("heloc"),
    autoBalance: typeBal("auto"),
    studentLoanBalance: typeBal("student_loan"),
    businessBalance: sum((i) => (active(i) && (i.tradeline.isBusiness || i.tradeline.accountType === "business") ? i.tradeline.balance : 0)),
    paydayCount: insights.filter((i) => active(i) && i.tradeline.accountType === "payday").length,
    paydayBalance: typeBal("payday"),
    derogatoryCount: insights.filter((i) => ["late", "charged_off", "collection"].includes(i.tradeline.status) || i.tradeline.accountType === "collection").length,
    collectionsBalance: sum((i) => (active(i) && (i.tradeline.accountType === "collection" || i.tradeline.status === "collection") ? i.tradeline.balance : 0)),
    unsecuredMonthlyPayments: sum((i) => (active(i) && i.unsecured ? i.tradeline.monthlyPayment ?? 0 : 0)),
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined,
    openAccounts: insights.filter(active).length,
  };

  const highlights: string[] = [];
  const $ = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  if (summary.enrollableBalance > 0) highlights.push(`${$(summary.enrollableBalance)} in unsecured debt is eligible for debt relief enrollment.`);
  if (summary.paydayCount > 0) highlights.push(`${summary.paydayCount} payday / high-cost loan(s) totaling ${$(summary.paydayBalance)} — use a payday-friendly program.`);
  if (summary.utilization != null) highlights.push(`Revolving utilization is ${Math.round(summary.utilization * 100)}%${summary.utilization >= 0.5 ? " — high utilization is suppressing the score." : "."}`);
  if (summary.derogatoryCount > 0) highlights.push(`${summary.derogatoryCount} derogatory account(s) (late, charged-off, or collections).`);
  if (summary.hasMortgage) highlights.push(`Mortgage on file (${$(summary.mortgageBalance)}) — client is a homeowner; check equity products.`);
  if (summary.businessBalance > 0) highlights.push(`${$(summary.businessBalance)} in business debt — candidate for a business debt relief partner.`);
  if (summary.studentLoanBalance > 0) highlights.push(`${$(summary.studentLoanBalance)} in student loans (not eligible for settlement).`);

  return { insights, summary, highlights };
}

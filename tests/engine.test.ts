import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFacts } from "../src/lib/fields.ts";
import { matchPrograms } from "../src/lib/matching.ts";
import { SEED_PROGRAMS } from "../src/lib/seed.ts";
import { analyzeCreditReport, classifyAccount } from "../src/lib/creditAnalysis.ts";
import { parseCreditReportText } from "../src/lib/reportParser.ts";
import type { Client } from "../src/lib/types.ts";

const base = (o: Partial<Client> = {}): Client => ({
  id: "c1", createdAt: "", updatedAt: "", stage: "new", firstName: "Test", lastName: "Client",
  interests: [], mortgageInterests: [], submissions: [], ...o,
});
const byId = (c: Client) => Object.fromEntries(matchPrograms(SEED_PROGRAMS, buildFacts(c)).map((m) => [m.program.id, m]));

test("payday loans route away from the standard settlement program", () => {
  const m = byId(base({ state: "TX", statedUnsecuredDebt: 20000, hasPaydayLoans: true, monthlyIncome: 4000 }));
  assert.equal(m["seed-dr-standard"].status, "ineligible");
  assert.equal(m["seed-dr-payday"].status, "qualified");
});

test("minimum debt is enforced", () => {
  const m = byId(base({ state: "TX", statedUnsecuredDebt: 4000, hasPaydayLoans: false }));
  assert.equal(m["seed-dr-standard"].status, "ineligible");
  assert.equal(m["seed-cc-dmp"].status, "qualified");
});

test("goal ranks refresh loan / credit counseling first", () => {
  const refresh = matchPrograms(SEED_PROGRAMS, buildFacts(base({ state: "TX", statedUnsecuredDebt: 20000, hasPaydayLoans: false, monthlyIncome: 5000, primaryGoal: "refresh_loan" })));
  assert.equal(refresh[0].program.id, "seed-dr-refresh");
  const keep = matchPrograms(SEED_PROGRAMS, buildFacts(base({ state: "TX", statedUnsecuredDebt: 20000, hasPaydayLoans: false, primaryGoal: "preserve_credit" })));
  assert.equal(keep[0].program.id, "seed-cc-dmp");
});

test("mortgage products open up for business owners, investors and 62+", () => {
  const m = byId(base({ state: "CA", isHomeowner: true, propertyType: "primary", homeValue: 600000, mortgageBalance: 100000, age: 70, creditScore: 700, isBusinessOwner: true, timeInBusinessMonths: 36 }))["seed-mtg-a"];
  const q = m.products.filter((p) => p.status === "qualified").map((p) => p.product.name);
  assert.ok(q.includes("Reverse Mortgage (HECM)"));
  assert.ok(q.includes("Bank Statement Loan (Self-Employed)"));
  assert.ok(!q.includes("DSCR Investor Loan"));
  const out = byId(base({ state: "WY", creditScore: 700 }))["seed-mtg-a"];
  assert.equal(out.status, "ineligible");
});

test("state licensing gates HELOC; missing info is flagged", () => {
  assert.equal(byId(base({ state: "TX", isHomeowner: true, creditScore: 700, homeValue: 400000, mortgageBalance: 100000 }))["seed-heloc"].status, "ineligible");
  const m = byId(base({ state: "FL", isHomeowner: true }))["seed-heloc"];
  assert.equal(m.status, "needs_info");
  assert.deepEqual(m.missing.map((f) => f.key).sort(), ["creditScore", "ltv"]);
});

test("solar requires no existing solar and a bill threshold", () => {
  assert.equal(byId(base({ state: "AZ", isHomeowner: true, hasSolar: false, monthlyEnergyBill: 250 }))["seed-solar"].status, "qualified");
  assert.equal(byId(base({ state: "AZ", isHomeowner: true, hasSolar: true, monthlyEnergyBill: 250 }))["seed-solar"].status, "ineligible");
});

test("business funding uses revenue and time in business", () => {
  const m = byId(base({ isBusinessOwner: true, monthlyBusinessRevenue: 12000, timeInBusinessMonths: 8, creditScore: 560 }));
  assert.equal(m["seed-mca"].status, "qualified");
  assert.equal(m["seed-loc"].status, "ineligible");
});

test("credit report facts override stated answers", () => {
  const c = base({
    state: "TX", statedUnsecuredDebt: 1000,
    creditReport: { uploadedAt: "", source: "manual", tradelines: [
      { id: "a", creditor: "CAPITAL ONE", accountType: "credit_card", status: "current", balance: 9000, creditLimit: 10000 },
      { id: "b", creditor: "SPEEDY CASH", accountType: "payday", status: "late", balance: 1500 },
      { id: "c", creditor: "ROCKET MORTGAGE", accountType: "mortgage", status: "current", balance: 200000 },
      { id: "d", creditor: "NAVIENT", accountType: "student_loan", status: "current", balance: 30000 },
    ] },
  });
  const f = buildFacts(c);
  assert.equal(f.unsecuredDebt, 10500);
  assert.equal(f.hasPaydayLoans, true);
  assert.equal(f.isHomeowner, true);
  assert.equal(f.utilization, 90);
  const a = analyzeCreditReport(c.creditReport)!;
  assert.equal(a.summary.paydayCount, 1);
  assert.equal(a.insights.find((i) => i.tradeline.id === "d")!.enrollable, false);
});

test("creditor classification", () => {
  assert.equal(classifyAccount("NETCREDIT"), "payday");
  assert.equal(classifyAccount("MIDLAND CREDIT MGMT"), "collection");
  assert.equal(classifyAccount("SYNCB/AMAZON"), "credit_card");
  assert.equal(classifyAccount("MR. COOPER"), "mortgage");
});

test("text parser pulls tradelines and scores", () => {
  const text = `Credit Scores
TransUnion 612  Experian 598  Equifax 605
CAPITAL ONE
Account Type: Revolving
Balance: $4,512.00
Credit Limit: $5,000
Monthly Payment: $135
Account Status: Open / Current
MIDLAND CREDIT MANAGEMENT
Account Type: Collection
Balance: $1,250
Status: Collection account
CAPITAL ONE
Balance: $4,512.00`;
  const r = parseCreditReportText(text);
  assert.equal(r.tradelines.length, 2);
  assert.equal(r.tradelines[0].creditLimit, 5000);
  assert.equal(r.tradelines[1].accountType, "collection");
  assert.equal(r.bureauScores?.experian, 598);
});

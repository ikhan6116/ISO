import { CATEGORY_META, labelOf, MORTGAGE_INTERESTS, PRIMARY_GOALS, PROPERTY_TYPES } from "./constants.ts";
import type { CreditAnalysis } from "./creditAnalysis.ts";
import type { Facts } from "./fields.ts";
import { fullName, money } from "./format.ts";
import type { MatchResult } from "./matching.ts";
import type { Client } from "./types.ts";

const yn = (v: unknown) => (v === true ? "Yes" : v === false ? "No" : "Unknown");

/** Plain-text referral summary to send to a partner. Contains no SSN or account numbers. */
export function partnerSummary(client: Client, facts: Facts, match: MatchResult, analysis?: CreditAnalysis): string {
  const p = match.program;
  const cat = p.category;
  const lines: (string | false)[] = [
    `Referral: ${p.name}${p.partner ? ` (${p.partner})` : ""}`,
    `Client: ${fullName(client)}`,
    client.phone ? `Phone: ${client.phone}` : false,
    client.email ? `Email: ${client.email}` : false,
    `State: ${client.state ?? "—"}${client.age != null ? ` · Age: ${client.age}` : ""}`,
    `Credit score: ${facts.creditScore ?? "Unknown"}`,
    client.primaryGoal ? `Primary goal: ${labelOf(PRIMARY_GOALS, client.primaryGoal)}` : false,
  ];

  const qualifiedProducts = match.products.filter((x) => x.status !== "ineligible").map((x) => x.product.name);
  if (qualifiedProducts.length) lines.push(`Products of interest: ${qualifiedProducts.join(", ")}`);

  if (["debt_relief", "credit_counseling"].includes(cat)) {
    lines.push("", "— Debt —", `Enrollable unsecured debt: ${money(facts.unsecuredDebt as number | undefined)}`, `Payday loans: ${yn(facts.hasPaydayLoans)}`, `Behind on payments: ${yn(facts.behindOnPayments)}`);
    if (client.monthlyIncome) lines.push(`Monthly income: ${money(client.monthlyIncome)}`);
    if (analysis) {
      lines.push("", "Creditors:");
      analysis.insights
        .filter((i) => i.enrollable && i.tradeline.balance > 0)
        .forEach((i) => lines.push(`  • ${i.tradeline.creditor} — ${money(i.tradeline.balance)} (${i.tradeline.accountType.replace("_", " ")}, ${i.tradeline.status.replace("_", " ")})`));
    }
  }
  if (["mortgage", "heloc", "home_equity_agreement", "solar", "hvac"].includes(cat)) {
    lines.push("", "— Property —", `Homeowner: ${yn(facts.isHomeowner)}`, `Property type: ${labelOf(PROPERTY_TYPES, client.propertyType)}`, `Home value: ${money(client.homeValue)}`, `Mortgage balance: ${money(facts.mortgageBalance as number | undefined)}`);
    if (facts.ltv != null) lines.push(`CLTV: ${facts.ltv}%`);
    if (client.mortgageInterests.length) lines.push(`Looking for: ${client.mortgageInterests.map((m) => labelOf(MORTGAGE_INTERESTS, m)).join(", ")}`);
    if (cat === "solar") lines.push(`Has solar: ${yn(client.hasSolar)} · Monthly electric bill: ${money(client.monthlyEnergyBill)}`);
  }
  if (cat === "solar_exit") lines.push("", `Has solar: ${yn(client.hasSolar)} · Wants exit: ${yn(client.wantsSolarExit)}`);
  if (cat === "timeshare_exit") lines.push("", `Owns timeshare: ${yn(client.ownsTimeshare)} · Wants exit: ${yn(client.wantsTimeshareExit)}`);
  if (client.isBusinessOwner && ["business_debt_relief", "equipment_financing", "mca", "business_loc", "payment_processing", "mortgage"].includes(cat)) {
    lines.push(
      "",
      "— Business —",
      client.businessName ? `Business: ${client.businessName}${client.industry ? ` (${client.industry})` : ""}` : false,
      `Monthly revenue: ${money(client.monthlyBusinessRevenue)}`,
      `Time in business: ${client.timeInBusinessMonths != null ? `${client.timeInBusinessMonths} months` : "Unknown"}`,
      `Business debt: ${money(facts.businessDebt as number | undefined)} · Struggling: ${yn(client.behindOnBusinessDebt)}`,
      client.fundingAmountNeeded ? `Funding needed: ${money(client.fundingAmountNeeded)}${client.urgentFunding ? " (urgent)" : ""}` : false,
      client.acceptsCards ? `Card volume: ${money(client.monthlyCardVolume)}/mo` : false,
    );
  }
  if (match.fit.length) lines.push("", "Why this fits:", ...match.fit.map((f) => `  • ${f}`));
  if (client.notes) lines.push("", `Notes: ${client.notes}`);
  lines.push("", `— Sent from ISO Partner CRM · ${CATEGORY_META[cat].label}`);
  return lines.filter((l): l is string => l !== false).join("\n").replace(/\n{3,}/g, "\n\n");
}

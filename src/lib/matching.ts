import { CATEGORY_META } from "./constants.ts";
import { FIELD_MAP, OPS_FOR_TYPE, type FactValue, type Facts, type FieldDef } from "./fields.ts";
import { money } from "./format.ts";
import type { PrimaryGoal, Program, ProgramCategory, ProgramProduct, Rule } from "./types.ts";

export type RuleStatus = "pass" | "fail" | "unknown";
export type MatchStatus = "qualified" | "needs_info" | "ineligible";

export interface RuleResult {
  rule: Rule;
  status: RuleStatus;
  text: string;
}

export interface ProductResult {
  product: ProgramProduct;
  status: MatchStatus;
  results: RuleResult[];
  score: number;
}

export interface MatchResult {
  program: Program;
  status: MatchStatus;
  score: number;
  results: RuleResult[];
  products: ProductResult[];
  missing: FieldDef[];
  fit: string[];
}

const isBlank = (v: FactValue) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function formatValue(field: FieldDef | undefined, v: Rule["value"]): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    const labels = v.map((x) => field?.options?.find((o) => o.value === x)?.label ?? x);
    return labels.length > 4 ? `${labels.slice(0, 4).join(", ")} +${labels.length - 4} more` : labels.join(", ");
  }
  if (typeof v === "number") {
    if (field?.unit === "$") return money(v);
    if (field?.unit === "%") return `${v}%`;
    if (field?.unit) return `${v} ${field.unit}`;
    return String(v);
  }
  return field?.options?.find((o) => o.value === v)?.label ?? String(v);
}

export function describeRule(rule: Rule): string {
  const field = FIELD_MAP[rule.field];
  const label = field?.label ?? rule.field;
  const opLabel = field ? OPS_FOR_TYPE[field.type].find((o) => o.op === rule.op)?.label : rule.op;
  if (rule.op === "isTrue" || rule.op === "isFalse") return `${label} ${opLabel}`;
  return `${label} ${opLabel ?? rule.op} ${formatValue(field, rule.value)}`;
}

export function evaluateRule(rule: Rule, facts: Facts): RuleResult {
  const fact = facts[rule.field];
  const text = describeRule(rule);
  if (isBlank(fact)) return { rule, status: "unknown", text };

  const num = typeof rule.value === "number" ? rule.value : Number(rule.value);
  const list = Array.isArray(rule.value) ? rule.value : rule.value != null ? [String(rule.value)] : [];
  let ok: boolean;
  switch (rule.op) {
    case "gte": ok = (fact as number) >= num; break;
    case "lte": ok = (fact as number) <= num; break;
    case "gt": ok = (fact as number) > num; break;
    case "lt": ok = (fact as number) < num; break;
    case "eq": ok = fact === rule.value || (typeof fact === "number" && fact === num); break;
    case "neq": ok = fact !== rule.value; break;
    case "isTrue": ok = fact === true; break;
    case "isFalse": ok = fact === false; break;
    case "in": ok = list.includes(String(fact)); break;
    case "notIn": ok = !list.includes(String(fact)); break;
    case "includesAny": ok = Array.isArray(fact) && fact.some((x) => list.includes(x)); break;
    default: ok = false;
  }
  return { rule, status: ok ? "pass" : "fail", text };
}

function stateRule(states: string[]): Rule {
  return { id: "__state", field: "state", op: "in", value: states, severity: "required" };
}

function rollup(results: RuleResult[]): { status: MatchStatus; score: number } {
  const required = results.filter((r) => r.rule.severity === "required");
  const preferred = results.filter((r) => r.rule.severity === "preferred");
  const status: MatchStatus = required.some((r) => r.status === "fail")
    ? "ineligible"
    : required.some((r) => r.status === "unknown")
      ? "needs_info"
      : "qualified";
  const score =
    preferred.filter((r) => r.status === "pass").length * 12 -
    preferred.filter((r) => r.status === "fail").length * 6 -
    required.filter((r) => r.status === "unknown").length * 4;
  return { status, score };
}

// Which goals / interests make a category a natural fit for the client.
const CATEGORY_FIT: Record<ProgramCategory, { goals: PrimaryGoal[]; interests: string[] }> = {
  debt_relief: { goals: ["reduce_debt", "refresh_loan"], interests: ["debt_relief"] },
  credit_counseling: { goals: ["preserve_credit", "reduce_debt"], interests: ["credit_counseling", "debt_relief"] },
  business_debt_relief: { goals: ["business_debt"], interests: ["business_funding"] },
  mortgage: { goals: ["home_financing", "access_equity"], interests: ["mortgage"] },
  heloc: { goals: ["access_equity", "reduce_debt"], interests: ["heloc"] },
  home_equity_agreement: { goals: ["access_equity", "reduce_debt"], interests: ["home_equity_agreement"] },
  solar: { goals: ["lower_bills"], interests: ["solar"] },
  solar_exit: { goals: ["exit_contract", "lower_bills"], interests: ["solar_exit"] },
  hvac: { goals: ["lower_bills"], interests: ["hvac"] },
  timeshare_exit: { goals: ["exit_contract"], interests: ["timeshare_exit"] },
  equipment_financing: { goals: ["business_funding"], interests: ["business_funding"] },
  mca: { goals: ["business_funding"], interests: ["business_funding"] },
  business_loc: { goals: ["business_funding"], interests: ["business_funding"] },
  payment_processing: { goals: ["business_funding"], interests: ["payment_processing"] },
  other: { goals: [], interests: [] },
};

export function evaluateProgram(program: Program, facts: Facts): MatchResult {
  const rules = program.states.length ? [stateRule(program.states), ...program.rules] : program.rules;
  const results = rules.map((r) => evaluateRule(r, facts));
  const base = rollup(results);

  const products: ProductResult[] = program.products.map((product) => {
    const pr = product.rules.map((r) => evaluateRule(r, facts));
    const { status, score } = rollup(pr);
    return { product, status, results: pr, score };
  });
  products.sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.score - a.score);

  let status = base.status;
  let score = base.score;
  if (products.length && status !== "ineligible") {
    const best = products[0];
    if (best.status === "ineligible") status = "ineligible";
    else if (best.status === "needs_info" && status === "qualified") status = "needs_info";
    score += Math.max(0, best.score);
  }

  const fit: string[] = [];
  const goal = facts.primaryGoal as PrimaryGoal | undefined;
  const interests = (facts.interests as string[] | undefined) ?? [];
  const meta = CATEGORY_FIT[program.category];
  if (goal && meta.goals.includes(goal)) {
    score += meta.goals[0] === goal ? 30 : 15;
    fit.push("Matches the client's primary goal");
  }
  if (interests.some((i) => meta.interests.includes(i))) {
    score += 15;
    fit.push(`Client expressed interest in ${CATEGORY_META[program.category].label.toLowerCase()}`);
  }
  for (const r of [...results, ...(products[0]?.results ?? [])]) {
    if (r.rule.severity === "preferred" && r.status === "pass") fit.push(r.rule.note || r.text);
  }

  const missingKeys = new Set<string>();
  const collect = (rs: RuleResult[]) => rs.forEach((r) => r.status === "unknown" && r.rule.severity === "required" && missingKeys.add(r.rule.field));
  collect(results);
  products.filter((p) => p.status !== "ineligible").forEach((p) => collect(p.results));
  const missing = [...missingKeys].map((k) => FIELD_MAP[k]).filter(Boolean);

  return { program, status, score, results, products, missing, fit };
}

export const statusRank = (s: MatchStatus) => (s === "qualified" ? 0 : s === "needs_info" ? 1 : 2);

export function matchPrograms(programs: Program[], facts: Facts): MatchResult[] {
  return programs
    .filter((p) => p.active)
    .map((p) => evaluateProgram(p, facts))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.score - a.score || a.program.name.localeCompare(b.program.name));
}

/** The questions that would unlock the most "needs info" programs, most impactful first. */
export function topQuestions(matches: MatchResult[], limit = 6): { field: FieldDef; programs: string[] }[] {
  const byField = new Map<string, { field: FieldDef; programs: string[] }>();
  for (const m of matches) {
    if (m.status !== "needs_info") continue;
    for (const f of m.missing) {
      const entry = byField.get(f.key) ?? { field: f, programs: [] };
      entry.programs.push(m.program.name);
      byField.set(f.key, entry);
    }
  }
  return [...byField.values()].sort((a, b) => b.programs.length - a.programs.length).slice(0, limit);
}

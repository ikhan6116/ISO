import { classifyAccount, classifyStatus } from "./creditAnalysis.ts";
import { uid } from "./format.ts";
import type { CreditReport, Tradeline } from "./types.ts";

// Best-effort, offline extraction of tradelines from credit report text (PDF text layer, HTML, or TXT).
// Layouts vary widely between bureaus and monitoring services, so results should always be reviewed
// in the editable tradeline table. When ANTHROPIC_API_KEY is configured the AI extractor is used instead.

const MONEY = /\$?\s?(-?\d{1,3}(?:,\d{3})+(?:\.\d{2})?|-?\d+(?:\.\d{2})?)/;
const LABELS = {
  balance: /^(?:current\s+)?balance(?:\s+owed)?\b|^amount\s+owed|^balance\s+amount/i,
  limit: /^(?:credit\s+limit|high\s+credit|high\s+balance|original\s+amount|loan\s+amount|limit)\b/i,
  payment: /^(?:monthly\s+payment|scheduled\s+payment|payment\s+amount|terms?\s+amount|min(?:imum)?\s+payment)\b/i,
  type: /^(?:account\s+type|type\s+of\s+account|loan\s+type|type|account\s+type\s+-\s+detail)\b/i,
  status: /^(?:account\s+status|status|payment\s+status|pay\s+status|condition|account\s+condition)\b/i,
  opened: /^(?:date\s+opened|opened|open\s+date)\b/i,
};
const NOT_CREDITOR = /^(?:account|balance|status|date|payment|credit|high|type|terms|original|remarks|comments|creditor|responsibility|individual|joint|page|report|summary|personal|inquir|public|address|phone|name|employer|transunion|experian|equifax|bureau|months|limit|past due|last|closed|open|revolving|installment|mortgage|collection|no\s|yes\b|n\/a|ok\b|current|late|reported|score|total|\d)/i;

const amount = (s: string) => {
  const m = s.match(MONEY);
  return m ? parseFloat(m[1].replace(/,/g, "")) : undefined;
};

/** Splits "Label: value" or "Label   value" lines. */
function labelValue(line: string): [string, string] | undefined {
  const m = line.match(/^([A-Za-z][A-Za-z\s/#.-]{1,40}?)\s*[:\t]\s*(.+)$/) || line.match(/^([A-Za-z][A-Za-z\s/#.-]{1,40}?)\s{2,}(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : undefined;
}

function looksLikeCreditor(line: string) {
  const t = line.trim();
  if (t.length < 3 || t.length > 45) return false;
  if (NOT_CREDITOR.test(t)) return false;
  if (/[:$]/.test(t) || /\d{3,}/.test(t)) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  const upperRatio = letters.replace(/[^A-Z]/g, "").length / letters.length;
  return upperRatio > 0.7;
}

export function extractScores(text: string): CreditReport["bureauScores"] {
  const scores: NonNullable<CreditReport["bureauScores"]> = {};
  for (const bureau of ["experian", "equifax", "transunion"] as const) {
    const re = new RegExp(`${bureau}[^\\n\\d]{0,40}?\\b([3-8]\\d{2})\\b`, "i");
    const m = text.match(re);
    if (m) scores[bureau] = parseInt(m[1], 10);
  }
  if (!Object.keys(scores).length) {
    const m = text.match(/(?:credit\s+score|fico|vantage\s*score)[^\n\d]{0,30}\b([3-8]\d{2})\b/i);
    if (m) scores.transunion = parseInt(m[1], 10);
  }
  return scores;
}

export function parseCreditReportText(text: string): { tradelines: Tradeline[]; bureauScores: CreditReport["bureauScores"]; warnings: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/g, "")).filter((l) => l.trim());
  const found: Tradeline[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!looksLikeCreditor(lines[i])) continue;
    // A creditor header must be followed by a balance within the next ~25 lines, before the next header.
    let balance: number | undefined, limit: number | undefined, payment: number | undefined;
    let rawType = "", rawStatus = "", opened: string | undefined;
    let end = i + 1;
    for (; end < Math.min(lines.length, i + 26); end++) {
      const line = lines[end].trim();
      if (end > i + 1 && looksLikeCreditor(line) && balance !== undefined) break;
      const lv = labelValue(line);
      if (!lv) continue;
      const [label, value] = lv;
      if (LABELS.balance.test(label) && balance === undefined) balance = amount(value);
      else if (LABELS.limit.test(label) && limit === undefined) limit = amount(value);
      else if (LABELS.payment.test(label) && payment === undefined) payment = amount(value);
      else if (LABELS.type.test(label) && !rawType) rawType = value;
      else if (LABELS.status.test(label)) rawStatus += ` ${value}`;
      else if (LABELS.opened.test(label) && !opened) opened = value.slice(0, 12);
    }
    if (balance === undefined) continue;

    const creditor = lines[i].trim().replace(/\s{2,}/g, " ");
    found.push({
      id: uid(),
      creditor,
      accountType: classifyAccount(creditor, rawType),
      status: classifyStatus(rawStatus),
      balance,
      creditLimit: limit,
      monthlyPayment: payment,
      opened,
    });
    i = end - 1;
  }

  // Tri-merge reports repeat each account once per bureau — collapse duplicates.
  const seen = new Set<string>();
  const tradelines = found.filter((t) => {
    const key = `${t.creditor.toLowerCase()}|${t.balance}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!tradelines.length) warnings.push("No accounts could be read automatically from this file. Add them manually below, or configure AI extraction.");
  else warnings.push("Accounts were read with the built-in parser — review balances and account types before relying on them.");
  return { tradelines, bureauScores: extractScores(text), warnings };
}

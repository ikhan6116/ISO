import Anthropic from "@anthropic-ai/sdk";
import type { NextApiRequest, NextApiResponse } from "next";

// AI-powered tradeline extraction. Optional: when ANTHROPIC_API_KEY is not set, the UI falls back
// to the built-in text parser. The uploaded report is processed in memory and never stored server-side.

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

const ACCOUNT_TYPES = ["credit_card", "personal_loan", "payday", "collection", "medical", "auto", "mortgage", "heloc", "student_loan", "business", "other"];
const STATUSES = ["current", "late", "charged_off", "collection", "closed", "paid"];
const nullable = (type: string) => ({ type: [type, "null"] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["bureauScores", "tradelines"],
  properties: {
    bureauScores: {
      type: "object",
      additionalProperties: false,
      required: ["experian", "equifax", "transunion"],
      properties: { experian: nullable("integer"), equifax: nullable("integer"), transunion: nullable("integer") },
    },
    tradelines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["creditor", "accountType", "status", "balance", "creditLimit", "monthlyPayment", "opened", "daysLate", "isBusiness"],
        properties: {
          creditor: { type: "string" },
          accountType: { type: "string", enum: ACCOUNT_TYPES },
          status: { type: "string", enum: STATUSES },
          balance: { type: "number" },
          creditLimit: nullable("number"),
          monthlyPayment: nullable("number"),
          opened: nullable("string"),
          daysLate: nullable("integer"),
          isBusiness: { type: "boolean" },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = `You are extracting structured data from a consumer credit report for a debt-relief and lending referral desk.

Return every tradeline (credit account) and collection account in the report, once each. Tri-merge reports list the same account under Experian, Equifax and TransUnion — merge those into a single entry, using the most recent / highest reported balance. Include closed and paid accounts too (status "closed" or "paid").

Field guidance:
- creditor: the creditor or collection agency name as printed (no account numbers).
- accountType: "payday" for payday, cash-advance, and high-cost online installment lenders (e.g. Speedy Cash, NetCredit, OppLoans, Rise, CashNet). "collection" for collection agencies and debt buyers. "medical" for medical providers. "business" only if the account is clearly a business/commercial obligation.
- status: "charged_off" for charge-offs, "collection" if placed for collection, "late" if currently past due or the latest status is 30+ days late, otherwise "current"; "closed"/"paid" for closed or zero-balance paid accounts.
- balance: current balance in dollars (0 if none). creditLimit: credit limit or high credit / original amount if no limit. monthlyPayment: scheduled monthly payment.
- opened: date opened as printed (MM/YYYY preferred) or null. daysLate: worst current delinquency in days, or null.
- bureauScores: credit scores per bureau if shown, otherwise null.

Use null when a value isn't in the report. Do not guess numbers.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.status(200).json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI extraction is not configured (set ANTHROPIC_API_KEY)." });

  const { pdfBase64, text } = (req.body ?? {}) as { pdfBase64?: string; text?: string };
  if (!pdfBase64 && !text) return res.status(400).json({ error: "Send pdfBase64 or text." });

  const content: Anthropic.Beta.BetaContentBlockParam[] = pdfBase64
    ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }, { type: "text", text: "Extract the credit report data." }]
    : [{ type: "text", text: `<credit_report>\n${text}\n</credit_report>\n\nExtract the credit report data.` }];

  try {
    const client = new Anthropic();
    const stream = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: INSTRUCTIONS,
      messages: [{ role: "user", content }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") return res.status(422).json({ error: "The report could not be processed by the AI extractor. Use the built-in parser or enter accounts manually." });
    if (message.stop_reason === "max_tokens") return res.status(422).json({ error: "The report was too long to extract in one pass. Try uploading a single-bureau report." });

    const json = message.content.find((b) => b.type === "text");
    if (!json || json.type !== "text") return res.status(502).json({ error: "No data returned." });
    return res.status(200).json(JSON.parse(json.text));
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "The configured ANTHROPIC_API_KEY was rejected." });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "AI extraction is rate limited — try again in a minute." });
    if (err instanceof Anthropic.BadRequestError) return res.status(400).json({ error: `The report could not be read: ${err.message}` });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `AI service error (${err.status ?? "network"}).` });
    if (err instanceof SyntaxError) return res.status(502).json({ error: "AI returned malformed data — try again." });
    throw err;
  }
}

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_META } from "@/lib/constants.ts";
import type { CreditAnalysis } from "@/lib/creditAnalysis.ts";
import type { Facts } from "@/lib/fields.ts";
import { uid } from "@/lib/format.ts";
import { topQuestions, type MatchResult, type RuleResult } from "@/lib/matching.ts";
import { partnerSummary } from "@/lib/summary.ts";
import type { Client } from "@/lib/types.ts";
import { FactQuestion, type Patch } from "./ClientSections.tsx";
import { Badge, Button, Card, Empty, cx } from "./ui.tsx";

const STATUS_STYLE = {
  qualified: { label: "Qualified", cls: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" },
  needs_info: { label: "Needs info", cls: "bg-amber-100 text-amber-800", border: "border-l-amber-400" },
  ineligible: { label: "Not eligible", cls: "bg-slate-100 text-slate-500", border: "border-l-slate-300" },
};

function RuleLine({ r }: { r: RuleResult }) {
  const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✕" : "?";
  const color = r.status === "pass" ? "text-emerald-600" : r.status === "fail" ? (r.rule.severity === "required" ? "text-rose-600" : "text-slate-400") : "text-amber-600";
  const text = r.rule.id === "__state" ? (r.status === "fail" ? "Not licensed / approved in client's state" : r.status === "pass" ? "Licensed in client's state" : "Client state needed for licensing check") : r.rule.note || r.text;
  return (
    <li className="flex gap-2 text-xs">
      <span className={cx("w-3 shrink-0 font-bold", color)}>{icon}</span>
      <span className="text-slate-600">
        {text}
        {r.rule.severity === "preferred" && <span className="text-slate-400"> (preferred)</span>}
      </span>
    </li>
  );
}

function MatchCard({ m, client, facts, analysis, set }: { m: MatchResult; client: Client; facts: Facts; analysis?: CreditAnalysis; set: Patch }) {
  const [open, setOpen] = useState(m.status !== "ineligible");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const meta = CATEGORY_META[m.program.category];
  const style = STATUS_STYLE[m.status];
  const existing = client.submissions.filter((s) => s.programId === m.program.id);
  const visibleProducts = m.products.filter((p) => p.status !== "ineligible");
  const summary = useMemo(() => partnerSummary(client, facts, m, analysis), [client, facts, m, analysis]);
  const [product, setProduct] = useState(visibleProducts[0]?.product.name ?? "");

  const submit = () => {
    set({
      stage: client.stage === "new" || client.stage === "qualified" ? "submitted" : client.stage,
      submissions: [
        { id: uid(), programId: m.program.id, programName: m.program.name, productName: product || undefined, status: "submitted", date: new Date().toISOString(), notes: note || undefined },
        ...client.submissions,
      ],
    });
    setSubmitting(false);
    setNote("");
  };
  const mailto = m.program.contactEmail
    ? `mailto:${m.program.contactEmail}?subject=${encodeURIComponent(`New referral — ${client.firstName} ${client.lastName}`.trim())}&body=${encodeURIComponent(summary)}`
    : undefined;

  return (
    <div className={cx("rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm", style.border)}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none">{meta.icon}</span>
          <div>
            <div className="text-sm font-semibold text-slate-900">{m.program.name}</div>
            <div className="text-xs text-slate-500">
              {m.program.partner || "—"} · {meta.label}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {existing.length > 0 && <Badge className="bg-brand-50 text-brand-700">Submitted</Badge>}
          <Badge className={style.cls}>{style.label}</Badge>
          <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {m.fit.length > 0 && m.status !== "ineligible" && (
            <div className="flex flex-wrap gap-1.5">
              {m.fit.map((f) => (
                <Badge key={f} className="bg-emerald-50 text-emerald-700">
                  ★ {f}
                </Badge>
              ))}
            </div>
          )}
          {visibleProducts.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">Products available</div>
              <div className="flex flex-wrap gap-1.5">
                {visibleProducts.map((p) => (
                  <Badge key={p.product.id} className={p.status === "qualified" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"}>
                    {p.product.name}
                    {p.status === "needs_info" ? " (needs info)" : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <ul className="space-y-1">
            {m.results.map((r) => (
              <RuleLine key={r.rule.id} r={r} />
            ))}
            {m.products.length > 0 && visibleProducts.length === 0 && <li className="text-xs text-rose-600">✕ None of this partner&apos;s products fit the client</li>}
            {visibleProducts[0]?.results.map((r) => (
              <RuleLine key={`p-${r.rule.id}`} r={r} />
            ))}
          </ul>
          {m.program.submissionNotes && m.status !== "ineligible" && <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">📎 {m.program.submissionNotes}</div>}

          {m.status !== "ineligible" && !submitting && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => setSubmitting(true)}>
                Submit to partner
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(summary);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied ✓" : "Copy referral summary"}
              </Button>
              {mailto && (
                <a href={mailto} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Email partner
                </a>
              )}
            </div>
          )}
          {submitting && (
            <div className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
              {visibleProducts.length > 0 && (
                <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={product} onChange={(e) => setProduct(e.target.value)}>
                  {visibleProducts.map((p) => (
                    <option key={p.product.id}>{p.product.name}</option>
                  ))}
                </select>
              )}
              <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2} placeholder="Submission notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] text-slate-600">{summary}</pre>
              <div className="flex gap-2">
                <Button size="sm" onClick={submit}>
                  Log submission
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSubmitting(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Opportunities({ client, set, matches, facts, analysis }: { client: Client; set: Patch; matches: MatchResult[]; facts: Facts; analysis?: CreditAnalysis }) {
  const [showIneligible, setShowIneligible] = useState(false);
  const qualified = matches.filter((m) => m.status === "qualified");
  const needs = matches.filter((m) => m.status === "needs_info");
  const out = matches.filter((m) => m.status === "ineligible");
  // Follow-up questions only make sense once the parent answer is "Yes".
  const DEPENDS: Record<string, keyof Client> = { wantsTimeshareExit: "ownsTimeshare", wantsSolarExit: "hasSolar", monthlyCardVolume: "acceptsCards" };
  const questions = topQuestions(matches, 10)
    .filter((q) => !DEPENDS[q.field.key] || client[DEPENDS[q.field.key]] === true)
    .slice(0, 6);

  if (!matches.length)
    return (
      <Empty title="No active ISO programs">
        <Link href="/programs" className="text-brand-600 underline">
          Add partner programs
        </Link>{" "}
        to start matching clients.
      </Empty>
    );

  return (
    <div className="space-y-6">
      {questions.length > 0 && (
        <Card title="❓ Ask next — these answers unlock more programs">
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.field.key} className="grid items-center gap-2 md:grid-cols-[1fr_minmax(0,320px)]">
                <div>
                  <div className="text-sm font-medium text-slate-800">{q.field.question ?? q.field.label}</div>
                  <div className="text-xs text-slate-500">
                    Affects {q.programs.length} program{q.programs.length > 1 ? "s" : ""}: {q.programs.slice(0, 3).join(", ")}
                    {q.programs.length > 3 ? "…" : ""}
                  </div>
                </div>
                <FactQuestion fieldKey={q.field.key} client={client} set={set} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">✅ Qualified opportunities ({qualified.length})</h3>
        {qualified.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {qualified.map((m) => (
              <MatchCard key={m.program.id} m={m} client={client} facts={facts} analysis={analysis} set={set} />
            ))}
          </div>
        ) : (
          <Empty title="No fully qualified programs yet">Answer the questions above or upload a credit report.</Empty>
        )}
      </div>

      {needs.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">🟡 Possible — need more info ({needs.length})</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {needs.map((m) => (
              <MatchCard key={m.program.id} m={m} client={client} facts={facts} analysis={analysis} set={set} />
            ))}
          </div>
        </div>
      )}

      {out.length > 0 && (
        <div>
          <button className="mb-3 text-sm font-semibold text-slate-500 hover:text-slate-700" onClick={() => setShowIneligible(!showIneligible)}>
            {showIneligible ? "▾" : "▸"} Not eligible ({out.length})
          </button>
          {showIneligible && (
            <div className="grid gap-3 lg:grid-cols-2">
              {out.map((m) => (
                <MatchCard key={m.program.id} m={m} client={client} facts={facts} analysis={analysis} set={set} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

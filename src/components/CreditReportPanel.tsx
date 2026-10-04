import { useEffect, useRef, useState } from "react";
import { ACCOUNT_STATUSES, ACCOUNT_TYPES, CATEGORY_META } from "@/lib/constants.ts";
import { classifyAccount, type CreditAnalysis } from "@/lib/creditAnalysis.ts";
import { money, pct, shortDate, uid } from "@/lib/format.ts";
import type { MatchResult } from "@/lib/matching.ts";
import { fileToBase64, htmlToText, pdfToText } from "@/lib/pdfText.ts";
import { parseCreditReportText } from "@/lib/reportParser.ts";
import type { AccountStatus, AccountType, Client, CreditReport, Tradeline } from "@/lib/types.ts";
import type { Patch } from "./ClientSections.tsx";
import { Badge, Button, Card, NumberInput, Stat, cx } from "./ui.tsx";

const PRIORITY = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-600" };
const cell = "rounded border border-transparent bg-transparent px-1.5 py-1 text-xs hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none";

type AiResult = { bureauScores?: Record<string, number | null>; tradelines?: (Omit<Tradeline, "id" | "creditLimit" | "monthlyPayment" | "opened" | "daysLate"> & { creditLimit: number | null; monthlyPayment: number | null; opened: string | null; daysLate: number | null })[] };

export default function CreditReportPanel({ client, set, analysis, matches }: { client: Client; set: Patch; analysis?: CreditAnalysis; matches: MatchResult[] }) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const report = client.creditReport;

  useEffect(() => {
    fetch("/api/extract-credit-report")
      .then((r) => r.json())
      .then((d) => setAiEnabled(Boolean(d.enabled)))
      .catch(() => setAiEnabled(false));
  }, []);

  const saveReport = (r: CreditReport | undefined) => set({ creditReport: r });
  const updateLine = (id: string, patch: Partial<Tradeline>) =>
    report && saveReport({ ...report, tradelines: report.tradelines.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  async function aiExtract(body: { pdfBase64?: string; text?: string }): Promise<Omit<CreditReport, "uploadedAt" | "fileName">> {
    const res = await fetch("/api/extract-credit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as AiResult & { error?: string };
    if (!res.ok) throw new Error(data.error || "AI extraction failed");
    const scores = Object.fromEntries(Object.entries(data.bureauScores ?? {}).filter(([, v]) => typeof v === "number")) as CreditReport["bureauScores"];
    return {
      source: "ai",
      bureauScores: scores,
      tradelines: (data.tradelines ?? []).map((t) => ({
        ...t,
        id: uid(),
        creditLimit: t.creditLimit ?? undefined,
        monthlyPayment: t.monthlyPayment ?? undefined,
        opened: t.opened ?? undefined,
        daysLate: t.daysLate ?? undefined,
      })),
      warnings: ["Accounts were extracted with AI — spot-check balances against the report before submitting."],
    };
  }

  async function processText(text: string, fileName?: string) {
    const parsed = parseCreditReportText(text);
    saveReport({ fileName, uploadedAt: new Date().toISOString(), source: "parser", ...parsed });
  }

  async function handleFile(file: File) {
    setError(null);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isHtml = /html?$/i.test(file.type) || /\.html?$/i.test(file.name);
    try {
      const buf = await file.arrayBuffer();
      const text = isPdf ? null : new TextDecoder().decode(buf);
      const plain = text != null ? (isHtml ? htmlToText(text) : text) : null;

      if (aiEnabled && useAi) {
        setBusy("Analyzing report with AI — this can take a minute for long reports…");
        try {
          const r = await aiExtract(isPdf ? { pdfBase64: fileToBase64(buf) } : { text: plain! });
          saveReport({ ...r, fileName: file.name, uploadedAt: new Date().toISOString() });
          return;
        } catch (e) {
          setError(`${(e as Error).message} Falling back to the built-in parser.`);
        }
      }
      setBusy("Reading report…");
      await processText(isPdf ? await pdfToText(buf) : plain!, file.name);
    } catch (e) {
      setError(`Could not read this file: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const tags = (cats: string[]) =>
    cats
      .map((c) => ({ c, m: matches.find((m) => m.program.category === c && m.status !== "ineligible") }))
      .filter((x) => x.m)
      .map(({ c, m }) => (
        <Badge key={c} className={m!.status === "qualified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
          {CATEGORY_META[c as keyof typeof CATEGORY_META].icon} {m!.program.name}
        </Badge>
      ));

  return (
    <div className="space-y-6">
      <Card
        title="Credit report"
        action={
          report && (
            <Button size="sm" variant="danger" onClick={() => confirm("Remove the credit report and all extracted accounts?") && saveReport(undefined)}>
              Remove report
            </Button>
          )
        }
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={cx("rounded-xl border-2 border-dashed px-6 py-8 text-center transition", drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50")}
        >
          <div className="text-3xl">📄</div>
          <div className="mt-2 text-sm font-medium text-slate-700">{report ? "Upload a new report to replace the current one" : "Drop a credit report here"}</div>
          <div className="text-xs text-slate-500">PDF, HTML or TXT — tri-merge, single bureau, or monitoring-service exports</div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={!!busy}>
              Choose file
            </Button>
            <Button variant="secondary" onClick={() => setPaste("")} disabled={!!busy}>
              Paste text
            </Button>
            <Button
              variant="secondary"
              disabled={!!busy}
              onClick={() => saveReport(report ?? { uploadedAt: new Date().toISOString(), source: "manual", tradelines: [] })}
            >
              Enter manually
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.html,.htm,.txt,application/pdf,text/html,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="mt-3 text-xs text-slate-500">
            {aiEnabled ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} /> Use AI extraction (most accurate)
              </label>
            ) : (
              <span>Using the built-in parser. Set ANTHROPIC_API_KEY on the server to enable AI extraction.</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">The file itself is not saved — only the account list is kept with the client record.</div>
        </div>

        {paste != null && (
          <div className="mt-4 space-y-2">
            <textarea className="h-40 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs" placeholder="Paste the credit report text here…" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!paste.trim() || !!busy}
                onClick={async () => {
                  const text = paste;
                  setPaste(null);
                  setError(null);
                  if (aiEnabled && useAi) {
                    setBusy("Analyzing report with AI…");
                    try {
                      const r = await aiExtract({ text });
                      saveReport({ ...r, fileName: "Pasted text", uploadedAt: new Date().toISOString() });
                      return;
                    } catch (e) {
                      setError(`${(e as Error).message} Falling back to the built-in parser.`);
                    } finally {
                      setBusy(null);
                    }
                  }
                  processText(text, "Pasted text");
                }}
              >
                Analyze text
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPaste(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {busy && <div className="mt-4 animate-pulse rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">{busy}</div>}
        {error && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {report?.warnings?.map((w) => (
          <div key={w} className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {w}
          </div>
        ))}
        {report && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>
              Source: <b>{report.fileName ?? (report.source === "manual" ? "Manual entry" : "—")}</b> · {shortDate(report.uploadedAt)}
            </span>
            {(["experian", "equifax", "transunion"] as const).map((b) => (
              <span key={b} className="flex items-center gap-1">
                <span className="capitalize">{b}</span>
                <span className="w-20">
                  <NumberInput value={report.bureauScores?.[b]} onChange={(v) => saveReport({ ...report, bureauScores: { ...report.bureauScores, [b]: v } })} />
                </span>
              </span>
            ))}
          </div>
        )}
      </Card>

      {report && analysis && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Enrollable debt" value={money(analysis.summary.enrollableBalance)} sub="Unsecured, settleable" tone={analysis.summary.enrollableBalance >= 10000 ? "good" : undefined} />
            <Stat label="Total balances" value={money(analysis.summary.totalBalance)} sub={`${analysis.summary.openAccounts} open accounts`} />
            <Stat label="Utilization" value={pct(analysis.summary.utilization)} tone={(analysis.summary.utilization ?? 0) >= 0.5 ? "bad" : "good"} sub={`${money(analysis.summary.revolvingBalance)} / ${money(analysis.summary.revolvingLimit)}`} />
            <Stat label="Payday loans" value={analysis.summary.paydayCount} sub={money(analysis.summary.paydayBalance)} tone={analysis.summary.paydayCount ? "warn" : undefined} />
            <Stat label="Derogatory" value={analysis.summary.derogatoryCount} sub={`${money(analysis.summary.collectionsBalance)} in collections`} tone={analysis.summary.derogatoryCount ? "bad" : "good"} />
            <Stat label="Avg. score" value={analysis.summary.averageScore ?? "—"} sub={analysis.summary.hasMortgage ? `Mortgage ${money(analysis.summary.mortgageBalance)}` : "No mortgage on file"} />
          </div>
          {analysis.highlights.length > 0 && (
            <Card title="Key findings">
              <ul className="space-y-1.5 text-sm text-slate-700">
                {analysis.highlights.map((h) => (
                  <li key={h}>• {h}</li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {report && (
        <Card
          title={`Creditor breakdown (${report.tradelines.length})`}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => saveReport({ ...report, tradelines: [...report.tradelines, { id: uid(), creditor: "", accountType: "credit_card", status: "current", balance: 0 }] })}
            >
              + Add account
            </Button>
          }
        >
          {report.tradelines.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No accounts yet — add them with “+ Add account”.</div>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2">Creditor</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2 text-right">Balance</th>
                    <th className="px-2 py-2 text-right">Limit</th>
                    <th className="px-2 py-2 text-right">Payment</th>
                    <th className="px-2 py-2">Recommendation</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(analysis?.insights ?? []).map((i) => {
                    const t = i.tradeline;
                    return (
                      <tr key={t.id} className={cx("align-top", !i.enrollable && t.balance > 0 && "bg-slate-50/50")}>
                        <td className="px-5 py-2">
                          <input
                            className={cx(cell, "w-44 font-medium text-slate-800")}
                            value={t.creditor}
                            placeholder="Creditor name"
                            onChange={(e) => updateLine(t.id, { creditor: e.target.value })}
                            onBlur={(e) => t.accountType === "other" && updateLine(t.id, { accountType: classifyAccount(e.target.value) })}
                          />
                          <div className="mt-1 flex flex-wrap gap-1 pl-1.5">
                            {i.enrollable && <Badge className="bg-emerald-50 text-[10px] text-emerald-700">Enrollable</Badge>}
                            {i.dmpEligible && <Badge className="bg-blue-50 text-[10px] text-blue-700">DMP</Badge>}
                            {!i.unsecured && t.balance > 0 && <Badge className="text-[10px]">Secured / excluded</Badge>}
                            {i.utilization != null && <Badge className={cx("text-[10px]", i.utilization >= 0.7 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600")}>{pct(i.utilization)} used</Badge>}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <select className={cell} value={t.accountType} onChange={(e) => updateLine(t.id, { accountType: e.target.value as AccountType })}>
                            {ACCOUNT_TYPES.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <label className="mt-1 flex items-center gap-1 pl-1.5 text-[10px] text-slate-500">
                            <input type="checkbox" checked={!!t.isBusiness} onChange={(e) => updateLine(t.id, { isBusiness: e.target.checked })} /> Business
                          </label>
                        </td>
                        <td className="px-2 py-2">
                          <select className={cell} value={t.status} onChange={(e) => updateLine(t.id, { status: e.target.value as AccountStatus })}>
                            {ACCOUNT_STATUSES.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        {(["balance", "creditLimit", "monthlyPayment"] as const).map((k) => (
                          <td key={k} className="w-36 min-w-[8.5rem] px-2 py-2 text-right">
                            <NumberInput value={t[k]} prefix="$" onChange={(v) => updateLine(t.id, { [k]: k === "balance" ? v ?? 0 : v })} />
                          </td>
                        ))}
                        <td className="max-w-sm px-2 py-2">
                          <Badge className={cx("mb-1 text-[10px]", PRIORITY[i.priority])}>{i.priority} priority</Badge>
                          <div className="text-xs text-slate-600">{i.recommendation}</div>
                          <div className="mt-1 flex flex-wrap gap-1">{tags(i.programTags)}</div>
                        </td>
                        <td className="px-2 py-2">
                          <button className="text-xs text-slate-400 hover:text-rose-600" title="Remove" onClick={() => saveReport({ ...report, tradelines: report.tradelines.filter((x) => x.id !== t.id) })}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

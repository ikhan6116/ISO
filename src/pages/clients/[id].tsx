import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { BusinessSection, ContactSection, DebtSection, GoalsSection, HomeSection } from "@/components/ClientSections.tsx";
import CreditReportPanel from "@/components/CreditReportPanel.tsx";
import Layout from "@/components/Layout.tsx";
import Opportunities from "@/components/Opportunities.tsx";
import { Badge, Button, Card, Empty, Select, cx } from "@/components/ui.tsx";
import { labelOf, PRIMARY_GOALS, STAGES, SUBMISSION_STATUSES } from "@/lib/constants.ts";
import { fullName, money, shortDate } from "@/lib/format.ts";
import { useData } from "@/lib/store.tsx";
import type { Client, SubmissionStatus } from "@/lib/types.ts";
import { useMatches } from "@/lib/useMatches.ts";

const TABS = [
  { key: "opportunities", label: "Opportunities" },
  { key: "profile", label: "Intake answers" },
  { key: "credit", label: "Credit report" },
  { key: "submissions", label: "Submissions" },
  { key: "notes", label: "Notes" },
] as const;

export default function ClientPage() {
  const router = useRouter();
  const { clients, programs, saveClient, deleteClient } = useData();
  const client = clients.find((c) => c.id === router.query.id);
  const result = useMatches(client, programs);
  const tab = (router.query.tab as string) || "opportunities";

  const set = (p: Partial<Client>) => client && saveClient({ ...client, ...p });
  const qualified = result?.matches.filter((m) => m.status === "qualified") ?? [];

  useEffect(() => {
    if (client && client.stage === "new" && qualified.length) saveClient({ ...client, stage: "qualified" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, qualified.length]);

  if (!client || !result)
    return (
      <Layout title="Client">
        <Empty title="Client not found">
          <Link href="/clients" className="text-brand-600 underline">
            Back to clients
          </Link>
        </Empty>
      </Layout>
    );

  const { facts, analysis, matches } = result;
  const setTab = (t: string) => router.replace({ query: { ...router.query, tab: t } }, undefined, { shallow: true });

  return (
    <Layout
      title={fullName(client)}
      actions={
        <>
          <div className="w-36">
            <Select value={client.stage} onChange={(stage) => stage && set({ stage })} options={STAGES} />
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`Delete ${fullName(client)}? This cannot be undone.`)) {
                deleteClient(client.id);
                router.push("/clients");
              }
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <Info label="Contact" value={[client.phone, client.email].filter(Boolean).join(" · ") || "—"} />
        <Info label="State / Age" value={`${client.state ?? "—"} / ${client.age ?? "—"}`} />
        <Info label="Goal" value={client.primaryGoal ? labelOf(PRIMARY_GOALS, client.primaryGoal) : "—"} />
        <Info label="Credit score" value={String(facts.creditScore ?? "—")} />
        <Info label="Unsecured debt" value={money(facts.unsecuredDebt as number | undefined)} />
        <Info label="Opportunities" value={<span className="font-semibold text-emerald-600">{qualified.length} qualified</span>} />
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx("whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium", tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            {t.label}
            {t.key === "submissions" && client.submissions.length > 0 && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs">{client.submissions.length}</span>}
            {t.key === "credit" && client.creditReport && <span className="ml-1.5 text-xs text-emerald-600">●</span>}
          </button>
        ))}
      </div>

      {tab === "opportunities" && <Opportunities client={client} set={set} matches={matches} facts={facts} analysis={analysis} />}
      {tab === "profile" && (
        <div className="space-y-6">
          <Card title="Client info">
            <ContactSection client={client} set={set} />
          </Card>
          <Card title="Goals">
            <GoalsSection client={client} set={set} />
          </Card>
          <Card title="Debt">
            <DebtSection client={client} set={set} />
          </Card>
          <Card title="Home">
            <HomeSection client={client} set={set} />
          </Card>
          <Card title="Business">
            <BusinessSection client={client} set={set} />
          </Card>
        </div>
      )}
      {tab === "credit" && <CreditReportPanel client={client} set={set} analysis={analysis} matches={matches} />}
      {tab === "submissions" && (
        <Card title="Partner submissions">
          {client.submissions.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No submissions yet. Use “Submit to partner” on a qualified opportunity.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {client.submissions.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-[200px] flex-1">
                    <div className="text-sm font-medium text-slate-800">{s.programName}</div>
                    <div className="text-xs text-slate-500">
                      {s.productName ? `${s.productName} · ` : ""}
                      {shortDate(s.date)}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </div>
                  </div>
                  <div className="w-44">
                    <Select
                      value={s.status}
                      options={SUBMISSION_STATUSES}
                      onChange={(status) => {
                        if (!status) return;
                        const submissions = client.submissions.map((x) => (x.id === s.id ? { ...x, status: status as SubmissionStatus } : x));
                        set({ submissions, stage: status === "funded" ? "won" : client.stage });
                      }}
                    />
                  </div>
                  <Badge className={SUBMISSION_STATUSES.find((x) => x.value === s.status)?.color}>{labelOf(SUBMISSION_STATUSES, s.status)}</Badge>
                  <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => set({ submissions: client.submissions.filter((x) => x.id !== s.id) })}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {tab === "notes" && (
        <Card title="Notes">
          <textarea
            className="h-64 w-full rounded-lg border border-slate-300 p-3 text-sm"
            placeholder="Call notes, hardship details, follow-ups… (included in partner referral summaries)"
            value={client.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
          />
          <div className="mt-2 text-xs text-slate-400">Saved automatically · Created {shortDate(client.createdAt)} · Updated {shortDate(client.updatedAt)}</div>
        </Card>
      )}
    </Layout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="truncate text-slate-800">{value}</div>
    </div>
  );
}

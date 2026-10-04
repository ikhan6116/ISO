import Link from "next/link";
import { useMemo } from "react";
import Layout from "@/components/Layout.tsx";
import { Badge, Button, Card, Empty, Stat } from "@/components/ui.tsx";
import { CATEGORY_META, labelOf, STAGES, SUBMISSION_STATUSES } from "@/lib/constants.ts";
import { fullName, shortDate } from "@/lib/format.ts";
import { useData } from "@/lib/store.tsx";
import type { ProgramCategory } from "@/lib/types.ts";
import { evaluateClient } from "@/lib/useMatches.ts";

export default function Dashboard() {
  const { clients, programs } = useData();

  const stats = useMemo(() => {
    const byCategory = new Map<ProgramCategory, number>();
    let opportunities = 0;
    const evaluated = clients.map((c) => {
      const q = evaluateClient(c, programs).matches.filter((m) => m.status === "qualified");
      opportunities += q.length;
      new Set(q.map((m) => m.program.category)).forEach((cat) => byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1));
      return { c, q };
    });
    const submissions = clients.flatMap((c) => c.submissions.map((s) => ({ ...s, client: c })));
    return {
      evaluated,
      opportunities,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      submissions: submissions.sort((a, b) => b.date.localeCompare(a.date)),
      openSubs: submissions.filter((s) => ["submitted", "in_review", "approved"].includes(s.status)).length,
      funded: submissions.filter((s) => s.status === "funded").length,
    };
  }, [clients, programs]);

  const recent = [...stats.evaluated].sort((a, b) => b.c.updatedAt.localeCompare(a.c.updatedAt)).slice(0, 8);
  const maxCat = Math.max(1, ...stats.byCategory.map(([, n]) => n));

  return (
    <Layout
      title="Dashboard"
      actions={
        <Link href="/clients/new">
          <Button>+ New client intake</Button>
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Clients" value={clients.length} />
        <Stat label="Qualified opportunities" value={stats.opportunities} tone="good" sub="across all clients" />
        <Stat label="Open submissions" value={stats.openSubs} tone="warn" />
        <Stat label="Funded / enrolled" value={stats.funded} tone="good" />
        <Stat label="Active ISO programs" value={programs.filter((p) => p.active).length} sub={`${programs.length} total`} />
      </div>

      {clients.length === 0 ? (
        <Empty title="Welcome to your ISO Partner CRM">
          <p className="mx-auto max-w-lg">
            Start a client intake, answer a few questions, optionally upload a credit report, and the CRM will show which partner programs the client qualifies for. Sample
            partner programs are pre-loaded — tailor them in{" "}
            <Link href="/programs" className="text-brand-600 underline">
              ISO Programs
            </Link>
            .
          </p>
          <Link href="/clients/new">
            <Button className="mt-4">Start first intake</Button>
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Recent clients" className="lg:col-span-2" action={<Link href="/clients" className="text-xs text-brand-600">View all →</Link>}>
            <div className="-my-2 divide-y divide-slate-100">
              {recent.map(({ c, q }) => (
                <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{fullName(c)}</div>
                    <div className="truncate text-xs text-slate-500">
                      {q.length ? q.slice(0, 3).map((m) => `${CATEGORY_META[m.program.category].icon} ${m.program.name}`).join("  ·  ") : "No qualified programs yet"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className="bg-emerald-50 text-emerald-700">{q.length}</Badge>
                    <Badge className={STAGES.find((s) => s.value === c.stage)?.color}>{labelOf(STAGES, c.stage)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Clients qualified by program type">
            {stats.byCategory.length === 0 ? (
              <div className="text-sm text-slate-500">No qualified matches yet.</div>
            ) : (
              <ul className="space-y-2.5">
                {stats.byCategory.map(([cat, n]) => (
                  <li key={cat}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-700">
                        {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
                      </span>
                      <span className="font-medium text-slate-900">{n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(n / maxCat) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent partner submissions" className="lg:col-span-3">
            {stats.submissions.length === 0 ? (
              <div className="text-sm text-slate-500">Nothing submitted yet.</div>
            ) : (
              <div className="-my-2 divide-y divide-slate-100">
                {stats.submissions.slice(0, 10).map((s) => (
                  <Link key={s.id} href={`/clients/${s.client.id}?tab=submissions`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:bg-slate-50">
                    <span>
                      <b className="font-medium">{fullName(s.client)}</b> → {s.programName}
                      {s.productName ? ` · ${s.productName}` : ""}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {shortDate(s.date)}
                      <Badge className={SUBMISSION_STATUSES.find((x) => x.value === s.status)?.color}>{labelOf(SUBMISSION_STATUSES, s.status)}</Badge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
}

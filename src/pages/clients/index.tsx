import Link from "next/link";
import { useMemo, useState } from "react";
import Layout from "@/components/Layout.tsx";
import { Badge, Button, Empty, inputCls } from "@/components/ui.tsx";
import { labelOf, PRIMARY_GOALS, STAGES } from "@/lib/constants.ts";
import { fullName, money, shortDate } from "@/lib/format.ts";
import { useData } from "@/lib/store.tsx";
import { evaluateClient } from "@/lib/useMatches.ts";

export default function Clients() {
  const { clients, programs } = useData();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");

  const rows = useMemo(
    () =>
      clients
        .filter((c) => !stage || c.stage === stage)
        .filter((c) => !q || `${fullName(c)} ${c.email ?? ""} ${c.phone ?? ""} ${c.businessName ?? ""} ${c.state ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .map((c) => {
          const { facts, matches } = evaluateClient(c, programs);
          return { c, facts, qualified: matches.filter((m) => m.status === "qualified") };
        }),
    [clients, programs, q, stage],
  );

  return (
    <Layout
      title="Clients"
      actions={
        <Link href="/clients/new">
          <Button>+ New intake</Button>
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-sm`} placeholder="Search name, phone, email, business, state…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} w-44`} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty title={clients.length ? "No clients match your filters" : "No clients yet"}>
          {!clients.length && (
            <Link href="/clients/new" className="text-brand-600 underline">
              Start your first intake
            </Link>
          )}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Goal</th>
                <th className="px-4 py-3 text-right">Unsecured debt</th>
                <th className="px-4 py-3">Top opportunities</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ c, facts, qualified }) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {fullName(c)}
                    </Link>
                    <div className="text-xs text-slate-500">{c.businessName || c.phone || c.email || ""}</div>
                  </td>
                  <td className="px-4 py-3">{c.state ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{c.primaryGoal ? labelOf(PRIMARY_GOALS, c.primaryGoal) : "—"}</td>
                  <td className="px-4 py-3 text-right">{money(facts.unsecuredDebt as number | undefined)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {qualified.slice(0, 3).map((m) => (
                        <Badge key={m.program.id} className="bg-emerald-50 text-emerald-700">
                          {m.program.name}
                        </Badge>
                      ))}
                      {qualified.length > 3 && <Badge>+{qualified.length - 3}</Badge>}
                      {!qualified.length && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STAGES.find((s) => s.value === c.stage)?.color}>{labelOf(STAGES, c.stage)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{shortDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

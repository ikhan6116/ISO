import Link from "next/link";
import { useMemo, useState } from "react";
import Layout from "@/components/Layout.tsx";
import { Badge, Button, Empty, cx, inputCls } from "@/components/ui.tsx";
import { CATEGORY_META } from "@/lib/constants.ts";
import { describeRule, evaluateProgram } from "@/lib/matching.ts";
import { useData } from "@/lib/store.tsx";
import type { Program } from "@/lib/types.ts";
import { buildFacts } from "@/lib/fields.ts";

const GROUP_ORDER = ["Consumer Debt", "Home & Mortgage", "Home Services", "Business", "Other"] as const;

export default function Programs() {
  const { programs, clients, saveProgram } = useData();
  const [q, setQ] = useState("");

  const qualifiedCount = useMemo(() => {
    const facts = clients.map((c) => buildFacts(c));
    return Object.fromEntries(programs.map((p) => [p.id, facts.filter((f) => evaluateProgram(p, f).status === "qualified").length]));
  }, [programs, clients]);

  const filtered = programs.filter((p) => !q || `${p.name} ${p.partner} ${CATEGORY_META[p.category].label}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Layout
      title="ISO Programs"
      actions={
        <Link href="/programs/new">
          <Button>+ Add program</Button>
        </Link>
      }
    >
      <p className="mb-4 max-w-3xl text-sm text-slate-600">
        Each program holds a partner&apos;s licensed states and qualification requirements. Clients are matched against every active program automatically. Mortgage lenders and
        funders can list multiple products (e.g. DSCR, Bank Statement, Reverse) with their own requirements.
      </p>
      <input className={`${inputCls} mb-6 max-w-sm`} placeholder="Search programs or partners…" value={q} onChange={(e) => setQ(e.target.value)} />

      {programs.length === 0 && (
        <Empty title="No programs yet">
          Add your first partner program, or restore the sample programs from{" "}
          <Link className="text-brand-600 underline" href="/settings">
            Settings
          </Link>
          .
        </Empty>
      )}

      {GROUP_ORDER.map((group) => {
        const list = filtered.filter((p) => CATEGORY_META[p.category].group === group).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        if (!list.length) return null;
        return (
          <div key={group} className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => (
                <ProgramCard key={p.id} p={p} qualified={qualifiedCount[p.id] ?? 0} onToggle={() => saveProgram({ ...p, active: !p.active })} />
              ))}
            </div>
          </div>
        );
      })}
    </Layout>
  );
}

function ProgramCard({ p, qualified, onToggle }: { p: Program; qualified: number; onToggle: () => void }) {
  const meta = CATEGORY_META[p.category];
  const reqs = p.rules.filter((r) => r.severity === "required");
  return (
    <div className={cx("flex flex-col rounded-xl border bg-white p-4 shadow-sm", p.active ? "border-slate-200" : "border-dashed border-slate-300 opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/programs/${p.id}`} className="flex items-start gap-2.5">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <div className="text-sm font-semibold text-slate-900 hover:text-brand-700">{p.name || "Untitled program"}</div>
            <div className="text-xs text-slate-500">{p.partner || "—"}</div>
          </div>
        </Link>
        <button onClick={onToggle} className={cx("relative h-5 w-9 shrink-0 rounded-full transition", p.active ? "bg-emerald-500" : "bg-slate-300")} title={p.active ? "Active — click to pause" : "Paused — click to activate"}>
          <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition", p.active ? "left-[18px]" : "left-0.5")} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{meta.label}</Badge>
        <Badge className="bg-slate-50 text-slate-600">{p.states.length ? `${p.states.length} states` : "All states"}</Badge>
        {p.products.length > 0 && <Badge className="bg-brand-50 text-brand-700">{p.products.length} products</Badge>}
        {qualified > 0 && <Badge className="bg-emerald-50 text-emerald-700">{qualified} qualified clients</Badge>}
      </div>
      <ul className="mt-3 flex-1 space-y-0.5 text-xs text-slate-600">
        {reqs.slice(0, 4).map((r) => (
          <li key={r.id}>• {r.note || describeRule(r)}</li>
        ))}
        {reqs.length > 4 && <li className="text-slate-400">+{reqs.length - 4} more</li>}
        {p.products.length > 0 && <li className="text-slate-500">Products: {p.products.map((x) => x.name).join(", ")}</li>}
      </ul>
      <Link href={`/programs/${p.id}`} className="mt-3 text-xs font-medium text-brand-600 hover:underline">
        Edit requirements →
      </Link>
    </div>
  );
}

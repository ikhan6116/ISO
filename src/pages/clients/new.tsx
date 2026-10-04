import { useRouter } from "next/router";
import { useState } from "react";
import { BusinessSection, ContactSection, DebtSection, GoalsSection, HomeSection } from "@/components/ClientSections.tsx";
import CreditReportPanel from "@/components/CreditReportPanel.tsx";
import Layout from "@/components/Layout.tsx";
import { Badge, Button, Card, cx } from "@/components/ui.tsx";
import { CATEGORY_META } from "@/lib/constants.ts";
import { newClient, useData } from "@/lib/store.tsx";
import type { Client } from "@/lib/types.ts";
import { useMatches } from "@/lib/useMatches.ts";

const STEPS = [
  { key: "contact", title: "Client info", sub: "Who are we helping?" },
  { key: "goals", title: "Goals", sub: "What do they want to accomplish?" },
  { key: "debt", title: "Debt", sub: "Consumer debt picture" },
  { key: "home", title: "Home", sub: "Homeownership, solar, HVAC, timeshare" },
  { key: "business", title: "Business", sub: "Business owner details" },
  { key: "credit", title: "Credit report", sub: "Optional — upload for a creditor breakdown" },
] as const;

export default function NewIntake() {
  const router = useRouter();
  const { programs, saveClient } = useData();
  const [client, setClient] = useState<Client>(newClient);
  const [step, setStep] = useState(0);
  const set = (p: Partial<Client>) => setClient((c) => ({ ...c, ...p }));
  const result = useMatches(client, programs);
  const qualified = result?.matches.filter((m) => m.status === "qualified") ?? [];
  const possible = result?.matches.filter((m) => m.status === "needs_info") ?? [];
  const canFinish = client.firstName.trim().length > 0;

  const finish = () => {
    saveClient({ ...client, stage: qualified.length ? "qualified" : "new" });
    router.push(`/clients/${client.id}?tab=opportunities`);
  };

  const s = STEPS[step];
  return (
    <Layout title="New client intake">
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {STEPS.map((x, i) => (
          <button
            key={x.key}
            onClick={() => setStep(i)}
            className={cx(
              "flex min-w-[120px] flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left transition",
              i === step ? "border-brand-500 bg-white shadow-sm" : i < step ? "border-transparent bg-brand-50" : "border-transparent bg-slate-100",
            )}
          >
            <span className={cx("text-[11px] font-semibold", i <= step ? "text-brand-600" : "text-slate-400")}>STEP {i + 1}</span>
            <span className="text-sm font-medium text-slate-800">{x.title}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {s.key === "credit" ? (
            <CreditReportPanel client={client} set={set} analysis={result?.analysis} matches={result?.matches ?? []} />
          ) : (
            <Card title={s.title}>
              <p className="-mt-2 mb-5 text-sm text-slate-500">{s.sub}</p>
              {s.key === "contact" && <ContactSection client={client} set={set} />}
              {s.key === "goals" && <GoalsSection client={client} set={set} />}
              {s.key === "debt" && <DebtSection client={client} set={set} />}
              {s.key === "home" && <HomeSection client={client} set={set} />}
              {s.key === "business" && <BusinessSection client={client} set={set} />}
            </Card>
          )}
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              {!canFinish && <span className="text-xs text-slate-400">First name required to save</span>}
              {step < STEPS.length - 1 && (
                <Button variant="secondary" onClick={() => setStep(step + 1)}>
                  {s.key === "contact" || s.key === "goals" ? "Next →" : "Skip / Next →"}
                </Button>
              )}
              <Button onClick={finish} disabled={!canFinish}>
                Save & see opportunities
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card title="Live opportunity preview">
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{qualified.length}</div>
                <div className="text-[11px] font-medium text-emerald-700">Qualified</div>
              </div>
              <div className="flex-1 rounded-lg bg-amber-50 p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{possible.length}</div>
                <div className="text-[11px] font-medium text-amber-700">Need info</div>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {[...qualified, ...possible].slice(0, 8).map((m) => (
                <li key={m.program.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {CATEGORY_META[m.program.category].icon} {m.program.name}
                  </span>
                  <Badge className={m.status === "qualified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>{m.status === "qualified" ? "✓" : "?"}</Badge>
                </li>
              ))}
              {!qualified.length && !possible.length && <li className="text-xs text-slate-500">Answer a few questions to see matching partner programs.</li>}
            </ul>
          </Card>
        </aside>
      </div>
    </Layout>
  );
}

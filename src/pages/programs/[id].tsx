import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout.tsx";
import { RuleEditor, StatePicker } from "@/components/RuleEditor.tsx";
import { Badge, Button, Card, Empty, Field, Select, TextInput, inputCls } from "@/components/ui.tsx";
import { CATEGORY_META } from "@/lib/constants.ts";
import { buildFacts } from "@/lib/fields.ts";
import { fullName, uid } from "@/lib/format.ts";
import { evaluateProgram } from "@/lib/matching.ts";
import { newProgram, useData } from "@/lib/store.tsx";
import type { Program, ProgramCategory } from "@/lib/types.ts";

const categoryOptions = (Object.keys(CATEGORY_META) as ProgramCategory[]).map((k) => ({ value: k, label: `${CATEGORY_META[k].icon} ${CATEGORY_META[k].label}` }));

export default function ProgramEditor() {
  const router = useRouter();
  const { programs, clients, saveProgram, deleteProgram, ready } = useData();
  const id = router.query.id as string | undefined;
  const [draft, setDraft] = useState<Program | null>(null);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!ready || !id) return;
    if (id === "new") setDraft(newProgram());
    else setDraft(programs.find((p) => p.id === id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ready]);

  const set = (p: Partial<Program>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
    setJustSaved(false);
  };

  const preview = useMemo(() => {
    if (!draft) return [];
    return clients.map((c) => ({ c, m: evaluateProgram({ ...draft, active: true }, buildFacts(c)) })).filter((x) => x.m.status !== "ineligible");
  }, [draft, clients]);

  if (!draft)
    return (
      <Layout title="Program">
        {ready && id !== "new" ? (
          <Empty title="Program not found">
            <Link href="/programs" className="text-brand-600 underline">
              Back to programs
            </Link>
          </Empty>
        ) : null}
      </Layout>
    );

  const isNew = !programs.some((p) => p.id === draft.id);
  const save = () => {
    saveProgram(draft);
    setDirty(false);
    setJustSaved(true);
    if (isNew) router.replace(`/programs/${draft.id}`);
  };

  return (
    <Layout
      title={isNew ? "Add ISO program" : draft.name || "Edit program"}
      actions={
        <>
          {!isNew && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const copy = { ...structuredClone(draft), id: uid(), name: `${draft.name} (copy)` };
                  saveProgram(copy);
                  router.push(`/programs/${copy.id}`);
                }}
              >
                Duplicate
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete “${draft.name}”?`)) {
                    deleteProgram(draft.id);
                    router.push("/programs");
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
          <Button onClick={save} disabled={!draft.name.trim()}>
            {justSaved ? "Saved ✓" : "Save program"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Card title="Program details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Program name *">
                <TextInput value={draft.name} onChange={(name) => set({ name })} placeholder="e.g. Debt Settlement — Standard" />
              </Field>
              <Field label="Partner / company">
                <TextInput value={draft.partner} onChange={(partner) => set({ partner })} />
              </Field>
              <Field label="Program type">
                <Select value={draft.category} onChange={(category) => category && set({ category })} options={categoryOptions} />
              </Field>
              <Field label="Status">
                <label className="flex items-center gap-2 pt-2 text-sm">
                  <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} /> Active (used for matching)
                </label>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea className={inputCls} rows={2} value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Licensed / approved states">
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.states.length === 0} onChange={(e) => set({ states: e.target.checked ? [] : ["TX"] })} /> Available in all states
            </label>
            {draft.states.length > 0 && <StatePicker value={draft.states} onChange={(states) => set({ states })} />}
          </Card>

          <Card title="Qualification requirements">
            <RuleEditor rules={draft.rules} onChange={(rules) => set({ rules })} emptyText="No program-wide requirements — every client in the approved states qualifies." />
          </Card>

          <Card
            title="Products (optional)"
            action={
              <Button size="sm" variant="secondary" onClick={() => set({ products: [...draft.products, { id: uid(), name: "New product", rules: [] }] })}>
                + Add product
              </Button>
            }
          >
            <p className="mb-4 text-xs text-slate-500">
              Use products when one partner offers several programs with different requirements — e.g. a mortgage lender&apos;s Bank Statement loan (business owners), DSCR (investment
              property), or Reverse Mortgage (age 62+). The client qualifies for the partner if at least one product fits.
            </p>
            <div className="space-y-4">
              {draft.products.map((prod) => (
                <div key={prod.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex gap-2">
                    <input className={inputCls} value={prod.name} onChange={(e) => set({ products: draft.products.map((x) => (x.id === prod.id ? { ...x, name: e.target.value } : x)) })} />
                    <Button size="sm" variant="danger" onClick={() => set({ products: draft.products.filter((x) => x.id !== prod.id) })}>
                      Remove
                    </Button>
                  </div>
                  <input
                    className={`${inputCls} mb-3 text-xs`}
                    placeholder="Short description for reps (optional)"
                    value={prod.description ?? ""}
                    onChange={(e) => set({ products: draft.products.map((x) => (x.id === prod.id ? { ...x, description: e.target.value } : x)) })}
                  />
                  <RuleEditor rules={prod.rules} onChange={(rules) => set({ products: draft.products.map((x) => (x.id === prod.id ? { ...x, rules } : x)) })} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Partner contact & submission">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Contact name">
                <TextInput value={draft.contactName} onChange={(contactName) => set({ contactName })} />
              </Field>
              <Field label="Submission email" hint="Used by “Email partner”">
                <TextInput type="email" value={draft.contactEmail} onChange={(contactEmail) => set({ contactEmail })} />
              </Field>
              <Field label="Phone">
                <TextInput value={draft.contactPhone} onChange={(contactPhone) => set({ contactPhone })} />
              </Field>
              <Field label="Submission instructions / required docs" className="sm:col-span-3">
                <textarea className={inputCls} rows={2} value={draft.submissionNotes ?? ""} onChange={(e) => set({ submissionNotes: e.target.value })} />
              </Field>
              <Field label="Payout / commission notes (internal)" className="sm:col-span-3">
                <textarea className={inputCls} rows={2} value={draft.payoutNotes ?? ""} onChange={(e) => set({ payoutNotes: e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card title="Matching clients (live)">
            {clients.length === 0 ? (
              <div className="text-xs text-slate-500">Add clients to preview who this program fits.</div>
            ) : preview.length === 0 ? (
              <div className="text-xs text-slate-500">None of your {clients.length} clients currently fit.</div>
            ) : (
              <ul className="space-y-2">
                {preview.map(({ c, m }) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/clients/${c.id}`} className="truncate text-brand-700 hover:underline">
                      {fullName(c)}
                    </Link>
                    <Badge className={m.status === "qualified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>{m.status === "qualified" ? "Qualified" : "Needs info"}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {dirty && !isNew && <div className="mt-4 text-[11px] text-amber-600">Unsaved changes — preview reflects your edits.</div>}
          </Card>
        </aside>
      </div>
    </Layout>
  );
}

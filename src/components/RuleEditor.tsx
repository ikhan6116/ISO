import { useState } from "react";
import { US_STATES } from "@/lib/constants.ts";
import { FIELD_MAP, FIELDS, OPS_FOR_TYPE } from "@/lib/fields.ts";
import { uid } from "@/lib/format.ts";
import type { Rule } from "@/lib/types.ts";
import { Button, Chips, NumberInput, cx, inputCls } from "./ui.tsx";

const GROUPS = ["Client", "Debt & Credit", "Home", "Business"] as const;

function ValueInput({ rule, onChange }: { rule: Rule; onChange: (v: Rule["value"]) => void }) {
  const field = FIELD_MAP[rule.field];
  if (!field || field.type === "boolean") return null;
  if (field.type === "number")
    return (
      <div className="w-40">
        <NumberInput value={typeof rule.value === "number" ? rule.value : undefined} onChange={(v) => onChange(v)} prefix={field.unit === "$" ? "$" : undefined} suffix={field.unit && field.unit !== "$" ? field.unit : undefined} />
      </div>
    );
  const value = Array.isArray(rule.value) ? rule.value : [];
  if (field.key === "state") return <StatePicker value={value} onChange={onChange} compact />;
  return <Chips value={value} onChange={onChange} options={field.options ?? []} />;
}

export function RuleEditor({ rules, onChange, emptyText = "No requirements yet." }: { rules: Rule[]; onChange: (r: Rule[]) => void; emptyText?: string }) {
  const update = (id: string, patch: Partial<Rule>) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => onChange([...rules, { id: uid(), field: "unsecuredDebt", op: "gte", value: 10000, severity: "required" }]);

  return (
    <div className="space-y-3">
      {rules.length === 0 && <div className="text-sm text-slate-500">{emptyText}</div>}
      {rules.map((r) => {
        const field = FIELD_MAP[r.field];
        const ops = field ? OPS_FOR_TYPE[field.type] : [];
        return (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-start gap-2">
              <select
                className={cx(inputCls, "w-56")}
                value={r.field}
                onChange={(e) => {
                  const f = FIELD_MAP[e.target.value];
                  const op = OPS_FOR_TYPE[f.type][0].op;
                  update(r.id, { field: f.key, op, value: f.type === "number" ? 0 : f.type === "boolean" ? undefined : [] });
                }}
              >
                {GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {FIELDS.filter((f) => f.group === g).map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select className={cx(inputCls, "w-40")} value={r.op} onChange={(e) => update(r.id, { op: e.target.value as Rule["op"] })}>
                {ops.map((o) => (
                  <option key={o.op} value={o.op}>
                    {o.label}
                  </option>
                ))}
              </select>
              {field?.type === "number" && <ValueInput rule={r} onChange={(value) => update(r.id, { value })} />}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex rounded-lg bg-white p-0.5 text-xs ring-1 ring-slate-200">
                  {(["required", "preferred"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => update(r.id, { severity: s })} className={cx("rounded-md px-2.5 py-1 font-medium capitalize", r.severity === s ? (s === "required" ? "bg-slate-800 text-white" : "bg-brand-600 text-white") : "text-slate-500")}>
                      {s}
                    </button>
                  ))}
                </div>
                <button type="button" className="px-1 text-slate-400 hover:text-rose-600" onClick={() => onChange(rules.filter((x) => x.id !== r.id))} title="Remove requirement">
                  ✕
                </button>
              </div>
            </div>
            {field && (field.type === "select" || field.type === "multiselect") && (
              <div className="mt-2">
                <ValueInput rule={r} onChange={(value) => update(r.id, { value })} />
              </div>
            )}
            <input className={cx(inputCls, "mt-2 py-1.5 text-xs")} placeholder="Note shown to reps (optional) — e.g. “Minimum $10,000 enrollable debt”" value={r.note ?? ""} onChange={(e) => update(r.id, { note: e.target.value || undefined })} />
          </div>
        );
      })}
      <Button size="sm" variant="secondary" onClick={add}>
        + Add requirement
      </Button>
      <p className="text-xs text-slate-400">
        <b>Required</b> rules disqualify the client when not met. <b>Preferred</b> rules only boost ranking and show as reasons the program fits.
      </p>
    </div>
  );
}

export function StatePicker({ value, onChange, compact }: { value: string[]; onChange: (v: string[]) => void; compact?: boolean }) {
  const [paste, setPaste] = useState("");
  const toggle = (code: string) => onChange(value.includes(code) ? value.filter((s) => s !== code) : [...value, code].sort());
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button size="sm" variant="secondary" type="button" onClick={() => onChange(US_STATES.map((s) => s.code))}>
          Select all
        </Button>
        <Button size="sm" variant="secondary" type="button" onClick={() => onChange([])}>
          Clear
        </Button>
        <input
          className={cx(inputCls, "w-64 py-1 text-xs")}
          placeholder="Paste list: TX, FL, CA… then Enter"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const codes = paste.toUpperCase().match(/\b[A-Z]{2}\b/g) ?? [];
            const valid = codes.filter((c) => US_STATES.some((s) => s.code === c));
            onChange([...new Set([...value, ...valid])].sort());
            setPaste("");
          }}
        />
        <span className="text-slate-500">{value.length} selected</span>
      </div>
      <div className={cx("grid gap-1", compact ? "grid-cols-9 sm:grid-cols-13" : "grid-cols-6 sm:grid-cols-9 lg:grid-cols-13")} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(44px, 1fr))` }}>
        {US_STATES.map((s) => (
          <button
            key={s.code}
            type="button"
            title={s.name}
            onClick={() => toggle(s.code)}
            className={cx("rounded-md border py-1 text-xs font-medium", value.includes(s.code) ? "border-brand-500 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}
          >
            {s.code}
          </button>
        ))}
      </div>
    </div>
  );
}

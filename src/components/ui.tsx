import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { parseAmount } from "@/lib/format.ts";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "primary", size = "md", className, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
        variant === "secondary" && "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
        className,
      )}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className ?? "bg-slate-100 text-slate-700")}>{children}</span>;
}

/** Labeled form row. Use `group` for button-based controls (Yes/No, chips) so clicking the label doesn't press a button. */
export function Field({ label, hint, children, className, group }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; group?: boolean }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cx("block", className)} role={group ? "group" : undefined}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </Tag>
  );
}

export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function TextInput({ value, onChange, ...rest }: { value?: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean }) {
  return <input {...rest} className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

/** Numeric input that keeps the user's typing (e.g. "12,500") and reports a parsed number. */
export function NumberInput({ value, onChange, prefix, suffix, placeholder }: { value?: number; onChange: (v: number | undefined) => void; prefix?: string; suffix?: string; placeholder?: string }) {
  const [text, setText] = useState(value != null ? value.toLocaleString("en-US") : "");
  useEffect(() => {
    if (parseAmount(text) !== value) setText(value != null ? value.toLocaleString("en-US") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
      <input
        inputMode="decimal"
        className={cx(inputCls, prefix && "pl-7", suffix && "pr-16")}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseAmount(e.target.value));
        }}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options, placeholder = "Select…" }: { value?: T; onChange: (v: T | undefined) => void; options: { value: T; label: string }[]; placeholder?: string }) {
  return (
    <select className={inputCls} value={value ?? ""} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Yes / No toggle with an "unknown" state (click the active option again to clear). */
export function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean | undefined) => void }) {
  const opt = (v: boolean, label: string) => (
    <button
      type="button"
      onClick={() => onChange(value === v ? undefined : v)}
      className={cx(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
        value === v ? (v ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-700 text-white shadow-sm") : "text-slate-600 hover:bg-white",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex w-full max-w-[200px] gap-1 rounded-lg bg-slate-100 p-1">
      {opt(true, "Yes")}
      {opt(false, "No")}
    </div>
  );
}

export function Chips({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={cx(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
            )}
          >
            {on ? "✓ " : ""}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold", tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-rose-600" : "text-slate-900")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
import { useData } from "@/lib/store.tsx";
import { cx } from "./ui.tsx";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/clients/new", label: "New Intake", icon: "＋" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/programs", label: "ISO Programs", icon: "🧩" },
  { href: "/settings", label: "Settings & Data", icon: "⚙" },
];

export default function Layout({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { pathname } = useRouter();
  const { ready } = useData();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : href === "/clients" ? pathname === "/clients" || pathname === "/clients/[id]" : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>{`${title} · ISO Partner CRM`}</title>
      </Head>
      <aside className={cx("fixed inset-y-0 left-0 z-30 w-60 transform border-r border-slate-200 bg-white transition md:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">ISO</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Partner CRM</div>
            <div className="text-[11px] text-slate-500">Intake · Analyze · Submit</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active(n.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100")}
            >
              <span className="w-5 text-center">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0 overflow-x-clip md:pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              ☰
            </button>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">{ready ? children : <div className="py-20 text-center text-sm text-slate-400">Loading…</div>}</main>
      </div>
    </div>
  );
}

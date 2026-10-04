import { useRef, useState } from "react";
import Layout from "@/components/Layout.tsx";
import { Button, Card } from "@/components/ui.tsx";
import { useData } from "@/lib/store.tsx";
import type { AppData } from "@/lib/types.ts";

export default function Settings() {
  const { exportData, importData, restoreSamplePrograms, clients, programs } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `iso-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Layout title="Settings & Data">
      <div className="grid max-w-4xl gap-6">
        <Card title="Where your data lives">
          <p className="text-sm text-slate-600">
            Clients and programs are saved in this browser ({clients.length} clients, {programs.length} programs). Credit report files are never stored — only the extracted
            account list. Export a backup regularly, and use it to move data to another computer or teammate.
          </p>
        </Card>

        <Card title="Backup & restore">
          <div className="flex flex-wrap gap-3">
            <Button onClick={download}>⬇ Export backup (.json)</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              ⬆ Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const data = JSON.parse(await f.text()) as AppData;
                  if (!confirm(`Replace current data with ${data.clients?.length ?? 0} clients and ${data.programs?.length ?? 0} programs from this backup?`)) return;
                  importData(data);
                  setMsg({ ok: true, text: "Backup imported." });
                } catch (err) {
                  setMsg({ ok: false, text: (err as Error).message || "Could not read that file." });
                }
              }}
            />
          </div>
          {msg && <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</div>}
        </Card>

        <Card title="Sample ISO programs">
          <p className="mb-3 text-sm text-slate-600">
            Restores the starter programs (debt relief, credit counseling, mortgage, HELOC, HEI, solar, HVAC, timeshare/solar exit, business funding, processing). Your own programs
            are kept; edited sample programs are reset to their defaults.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm("Restore the sample programs? Changes you made to sample programs will be overwritten.")) {
                restoreSamplePrograms();
                setMsg({ ok: true, text: "Sample programs restored." });
              }
            }}
          >
            Restore sample programs
          </Button>
        </Card>

        <Card title="AI credit report extraction">
          <p className="text-sm text-slate-600">
            For the most accurate creditor breakdowns, set <code className="rounded bg-slate-100 px-1">ANTHROPIC_API_KEY</code> in the server environment (see{" "}
            <code className="rounded bg-slate-100 px-1">.env.example</code>). Without it, the built-in parser reads common report layouts and you can correct anything in the
            creditor table.
          </p>
        </Card>
      </div>
    </Layout>
  );
}

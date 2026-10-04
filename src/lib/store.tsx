import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { uid } from "./format.ts";
import { SEED_PROGRAMS } from "./seed.ts";
import type { AppData, Client, Program } from "./types.ts";

// Data lives in the browser (localStorage). Use Settings → Export to back up or move it between machines.
const KEY = "iso-crm-data-v1";

interface Store {
  ready: boolean;
  clients: Client[];
  programs: Program[];
  saveClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  saveProgram: (p: Program) => void;
  deleteProgram: (id: string) => void;
  importData: (data: AppData) => void;
  restoreSamplePrograms: () => void;
  exportData: () => AppData;
}

const Ctx = createContext<Store | null>(null);

export function newClient(): Client {
  const now = new Date().toISOString();
  return { id: uid(), createdAt: now, updatedAt: now, stage: "new", firstName: "", lastName: "", interests: [], mortgageInterests: [], submissions: [] };
}

export function newProgram(): Program {
  const now = new Date().toISOString();
  return { id: uid(), name: "", partner: "", category: "other", active: true, states: [], rules: [], products: [], createdAt: now, updatedAt: now };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ version: 1, clients: [], programs: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setData(raw ? (JSON.parse(raw) as AppData) : { version: 1, clients: [], programs: SEED_PROGRAMS });
    } catch {
      setData({ version: 1, clients: [], programs: SEED_PROGRAMS });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable — data stays in memory for this session */
    }
  }, [data, ready]);

  const upsert = <T extends { id: string; updatedAt: string }>(list: T[], item: T) => {
    const next = { ...item, updatedAt: new Date().toISOString() };
    return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? next : x)) : [next, ...list];
  };

  const saveClient = useCallback((c: Client) => setData((d) => ({ ...d, clients: upsert(d.clients, c) })), []);
  const deleteClient = useCallback((id: string) => setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id) })), []);
  const saveProgram = useCallback((p: Program) => setData((d) => ({ ...d, programs: upsert(d.programs, p) })), []);
  const deleteProgram = useCallback((id: string) => setData((d) => ({ ...d, programs: d.programs.filter((p) => p.id !== id) })), []);
  const importData = useCallback((incoming: AppData) => {
    if (!incoming || !Array.isArray(incoming.clients) || !Array.isArray(incoming.programs)) throw new Error("This file is not a valid CRM backup.");
    setData({ version: 1, clients: incoming.clients, programs: incoming.programs });
  }, []);
  const restoreSamplePrograms = useCallback(
    () => setData((d) => ({ ...d, programs: [...d.programs.filter((p) => !p.id.startsWith("seed-")), ...SEED_PROGRAMS] })),
    [],
  );

  const value = useMemo<Store>(
    () => ({ ready, clients: data.clients, programs: data.programs, saveClient, deleteClient, saveProgram, deleteProgram, importData, restoreSamplePrograms, exportData: () => data }),
    [ready, data, saveClient, deleteClient, saveProgram, deleteProgram, importData, restoreSamplePrograms],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useData must be used inside DataProvider");
  return s;
}

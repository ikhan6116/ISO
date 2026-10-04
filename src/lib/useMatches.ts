import { useMemo } from "react";
import { analyzeCreditReport } from "./creditAnalysis.ts";
import { buildFacts } from "./fields.ts";
import { matchPrograms } from "./matching.ts";
import type { Client, Program } from "./types.ts";

export function evaluateClient(client: Client, programs: Program[]) {
  const analysis = analyzeCreditReport(client.creditReport);
  const facts = buildFacts(client, analysis);
  const matches = matchPrograms(programs, facts);
  return { analysis, facts, matches };
}

export function useMatches(client: Client | undefined, programs: Program[]) {
  return useMemo(() => (client ? evaluateClient(client, programs) : undefined), [client, programs]);
}

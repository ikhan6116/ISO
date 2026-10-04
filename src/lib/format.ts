export const money = (n?: number | null, opts: { cents?: boolean } = {}) =>
  n == null || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: opts.cents ? 2 : 0,
      });

export const pct = (n?: number | null) => (n == null || !Number.isFinite(n) ? "—" : `${Math.round(n * 100)}%`);

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  ).slice(0, 12);

export const fullName = (c: { firstName?: string; lastName?: string }) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed client";

export const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/** Parse "$12,345.67", "12345", "12.3k" etc. Returns undefined for blank / unparseable input. */
export function parseAmount(raw: string | number | undefined | null): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  const s = raw.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!s) return undefined;
  const m = s.match(/^(-?\d*\.?\d+)(k|m)?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1);
  return Number.isFinite(n) ? n : undefined;
}

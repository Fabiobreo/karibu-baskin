import { metricDelta } from "@/lib/metrics/adminMetrics";

/**
 * Come si scrivono i numeri in `/admin/metriche` (solo italiano, è admin).
 * "n.d." e non "0%": senza dati il rapporto non è misurabile, non è nullo.
 */

const percent = new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const signed = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1, signDisplay: "always" });

export const pct = (v: number | null) => (v === null ? "n.d." : percent.format(v));
export const num = (v: number | null) => (v === null ? "n.d." : decimal.format(v));

/** Ore in testo: sotto i due giorni in ore, poi in giorni. */
export function duration(hours: number | null): string {
  if (hours === null) return "n.d.";
  return hours < 48 ? `${decimal.format(hours)} ore` : `${decimal.format(hours / 24)} gg`;
}

const SINCE = "rispetto al mese scorso";
export const NO_COMPARISON = "Nessun confronto con il mese scorso";

/** "+3 rispetto al mese scorso" per i conteggi. */
export function countDelta(current: number | null, previous: number | null): string {
  const d = metricDelta(current, previous);
  if (d === null) return NO_COMPARISON;
  const r = Math.round(d * 10) / 10;
  return r === 0 ? `Uguale al mese scorso` : `${signed.format(r)} ${SINCE}`;
}

/** "+5 punti rispetto al mese scorso" per le quote (punti percentuali). */
export function rateDelta(current: number | null, previous: number | null): string {
  const d = metricDelta(current, previous);
  if (d === null) return NO_COMPARISON;
  const points = Math.round(d * 100);
  if (points === 0) return "Uguale al mese scorso";
  const unit = Math.abs(points) === 1 ? "punto" : "punti";
  return `${signed.format(points)} ${unit} ${SINCE}`;
}

/** "+6 ore rispetto al mese scorso" per i tempi. */
export function durationDelta(current: number | null, previous: number | null): string {
  const d = metricDelta(current, previous);
  if (d === null) return NO_COMPARISON;
  if (Math.abs(d) < 0.5) return "Uguale al mese scorso";
  return Math.abs(d) < 48
    ? `${signed.format(Math.round(d))} ore ${SINCE}`
    : `${signed.format(Math.round((d / 24) * 10) / 10)} gg ${SINCE}`;
}

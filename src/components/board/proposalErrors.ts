import { readError } from "@/lib/fetchJson";

/** Errori delle rotte delle proposte (UX-73) che hanno un testo tradotto. */
const KNOWN = [
  "limit",
  "kind",
  "noDescription",
  "empty",
  "locked",
  "alreadySent",
  "halfCourt",
] as const;
type Known = (typeof KNOWN)[number];

/**
 * Il messaggio da mostrare per una risposta di errore: quello tradotto se la
 * rotta manda un `code` noto, altrimenti il testo del server (italiano) o, per
 * una risposta che non e' JSON, quello generico.
 */
export async function proposalError(
  res: Response,
  t: (key: `errors.${Known | "generic"}`) => string
): Promise<string> {
  if (res.headers.get("content-type")?.includes("application/json")) {
    const body = (await res
      .clone()
      .json()
      .catch(() => null)) as { code?: string } | null;
    const code = KNOWN.find((k) => k === body?.code);
    if (code) return t(`errors.${code}`);
  }
  if (res.status >= 500) return t("errors.generic");
  return readError(res);
}

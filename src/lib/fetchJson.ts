/**
 * Lettura del corpo di una risposta di errore.
 *
 * Il pattern `throw new Error((await res.json()).error)` sembra innocuo ma
 * nasconde proprio gli errori che contano: quando il server risponde con una
 * pagina HTML (500 non gestito, 502 del gateway, 413 payload troppo grande,
 * timeout), `res.json()` solleva un `SyntaxError` del parser che **sostituisce**
 * l'errore vero. L'utente legge `Unexpected token '<', "<!DOCTYPE "...` e chi
 * deve capire cosa è successo resta senza informazione.
 *
 * `readError` guarda il `content-type` prima di decidere come leggere il corpo,
 * e in ogni caso restituisce qualcosa di utile: il messaggio del server quando
 * c'è, altrimenti lo status.
 */

/** Quanto testo grezzo tenere quando la risposta non è JSON. */
const MAX_TEXT = 200;

function statusLabel(res: Response): string {
  return res.statusText ? `Errore ${res.status} (${res.statusText})` : `Errore ${res.status}`;
}

/**
 * Messaggio di errore leggibile per una risposta non ok.
 *
 * - JSON con `error`: restituisce quel messaggio, che è già specifico.
 * - testo semplice: restituisce il testo, troncato.
 * - HTML o corpo vuoto: restituisce lo status, perché una pagina di errore
 *   riversata in un toast non dice niente a nessuno.
 *
 * Non solleva mai: se qualcosa va storto nella lettura, ricade sullo status.
 *
 * ```ts
 * if (!res.ok) throw new Error(await readError(res));
 * ```
 */
export async function readError(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = (await res.json().catch(() => null)) as { error?: unknown } | null;
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    return statusLabel(res);
  }

  const text = (await res.text().catch(() => "")).trim();
  // Una pagina HTML non è un messaggio: meglio lo status secco.
  if (!text || text.startsWith("<")) return statusLabel(res);
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

import { NEUTRAL } from "@/lib/palette";
import { shareMessage } from "@/lib/shareLinks";

/**
 * Condivisione delle immagini del sito (tabellino, convocati, squadre):
 * l'immagine parte sempre con una frase e il link della pagina (UX-56), perché
 * un'immagine da sola su WhatsApp non porta nessuno sul sito.
 *
 * `AbortError` = l'utente ha chiuso il foglio di condivisione: chi chiama non
 * lo tratta come errore.
 */

export interface ShareLink {
  /** URL assoluto con i parametri UTM (`shareUrl` di `@/lib/shareLinks`). */
  url: string;
  /** La frase prima del link, dai dizionari (namespace `share`). */
  text: string;
}

export interface ShareImageOptions {
  title: string;
  fileName: string;
  link: ShareLink;
}

/**
 * Com'è andata: `shared` il foglio del telefono si è aperto; `downloaded`
 * l'immagine è scaricata e il messaggio con il link è negli appunti;
 * `downloaded-only` scaricata, ma gli appunti non erano disponibili.
 */
export type ShareImageOutcome = "shared" | "downloaded" | "downloaded-only";

/**
 * Trasforma in PNG un elemento nascosto (disegnato con soli stili inline:
 * html2canvas non legge il tema) e lo condivide con `shareImageBlob`.
 */
export async function shareElementAsImage(
  source: HTMLElement,
  options: ShareImageOptions
): Promise<ShareImageOutcome> {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(source, {
    scale: 2,
    backgroundColor: NEUTRAL.light.paper,
    logging: false,
    useCORS: false,
  });
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png")
  );
  return shareImageBlob(blob, options);
}

/**
 * Condivide un PNG con il foglio del sistema, con la frase e il link come
 * testo del messaggio (su Android WhatsApp ne fa la didascalia). Dove il
 * browser non condivide file (computer) scarica l'immagine e copia il
 * messaggio negli appunti, da incollare accanto.
 */
export async function shareImageBlob(
  blob: Blob,
  { title, fileName, link }: ShareImageOptions
): Promise<ShareImageOutcome> {
  const file = new File([blob], fileName, { type: "image/png" });
  const message = shareMessage(link.text, link.url);
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: message });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      // Foglio rifiutato (es. `NotAllowedError` quando l'immagine ha impiegato
      // troppo e il tocco non vale più): si ripiega sul download.
    }
  }
  download(blob, fileName);
  try {
    await navigator.clipboard.writeText(message);
    return "downloaded";
  } catch {
    return "downloaded-only";
  }
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nome di file leggibile: minuscole, trattini al posto degli spazi. */
export function shareFileName(prefix: string, label: string): string {
  return `${prefix}-${label.trim().replace(/\s+/g, "-").toLowerCase()}.png`;
}

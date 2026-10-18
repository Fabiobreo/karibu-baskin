import { NEUTRAL } from "@/lib/palette";

/**
 * Trasforma in PNG un elemento nascosto (disegnato con soli stili inline:
 * html2canvas non legge il tema) e lo condivide col foglio del sistema, o lo
 * scarica dove il browser non condivide file. `AbortError` = l'utente ha
 * chiuso il foglio di condivisione: chi chiama non lo tratta come errore.
 */
export async function shareElementAsImage(
  source: HTMLElement,
  { title, fileName }: { title: string; fileName: string }
): Promise<void> {
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
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Nome di file leggibile: minuscole, trattini al posto degli spazi. */
export function shareFileName(prefix: string, label: string): string {
  return `${prefix}-${label.trim().replace(/\s+/g, "-").toLowerCase()}.png`;
}

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { recordShareVisit } from "@/lib/metrics/shareStats";
import { ShareVisitSchema } from "@/lib/schemas/share";

/**
 * POST — qualcuno è arrivato da un link condiviso dal sito (UX-56). La chiama
 * `ReferralCapture` una volta per scheda del browser, quando l'indirizzo ha
 * `utm_medium=share` con fonte e campagna dell'elenco.
 *
 * Nessuna autenticazione: chi riceve il link spesso non ha un account. Si
 * salva solo il contatore del giorno: niente utente, dispositivo o indirizzo.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "share-visit", 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = ShareVisitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  try {
    await recordShareVisit(parsed.data.campaign, parsed.data.source);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[share] visit", err);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}

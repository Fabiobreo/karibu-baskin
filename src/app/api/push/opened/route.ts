import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { recordPushOpened } from "@/lib/notifications/pushStats";
import { PushOpenedSchema } from "@/lib/schemas/push";

/**
 * POST — una push è stata toccata (UX-55). La chiama il service worker dal
 * gestore `notificationclick`, non "Silenzia".
 *
 * Nessuna autenticazione: la notifica può arrivare a un'iscrizione anonima, e
 * il worker non manda i cookie in modo affidabile. Si salva solo il contatore
 * del tipo per il giorno: niente utente, dispositivo o indirizzo.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "push-opened", 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PushOpenedSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  try {
    await recordPushOpened(parsed.data.type);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[push] opened", err);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { recordGamePlay } from "@/lib/games/gameStats";

/**
 * POST — una partita del quiz del Baskin è finita (UX-61). Nessuna
 * autenticazione (il quiz è per tutti) e nessun dato: si aggiunge uno al
 * contatore del giorno, che lo staff legge in `/admin/metriche`.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "quiz-played", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }
  try {
    await recordGamePlay("quiz");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[games] quiz played", err);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}

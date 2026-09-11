import { NextRequest, NextResponse } from "next/server";
import { isMember } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { runSimulation } from "@/lib/rating/simulatorServer";
import { SimulateSchema } from "@/lib/schemas/simulator";

/**
 * Simula una sfida tra due formazioni.
 *
 * Per tutti i tesserati, perché il simulatore è per tutti. Il TrueSkill invece
 * è visibile solo allo staff: per questo il calcolo avviene qui e la risposta
 * contiene solo probabilità e punteggio, mai il rating dei giocatori.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "simulator", 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  if (!(await isMember())) {
    return NextResponse.json({ error: "Riservato ai tesserati" }, { status: 403 });
  }

  const parsed = SimulateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  try {
    const outcome = await runSimulation(parsed.data.a, parsed.data.b, parsed.data.nonce);
    if (!outcome.ok) {
      return NextResponse.json(
        {
          error:
            outcome.reason === "invalid-lineup"
              ? "Formazione non valida secondo le regole Baskin"
              : "Giocatori non validi",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(outcome.result);
  } catch (err) {
    console.error("[simulator]", err);
    return NextResponse.json({ error: "Errore nella simulazione" }, { status: 500 });
  }
}

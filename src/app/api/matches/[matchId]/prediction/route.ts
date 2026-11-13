import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { PredictionSchema } from "@/lib/schemas/games";
import { predictionWindow } from "@/lib/games/prediction";
import { loadOwnPrediction, loadPredictionTotals } from "@/lib/games/loadPredictions";
import { gameAccess } from "@/lib/games/gameSettings";
import { loadGameSettings } from "@/lib/games/loadGameSettings";

type Params = { params: Promise<{ matchId: string }> };

/**
 * Pronostico della partita (UX-61), solo per i tesserati.
 *
 * GET: il proprio pronostico e, solo dopo l'inizio, i totali (numeri, mai
 * nomi): prima non si mostrano, per non influenzare.
 * PUT: salva o cambia il proprio pronostico fino all'orario d'inizio (409 dopo).
 */

async function memberSession(): Promise<{ error: NextResponse } | { userId: string }> {
  const [session, settings] = await Promise.all([auth(), loadGameSettings()]);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) };
  }
  if (!isMemberRole(session.user.appRole)) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 403 }) };
  }
  // Pronostico spento dall'admin (UX-66): c'è solo l'anteprima dello staff.
  if (gameAccess(settings.prediction, session.user.appRole) === "hidden") {
    return { error: NextResponse.json({ error: "Non trovato" }, { status: 404 }) };
  }
  return { userId: session.user.id };
}

function loadMatch(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, date: true, opponentId: true, opponentTeamId: true },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const rl = checkRateLimit(getClientIp(req), "get-prediction", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  const who = await memberSession();
  if ("error" in who) return who.error;

  const { matchId } = await params;
  try {
    const match = await loadMatch(matchId);
    if (!match) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    const window = predictionWindow(match, Date.now());
    if (window === "none") return NextResponse.json({ window, prediction: null, totals: null });
    const [prediction, totals] = await Promise.all([
      loadOwnPrediction(matchId, who.userId),
      window === "closed" ? loadPredictionTotals(matchId) : Promise.resolve(null),
    ]);
    return NextResponse.json({ window, prediction, totals });
  } catch (err) {
    console.error("[prediction] get", err);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const who = await memberSession();
  if ("error" in who) return who.error;
  const rl = checkRateLimit(getClientIp(req), "put-prediction", 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const raw = await req.json().catch(() => null);
  const parsed = PredictionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { matchId } = await params;
  try {
    const match = await loadMatch(matchId);
    if (!match) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    const window = predictionWindow(match, Date.now());
    if (window === "none") {
      return NextResponse.json({ error: "Questa partita non ha il pronostico" }, { status: 409 });
    }
    if (window === "notYet") {
      return NextResponse.json({ error: "Il pronostico non è ancora aperto" }, { status: 409 });
    }
    if (window === "closed") {
      return NextResponse.json({ error: "La partita è iniziata" }, { status: 409 });
    }
    const prediction = await prisma.matchPrediction.upsert({
      where: { matchId_userId: { matchId, userId: who.userId } },
      create: { matchId, userId: who.userId, ...parsed.data },
      update: parsed.data,
      select: { outcome: true, ourScore: true, theirScore: true },
    });
    return NextResponse.json({ prediction });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    console.error("[prediction] put", err);
    return NextResponse.json({ error: "Errore nel salvataggio" }, { status: 500 });
  }
}

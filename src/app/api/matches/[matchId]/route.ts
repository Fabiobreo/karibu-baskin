import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isAdminUser, isMember } from "@/lib/apiAuth";
import { publicSubjects } from "@/lib/minors";
import { sendPushToAll } from "@/lib/notifications/webpush";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { MatchUpdateSchema, deriveResult } from "@/lib/schemas";
import { generateMatchSlug } from "@/lib/slugUtils";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { deleteImage } from "@/lib/blob";
import { recomputeRatings } from "@/lib/rating/ratingEngine";
import { mixedMatchError } from "@/lib/matches/mixedTeam";
import { buildLoanLookup, isLoanParticipation } from "@/lib/rating/loanDetection";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(req: Request, { params }: Params) {
  const rl = checkRateLimit(getClientIp(req), "get-match", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  const { matchId } = await params;

  // La scheda dello staff sull'avversario (valutazioni e note) non esce dalle
  // GET: il pannello admin la legge lato server.
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    omit: { opponentProfile: true },
    include: {
      team: { select: { id: true, name: true, season: true, color: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true, season: true, color: true } },
      playerStats: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              sportRole: true,
              sportRoleVariant: true,
              birthDate: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              sportRole: true,
              sportRoleVariant: true,
              birthDate: true,
            },
          },
        },
      },
    },
  });

  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  // Tutela dei minori, come nella GET delle statistiche: birthDate serve solo a
  // decidere e publicSubjects la toglie sempre.
  return NextResponse.json({
    ...match,
    playerStats: publicSubjects(match.playerStats, await isMember()),
  });
}

export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = MatchUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Leggi stato precedente per capire se il risultato è nuovo e se manca lo slug
  const previous = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      result: true,
      ourScore: true,
      theirScore: true,
      slug: true,
      teamId: true,
      opponentId: true,
      opponentTeamId: true,
      matchType: true,
      groupId: true,
      date: true,
      imageUrl: true,
      team: { select: { isMixed: true } },
    },
  });
  if (!previous) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  // Gestione immagine: elimina la vecchia se viene sostituita o rimossa
  if (body.imageUrl !== undefined && previous.imageUrl && previous.imageUrl !== body.imageUrl) {
    deleteImage(previous.imageUrl).catch((e) => console.error("[blob] delete match image", e));
  }

  // Cambio della nostra squadra: la nuova deve esistere, e da lì in poi i
  // controlli (Karibu, partita contro se stessa) guardano quella.
  const finalTeamId = body.teamId ?? previous.teamId;
  const teamChanged = finalTeamId !== previous.teamId;
  let finalTeamIsMixed = !!previous.team?.isMixed;
  if (teamChanged) {
    const newTeam = await prisma.competitiveTeam.findUnique({
      where: { id: finalTeamId },
      select: { isMixed: true },
    });
    if (!newTeam) {
      return NextResponse.json({ error: "Squadra non trovata" }, { status: 400 });
    }
    finalTeamIsMixed = newTeam.isMixed;
  }

  // Validazione XOR opponentId / opponentTeamId
  // Calcola lo stato finale (se non specificato, usa il precedente)
  const finalOpponentId = body.opponentId !== undefined ? body.opponentId : previous.opponentId;
  const finalOpponentTeamId =
    body.opponentTeamId !== undefined ? body.opponentTeamId : previous.opponentTeamId;
  if (!!finalOpponentId === !!finalOpponentTeamId) {
    return NextResponse.json(
      { error: "Specifica esattamente un avversario (esterno OPPURE interno)" },
      { status: 400 }
    );
  }
  if (finalOpponentTeamId && finalOpponentTeamId === finalTeamId) {
    return NextResponse.json(
      { error: "Una squadra non può giocare contro se stessa" },
      { status: 400 }
    );
  }
  const finalMatchType = finalOpponentTeamId
    ? "FRIENDLY"
    : body.matchType !== undefined
      ? body.matchType
      : previous.matchType;
  if (finalOpponentTeamId && finalMatchType !== "FRIENDLY") {
    return NextResponse.json(
      { error: "Le partite tra squadre interne possono essere solo amichevoli" },
      { status: 400 }
    );
  }
  // Karibu di stagione su uno dei due lati: niente campionato, niente gironi.
  const opponentTeamIsMixed = finalOpponentTeamId
    ? ((
        await prisma.competitiveTeam.findUnique({
          where: { id: finalOpponentTeamId },
          select: { isMixed: true },
        })
      )?.isMixed ?? false)
    : false;
  const mixedError = mixedMatchError({
    involvesMixed: finalTeamIsMixed || opponentTeamIsMixed,
    matchType: finalMatchType,
    groupId: "groupId" in body ? body.groupId : previous.groupId,
  });
  if (mixedError) return NextResponse.json({ error: mixedError }, { status: 400 });

  // 2.3 — Auto-derive result from scores (takes precedence over explicit result field)
  const incomingOur = body.ourScore !== undefined ? body.ourScore : previous?.ourScore;
  const incomingTheir = body.theirScore !== undefined ? body.theirScore : previous?.theirScore;
  let resolvedResult = body.result !== undefined ? body.result : (previous?.result ?? null);

  if (
    incomingOur !== null &&
    incomingOur !== undefined &&
    incomingTheir !== null &&
    incomingTheir !== undefined
  ) {
    const derived = deriveResult(incomingOur, incomingTheir);
    if (body.result !== undefined && body.result !== null && body.result !== derived) {
      return NextResponse.json(
        {
          error: `Il risultato ${body.result} non corrisponde al punteggio (${incomingOur}–${incomingTheir} → ${derived})`,
        },
        { status: 400 }
      );
    }
    resolvedResult = derived;
  }

  // Genera slug se manca (backfill per partite create prima dell'introduzione dello slug).
  // Supporta sia avversari esterni (OpposingTeam) che interni (CompetitiveTeam).
  let slugToSet: string | null | undefined = undefined; // undefined = non aggiornare
  if (!previous?.slug) {
    const matchDate = body.date ? new Date(body.date) : (previous?.date ?? new Date());
    const [teamRec, oppExtRec, oppIntRec] = await Promise.all([
      prisma.competitiveTeam.findUnique({
        where: { id: finalTeamId },
        select: { name: true },
      }),
      finalOpponentId
        ? prisma.opposingTeam.findUnique({
            where: { id: finalOpponentId },
            select: { name: true },
          })
        : Promise.resolve(null),
      finalOpponentTeamId
        ? prisma.competitiveTeam.findUnique({
            where: { id: finalOpponentTeamId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);
    const opponentName = oppExtRec?.name ?? oppIntRec?.name ?? null;
    if (teamRec && opponentName) {
      slugToSet = await generateMatchSlug(teamRec.name, opponentName, matchDate);
    }
  }

  const match = await prisma.match
    .update({
      where: { id: matchId },
      data: {
        ...(slugToSet !== undefined && { slug: slugToSet }),
        ...(teamChanged && { teamId: finalTeamId }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.isHome !== undefined && { isHome: body.isHome }),
        ...(body.venue !== undefined && { venue: body.venue?.trim() || null }),
        matchType: finalMatchType,
        ...(body.ourScore !== undefined && { ourScore: body.ourScore }),
        ...(body.theirScore !== undefined && { theirScore: body.theirScore }),
        result: resolvedResult,
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        // Aggiorna opponentId/opponentTeamId in modo coerente (uno solo non-null)
        ...(body.opponentId !== undefined || body.opponentTeamId !== undefined
          ? {
              opponentId: finalOpponentId ?? null,
              opponentTeamId: finalOpponentTeamId ?? null,
            }
          : {}),
        ...("matchday" in body && { matchday: body.matchday ?? null }),
        // Le amichevoli interne non hanno gironi
        ...("groupId" in body && { groupId: finalOpponentTeamId ? null : (body.groupId ?? null) }),
        // Profilo avversario post-partita (Fase 3)
        ...(body.opponentProfile !== undefined && {
          opponentProfile:
            body.opponentProfile !== null
              ? (body.opponentProfile as Prisma.InputJsonValue)
              : Prisma.DbNull,
        }),
      },
      select: {
        id: true,
        slug: true,
        date: true,
        isHome: true,
        venue: true,
        matchType: true,
        ourScore: true,
        theirScore: true,
        result: true,
        notes: true,
        imageUrl: true,
        matchday: true,
        groupId: true,
        teamId: true,
        opponentId: true,
        opponentTeamId: true,
        opponentProfile: true,
        createdAt: true,
        team: { select: { id: true, name: true, season: true, color: true, championship: true } },
        opponent: { select: { id: true, name: true, city: true } },
        opponentTeam: { select: { id: true, name: true, season: true, color: true } },
        group: { select: { id: true, name: true } },
      },
    })
    .catch((err: unknown) => {
      // Partita cancellata nel frattempo (P2025) o riferimento a un girone o
      // un'avversaria che non esiste più (P2003).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P2025" || err.code === "P2003")
      ) {
        return null;
      }
      throw err;
    });
  if (!match) {
    return NextResponse.json(
      { error: "Partita, girone o avversaria non trovati" },
      { status: 400 }
    );
  }

  // Le convocazioni della vecchia squadra passano alla nuova (i record senza
  // teamId valgono già per match.teamId), ricalcolando chi è in prestito:
  // senza, resterebbero agganciate a una squadra che non gioca più la partita.
  if (teamChanged) {
    const [loanLookup, callups] = await Promise.all([
      buildLoanLookup(matchId, finalTeamId),
      prisma.matchCallup.findMany({
        where: { matchId, OR: [{ teamId: previous.teamId }, { teamId: null }] },
        select: { id: true, userId: true, childId: true },
      }),
    ]);
    if (loanLookup && callups.length > 0) {
      await prisma.$transaction(
        callups.map((c) =>
          prisma.matchCallup.update({
            where: { id: c.id },
            data: { teamId: finalTeamId, isLoan: isLoanParticipation(loanLookup, c) },
          })
        )
      );
    }
  }

  // Ricalcola i rating TrueSkill quando il risultato viene impostato o modificato
  // (segnale secondario W/L campionato). Fire-and-forget: non blocca la risposta.
  const resultChanged = resolvedResult !== previous?.result;
  if (resultChanged) {
    recomputeRatings(prisma).catch((err) =>
      console.error("[rating] recompute after match result", err)
    );
  }

  // Invia notifica solo quando il risultato viene impostato per la prima volta
  if (resolvedResult && !previous?.result && match.ourScore !== null && match.theirScore !== null) {
    const RESULT_LABEL: Record<string, string> = {
      WIN: "Vittoria",
      LOSS: "Sconfitta",
      DRAW: "Pareggio",
    };
    const label = RESULT_LABEL[resolvedResult] ?? resolvedResult;
    const score = `${match.ourScore}–${match.theirScore}`;
    const opponentName = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
    const msgTitle = `🏀 ${label}! ${match.team.name} vs ${opponentName}`;
    const msgBody = `Risultato finale: ${score}`;
    const matchUrl = `/partite/${match.slug ?? matchId}`;
    sendPushToAll(
      { title: msgTitle, body: msgBody, url: matchUrl, type: "MATCH_RESULT" },
      false,
      "MATCH_RESULT"
    ).catch((err) => console.error("[push] match result", err));
    createAppNotification({
      type: "MATCH_RESULT",
      title: msgTitle,
      body: msgBody,
      url: matchUrl,
    }).catch((err) => console.error("[notification] match result", err));
  }

  return NextResponse.json(match);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;

  const matchToDelete = await prisma.match.findUnique({
    where: { id: matchId },
    select: { imageUrl: true, result: true },
  });

  try {
    await prisma.match.delete({ where: { id: matchId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
    }
    throw err;
  }

  deleteImage(matchToDelete?.imageUrl).catch((e) =>
    console.error("[blob] delete match image on delete", e)
  );

  // Se la partita aveva un risultato, rimuovere quel segnale TrueSkill
  if (matchToDelete?.result) {
    recomputeRatings(prisma).catch((err) =>
      console.error("[rating] recompute after match delete", err)
    );
  }

  if (session?.user?.id) {
    logAudit({
      actorId: session.user.id,
      action: "DELETE_MATCH",
      targetType: "Match",
      targetId: matchId,
    }).catch((err) => console.error("[audit] delete match", err));
  }
  return new NextResponse(null, { status: 204 });
}

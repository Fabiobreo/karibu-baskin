import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { ensureClubTeam } from "@/lib/matches/mixedTeam";
import { ClubTeamLeagueSchema } from "@/lib/schemas";

// PUT /api/competitive-teams/seasons/club-team — lo staff decide se in una
// stagione il club gioca il campionato come Karibu (una squadra sola, pubblica)
// oppure no (Karibu nascosta, solo amichevoli e tornei). Vedi
// `CompetitiveTeam.playsLeague` e @/lib/matches/mixedTeam.
export async function PUT(req: Request) {
  const session = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const parsed = ClubTeamLeagueSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { season, playsLeague } = parsed.data;

  try {
    const teamId = await ensureClubTeam(season);

    if (!playsLeague) {
      // Tornando nascosta, partite di campionato e iscrizioni ai gironi
      // resterebbero su una squadra che non può averne: prima vanno tolte.
      const [leagueMatches, groups] = await Promise.all([
        prisma.match.count({
          where: { teamId, OR: [{ matchType: "LEAGUE" }, { groupId: { not: null } }] },
        }),
        prisma.groupCompetitiveTeam.count({ where: { competitiveTeamId: teamId } }),
      ]);
      if (leagueMatches > 0 || groups > 0) {
        return NextResponse.json(
          {
            error:
              "La Karibu ha partite di campionato o è iscritta a un girone in questa stagione: toglile prima di cambiare.",
          },
          { status: 409 }
        );
      }
    }

    const team = await prisma.competitiveTeam.update({
      where: { id: teamId },
      data: { playsLeague },
      select: { id: true, name: true, season: true, playsLeague: true },
    });

    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "UPDATE_TEAM",
          targetType: "CompetitiveTeam",
          targetId: teamId,
          after: { season, playsLeague },
        }),
        "audit club team plays league"
      );
    }

    return NextResponse.json(team);
  } catch (err) {
    console.error("[competitive-teams/seasons/club-team]", err);
    return NextResponse.json({ error: "Modifica non salvata. Riprova." }, { status: 500 });
  }
}

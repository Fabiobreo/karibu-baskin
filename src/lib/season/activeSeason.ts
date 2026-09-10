import { prisma } from "@/lib/db";
import { resolveActiveSeason, type ActiveSeason } from "@/lib/season/seasonUtils";

/**
 * Cosa conta come "stagione con dati" dipende dalla pagina: /marcatori vive di
 * statistiche giocatore, /classifiche di gironi, /risultati di partite giocate,
 * /squadre e /partite delle squadre agonistiche.
 */
export type SeasonDataSource = "teams" | "playerStats" | "groups" | "results";

async function seasonsWithData(source: SeasonDataSource): Promise<string[]> {
  if (source === "groups") {
    const rows = await prisma.group.findMany({
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    });
    return rows.map((r) => r.season);
  }

  const where =
    source === "playerStats"
      ? { matches: { some: { playerStats: { some: {} } } } }
      : source === "results"
        ? { matches: { some: { result: { not: null } } } }
        : {};

  const rows = await prisma.competitiveTeam.findMany({
    where,
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  return rows.map((r) => r.season);
}

/**
 * Stagione attiva del sito, unica fonte di verità per le pagine pubbliche.
 * Restituisce anche la stagione da mostrare (con ricaduta sull'ultima popolata
 * quando la attiva è ancora vuota) e l'elenco stagioni per i chip filtro.
 */
export async function getActiveSeason(source: SeasonDataSource = "teams"): Promise<ActiveSeason> {
  const [marked, withData] = await Promise.all([
    prisma.season.findMany({
      where: { isCurrent: true },
      select: { label: true },
      orderBy: { label: "desc" },
    }),
    seasonsWithData(source),
  ]);

  return resolveActiveSeason({
    markedSeasons: marked.map((s) => s.label),
    seasonsWithData: withData,
  });
}

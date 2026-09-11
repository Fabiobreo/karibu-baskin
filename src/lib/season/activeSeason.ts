import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  pickCurrentSeason,
  resolveActiveSeason,
  type ActiveSeason,
} from "@/lib/season/seasonUtils";

/**
 * Stagioni marcate `isCurrent` dallo staff (di norma zero o una). In cache per
 * richiesta: layout e pagina la chiedono entrambi, la query parte una volta.
 */
const loadMarkedSeasons = cache(async (): Promise<string[]> => {
  const rows = await prisma.season.findMany({
    where: { isCurrent: true },
    select: { label: true },
    orderBy: { label: "desc" },
  });
  return rows.map((r) => r.label);
});

/**
 * La stagione corrente del sito: quella segnata "in corso" da /admin/squadre
 * o, se nessuna lo è, quella del calendario (cambio al 1° settembre). È l'unica
 * definizione: le pagine server la chiedono qui, i componenti client la
 * ricevono come prop. Per la stagione di una data precisa (una partita, un
 * allenamento) si usa invece `getCurrentSeason(date)`.
 */
export async function getCurrentSeasonLabel(): Promise<string> {
  return pickCurrentSeason(await loadMarkedSeasons());
}

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
        : // La sola Karibu di stagione non rende "popolata" una stagione su /squadre.
          { isMixed: false };

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
  const [marked, withData] = await Promise.all([loadMarkedSeasons(), seasonsWithData(source)]);

  return resolveActiveSeason({
    markedSeasons: marked,
    seasonsWithData: withData,
  });
}

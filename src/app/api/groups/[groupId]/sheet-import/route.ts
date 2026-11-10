import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isAdminUser } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { deriveResult } from "@/lib/schemas";
import { GroupSheetImportSchema } from "@/lib/schemas/group";
import { generateMatchSlug, generateOpposingTeamSlug } from "@/lib/slugUtils";
import { PUBLIC_TEAM_WHERE } from "@/lib/matches/mixedTeam";
import { isHistoricMatch } from "@/lib/matches/matchPhase";
import { recomputeRatingsSafely } from "@/lib/rating/recompute";
import { reconcileMatchBadges } from "@/lib/rating/matchBadges";
import { parseEisiSheet, sheetCsvUrl, type ParsedSheet } from "@/lib/groups/eisiSheet";
import { EisiSiteError, fetchEisiLeague, fetchEisiLeagues } from "@/lib/groups/eisiSite";
import {
  NEW_PREFIX,
  normalizeTeamName,
  planSheetImport,
  suggestTarget,
  summarizePlan,
  type NameTarget,
  type PlanRow,
  type SheetImportResponse,
} from "@/lib/groups/sheetImport";

/**
 * Import del calendario e dei risultati di un girone dal foglio Google
 * pubblicato dall'EISI. Una sola rotta per anteprima e salvataggio
 * (`apply: true`): il foglio si rilegge e il piano si ricalcola ogni volta,
 * così si salva esattamente quello che l'anteprima mostrava. Solo admin,
 * perché crea partite ufficiali (come `POST /api/matches`).
 */

type Params = { params: Promise<{ groupId: string }> };

const MAX_CSV_BYTES = 2_000_000;

async function fetchSheet(csvUrl: string): Promise<string> {
  const res = await fetch(csvUrl, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new SheetError("Il foglio non risponde: è ancora pubblicato sul web?");
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/csv") && !type.includes("text/plain")) {
    throw new SheetError("Il link non porta a un foglio pubblicato");
  }
  const text = await res.text();
  if (text.length > MAX_CSV_BYTES) throw new SheetError("Il foglio è troppo grande");
  return text;
}

class SheetError extends Error {}

/** Da agosto ad agosto: le partite della stagione del girone. */
function seasonRange(season: string): { gte: Date; lt: Date } | null {
  const m = season.match(/^(\d{4})-\d{2}$/);
  if (!m) return null;
  const start = Number(m[1]);
  return { gte: new Date(Date.UTC(start, 7, 1)), lt: new Date(Date.UTC(start + 1, 8, 1)) };
}

/** I gironi del sito EISI, per scegliere da quale importare. */
export async function GET(req: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const rl = checkRateLimit(getClientIp(req), "eisi-leagues", 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  try {
    return NextResponse.json({ leagues: await fetchEisiLeagues() });
  } catch (err) {
    const message = err instanceof EisiSiteError ? err.message : "Il sito EISI non risponde";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const session = await auth();
  const rl = checkRateLimit(getClientIp(req), "group-sheet-import", 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const parsed = GroupSheetImportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const csvUrl = body.url ? sheetCsvUrl(body.url) : null;
  if (body.eisiLeagueId === undefined && !csvUrl) {
    return NextResponse.json(
      {
        error:
          "Serve il link di un foglio Google pubblicato sul web (docs.google.com/spreadsheets/d/e/…)",
      },
      { status: 400 }
    );
  }

  const { groupId } = await params;
  const group = await prisma.group.findFirst({
    where: { OR: [{ slug: groupId }, { id: groupId }] },
    select: {
      id: true,
      season: true,
      competitiveTeams: { select: { competitiveTeamId: true } },
    },
  });
  if (!group) return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });

  let sheet: ParsedSheet;
  try {
    sheet =
      body.eisiLeagueId !== undefined
        ? await fetchEisiLeague(body.eisiLeagueId, group.season)
        : parseEisiSheet(await fetchSheet(csvUrl!), group.season);
  } catch (err) {
    const message =
      err instanceof SheetError || err instanceof EisiSiteError
        ? err.message
        : "Non sono riuscito a leggere le gare";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  if (sheet.matches.length === 0) {
    return NextResponse.json(
      { error: sheet.warnings[0] ?? "Nel foglio non c'è nessuna gara nel formato EISI" },
      { status: 422 }
    );
  }

  const range = seasonRange(group.season);
  const inGroup = new Set(group.competitiveTeams.map((c) => c.competitiveTeamId));
  const [seasonTeams, opponents] = await Promise.all([
    prisma.competitiveTeam.findMany({
      where: { AND: [PUBLIC_TEAM_WHERE, { season: group.season }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.opposingTeam.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const ourTeamIds = new Set(seasonTeams.map((t) => t.id));
  const opponentIds = new Set(opponents.map((o) => o.id));

  // Abbinamenti: quelli scelti dallo staff se validi, altrimenti la proposta.
  // Per le nostre squadre la proposta guarda prima quelle già nel girone.
  const groupTeams = seasonTeams.filter((t) => inGroup.has(t.id));
  const sheetNames = [...new Set(sheet.matches.flatMap((m) => [m.home, m.away]))].sort((a, b) =>
    a.localeCompare(b, "it")
  );
  const names: Record<string, NameTarget> = {};
  for (const name of sheetNames) {
    const chosen = body.names?.[name];
    const valid =
      chosen &&
      (chosen.kind === "new" ||
        chosen.kind === "skip" ||
        (chosen.kind === "ours" && ourTeamIds.has(chosen.teamId)) ||
        (chosen.kind === "opponent" && opponentIds.has(chosen.opposingTeamId)));
    names[name] = valid
      ? chosen
      : suggestTarget(name, groupTeams.length > 0 ? groupTeams : seasonTeams, opponents);
  }

  const chosenOurIds = [
    ...new Set(Object.values(names).flatMap((t) => (t.kind === "ours" ? [t.teamId] : []))),
  ];
  const [existingOurs, existingOthers] = await Promise.all([
    prisma.match.findMany({
      where: {
        teamId: { in: chosenOurIds },
        opponentTeamId: null,
        matchType: "LEAGUE",
        OR: [{ groupId: group.id }, { groupId: null }],
        ...(range && { date: range }),
      },
      select: {
        id: true,
        teamId: true,
        opponentId: true,
        date: true,
        isHome: true,
        ourScore: true,
        theirScore: true,
        matchday: true,
        venue: true,
        groupId: true,
      },
    }),
    prisma.groupMatch.findMany({
      where: { groupId: group.id },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        date: true,
        homeScore: true,
        awayScore: true,
        matchday: true,
      },
    }),
  ]);

  const useSheetScore = new Set(body.useSheetScore ?? []);
  const rows = planSheetImport({
    matches: sheet.matches,
    names,
    groupId: group.id,
    existingOurs,
    existingOthers,
    useSheetScore,
    keepMatchdays: body.keepMatchdays ?? false,
  });

  let applied: SheetImportResponse["applied"];
  if (body.apply) {
    try {
      applied = await applyPlan({
        rows,
        groupId: group.id,
        seasonTeams,
        existingOurs,
      });
    } catch (err) {
      console.error("[sheet-import] salvataggio non riuscito", err);
      const message =
        err instanceof Prisma.PrismaClientKnownRequestError
          ? `Salvataggio non riuscito (${err.code})`
          : "Salvataggio non riuscito";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "IMPORT_GROUP_SHEET",
          targetType: "Group",
          targetId: group.id,
          after: {
            source:
              body.eisiLeagueId !== undefined ? `eisi.it girone ${body.eisiLeagueId}` : csvUrl,
            ...summarizePlan(rows),
            ...applied,
          },
        }),
        "audit group sheet import"
      );
    }
  }

  const matchesByName = new Map<string, number>();
  for (const m of sheet.matches) {
    matchesByName.set(m.home, (matchesByName.get(m.home) ?? 0) + 1);
    matchesByName.set(m.away, (matchesByName.get(m.away) ?? 0) + 1);
  }
  const response: SheetImportResponse = {
    title: sheet.title,
    warnings: sheet.warnings,
    names: sheetNames.map((name) => ({
      name,
      target: names[name],
      matches: matchesByName.get(name) ?? 0,
    })),
    ourTeams: seasonTeams,
    opponents,
    rows: rows.map((r) => ({ ...r, date: r.date.toISOString() })),
    summary: summarizePlan(rows),
    applied,
  };
  return NextResponse.json(response);
}

interface ApplyInput {
  rows: PlanRow[];
  groupId: string;
  seasonTeams: Array<{ id: string; name: string }>;
  existingOurs: Array<{
    id: string;
    ourScore: number | null;
    theirScore: number | null;
    venue: string | null;
  }>;
}

async function applyPlan(input: ApplyInput): Promise<{ createdOpponents: number }> {
  const { rows, groupId, seasonTeams } = input;
  const active = rows.filter((r) => r.action !== "skip" && r.action !== "same");

  // 1. Avversarie nuove, una per nome (prima ricontrolla l'anagrafica: un
  //    altro import potrebbe averle appena create).
  const newNames = new Set<string>();
  for (const r of rows) {
    if (r.action === "skip") continue;
    for (const ref of [r.opponentRef, r.homeRef, r.awayRef]) {
      if (ref?.startsWith(NEW_PREFIX)) newNames.add(ref.slice(NEW_PREFIX.length));
    }
  }
  const resolved = new Map<string, string>();
  let createdOpponents = 0;
  if (newNames.size > 0) {
    const all = await prisma.opposingTeam.findMany({ select: { id: true, name: true } });
    for (const name of newNames) {
      const same = all.find((o) => normalizeTeamName(o.name) === normalizeTeamName(name));
      if (same) {
        resolved.set(`${NEW_PREFIX}${name}`, same.id);
        continue;
      }
      const created = await prisma.opposingTeam.create({
        data: { name, slug: await generateOpposingTeamSlug(name) },
        select: { id: true },
      });
      resolved.set(`${NEW_PREFIX}${name}`, created.id);
      createdOpponents++;
    }
  }
  const real = (ref: string | null): string | null =>
    ref?.startsWith(NEW_PREFIX) ? (resolved.get(ref) ?? null) : ref;

  // 2. Slug delle partite nuove, fuori dalla transazione (leggono il DB).
  const opponentNames = new Map(
    (
      await prisma.opposingTeam.findMany({
        where: { id: { in: rows.flatMap((r) => [real(r.opponentRef) ?? ""]) } },
        select: { id: true, name: true },
      })
    ).map((o) => [o.id, o.name] as const)
  );
  const teamNames = new Map(seasonTeams.map((t) => [t.id, t.name] as const));
  const slugs = new Map<number, string | null>();
  const usedSlugs = new Set<string>();
  for (const r of active) {
    if (r.kind !== "ours" || r.action !== "create") continue;
    const opp = opponentNames.get(real(r.opponentRef) ?? "");
    const team = teamNames.get(r.ourTeamId ?? "");
    let slug = opp && team ? await generateMatchSlug(team, opp, r.date) : null;
    // Due gare nuove con lo stesso slug nello stesso import: improbabile, ma
    // l'unicità la controlla il DB e farebbe fallire tutto.
    if (slug && usedSlugs.has(slug)) slug = `${slug}-${r.number}`;
    if (slug) usedSlugs.add(slug);
    slugs.set(r.number, slug);
  }

  const savedOurs = new Map(input.existingOurs.map((e) => [e.id, e] as const));
  const resultChanged: string[] = [];
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const r of active) {
    const writesScore =
      r.homeScore !== null &&
      r.awayScore !== null &&
      (r.action === "create" || r.action === "update");

    if (r.kind === "ours") {
      const opponentId = real(r.opponentRef);
      if (!r.ourTeamId || !opponentId) continue;
      const { ourScore, theirScore } = r;
      const score =
        writesScore && ourScore !== null && theirScore !== null
          ? { ourScore, theirScore, result: deriveResult(ourScore, theirScore) }
          : {};

      if (r.action === "create") {
        ops.push(
          prisma.match.create({
            data: {
              slug: slugs.get(r.number) ?? null,
              teamId: r.ourTeamId,
              opponentId,
              date: r.date,
              isHome: r.isHome,
              venue: r.venue,
              matchType: "LEAGUE",
              matchday: r.matchday,
              groupId,
              ...score,
            },
          })
        );
        if ("result" in score) resultChanged.push(`new:${r.number}`);
      } else if (r.existingId) {
        const saved = savedOurs.get(r.existingId);
        ops.push(
          prisma.match.update({
            where: { id: r.existingId },
            data: {
              date: r.date,
              isHome: r.isHome,
              matchday: r.matchday,
              groupId,
              ...(!saved?.venue && r.venue ? { venue: r.venue } : {}),
              ...score,
            },
          })
        );
        if (
          "result" in score &&
          (saved?.ourScore !== score.ourScore || saved?.theirScore !== score.theirScore)
        ) {
          resultChanged.push(r.existingId);
        }
      }
      continue;
    }

    const homeTeamId = real(r.homeRef);
    const awayTeamId = real(r.awayRef);
    if (!homeTeamId || !awayTeamId) continue;
    const data = {
      matchday: r.matchday,
      date: r.date,
      homeTeamId,
      awayTeamId,
      ...(writesScore ? { homeScore: r.homeScore, awayScore: r.awayScore } : {}),
    };
    if (r.action === "create") {
      ops.push(prisma.groupMatch.create({ data: { groupId, ...data } }));
    } else if (r.existingId) {
      ops.push(prisma.groupMatch.update({ where: { id: r.existingId }, data }));
    }
  }

  // 3. Squadre del girone: le nostre e le avversarie del foglio.
  const ourIds = [...new Set(active.flatMap((r) => (r.ourTeamId ? [r.ourTeamId] : [])))];
  const opponentIdsInSheet = [
    ...new Set(
      rows
        .filter((r) => r.action !== "skip")
        .flatMap((r) => [real(r.opponentRef), real(r.homeRef), real(r.awayRef)])
        .filter((id): id is string => !!id)
    ),
  ];
  ops.push(
    prisma.groupCompetitiveTeam.createMany({
      data: ourIds.map((competitiveTeamId) => ({ groupId, competitiveTeamId })),
      skipDuplicates: true,
    }),
    prisma.groupTeam.createMany({
      data: opponentIdsInSheet.map((opposingTeamId) => ({ groupId, opposingTeamId })),
      skipDuplicates: true,
    })
  );

  await keepFlippedScores(active, ops);
  await prisma.$transaction(ops);

  if (resultChanged.length > 0) {
    inBackground(recomputeRatingsSafely(), "rating recompute after sheet import");
    for (const id of resultChanged) {
      if (id.startsWith("new:")) continue; // una partita nuova non ha statistiche
      const row = rows.find((r) => r.existingId === id);
      inBackground(
        reconcileMatchBadges(id, row ? !isHistoricMatch(row.date, Date.now()) : false),
        "badges after sheet import"
      );
    }
  }
  return { createdOpponents };
}

/**
 * Una partita fra avversarie con casa e ospiti invertiti rispetto al foglio,
 * di cui non si scrive il punteggio (conflitto tenuto, o foglio senza
 * risultato): il punteggio salvato resta, ma girato, altrimenti dopo lo
 * scambio delle squadre risulterebbe al contrario.
 */
async function keepFlippedScores(
  rows: PlanRow[],
  ops: Prisma.PrismaPromise<unknown>[]
): Promise<void> {
  const flipped = rows.filter(
    (r) =>
      r.kind === "other" &&
      r.existingId &&
      r.changes.includes("casa e ospiti") &&
      !(r.action === "update" && r.homeScore !== null && r.awayScore !== null)
  );
  if (flipped.length === 0) return;
  const saved = await prisma.groupMatch.findMany({
    where: { id: { in: flipped.map((r) => r.existingId ?? "") } },
    select: { id: true, homeScore: true, awayScore: true },
  });
  for (const s of saved) {
    ops.push(
      prisma.groupMatch.update({
        where: { id: s.id },
        data: { homeScore: s.awayScore, awayScore: s.homeScore },
      })
    );
  }
}

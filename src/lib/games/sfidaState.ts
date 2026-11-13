import {
  MAX_ROSTER,
  MAX_SIDE_NAME,
  QUARTERS,
  canPlaySfida,
  quarterPlan,
  randomLineup,
  shuffle,
  splitMixed,
  type SfidaGrouping,
  type SfidaMode,
  type SfidaPlayer,
} from "@/lib/games/sfida";
import { mulberry32 } from "@/lib/seededRandom";

/**
 * Stato della Sfida (UX-69) e link condiviso. Puro: lo usa la pagina per lo
 * stato iniziale e il client per "Mescola", i cambi di modo e i cambi.
 */

/** Un giocatore della stagione, come lo vede il client (niente livelli). */
export interface SfidaPlayerView extends SfidaPlayer {
  name: string;
  /** Squadre della stagione in cui è in rosa. */
  teamIds: string[];
}

export interface SfidaTeamView {
  id: string;
  name: string;
  /** Tinta della squadra (`teamFill`), o null. */
  fill: { bg: string; fg: string } | null;
}

/** Colore di un lato: tinta della squadra vera, casacca se mescolati, o niente. */
export type SideColor =
  | { kind: "team"; bg: string; fg: string }
  | { kind: "bib"; bib: SideBib }
  | null;
export type SideBib = "orange" | "black";

export interface SfidaSide {
  name: string;
  /** Squadra vera del lato ("Squadre della stagione"), o null. */
  teamId: string | null;
  color: SideColor;
  /** Chi può giocare per questo lato: la rosa della squadra o la metà dei mescolati. */
  pool: string[];
  /** Convocati della partita intera (fino a 14). */
  roster: string[];
  /** Sei contro sei: i sei in campo (meno, dopo "Scegli tu"). */
  lineup: string[];
  /** Partita intera: i sei di ogni tempo; vuoto se i convocati non bastano. */
  quarters: string[][];
}

export interface SfidaState {
  mode: SfidaMode;
  grouping: SfidaGrouping;
  sides: [SfidaSide, SfidaSide];
  nonce: number;
}

export interface SfidaContext {
  players: readonly SfidaPlayerView[];
  teams: readonly SfidaTeamView[];
  /** Nomi casuali per i lati mescolati, nella lingua di chi guarda. */
  names: readonly string[];
}

const keysOf = (ps: readonly SfidaPlayer[]) => ps.map((p) => p.key);

/** Squadre con abbastanza giocatori per fare un lato da sole. */
export function seasonTeamsPlayable(ctx: SfidaContext, mode: SfidaMode): SfidaTeamView[] {
  return ctx.teams.filter((t) => {
    const roster = ctx.players.filter((p) => p.teamIds.includes(t.id));
    const rand = mulberry32(7);
    return mode === "full"
      ? quarterPlan(roster, rand, 20) !== null
      : randomLineup(roster, rand) !== null;
  });
}

function twoNames(names: readonly string[], rand: () => number): [string, string] {
  const [a, b] = shuffle(names, rand);
  return [a ?? "A", b ?? "B"];
}

function fillSide(
  base: Omit<SfidaSide, "roster" | "lineup" | "quarters">,
  players: readonly SfidaPlayer[],
  mode: SfidaMode,
  rand: () => number
): SfidaSide | null {
  const pool = players.filter((p) => base.pool.includes(p.key) && canPlaySfida(p));
  const roster = shuffle(pool, rand).slice(0, MAX_ROSTER);
  if (mode === "full") {
    const plan = quarterPlan(roster, rand);
    if (!plan) return null;
    return { ...base, roster: keysOf(roster), lineup: [], quarters: plan.map(keysOf) };
  }
  const lineup = randomLineup(pool, rand);
  if (!lineup) return null;
  return { ...base, roster: keysOf(roster), lineup: keysOf(lineup), quarters: [] };
}

/**
 * Due lati pronti da giocare. Con "Squadre della stagione" due squadre vere a
 * caso fra quelle che bastano da sole; altrimenti (o se non ce ne sono due)
 * tutti mescolati, con nomi casuali e le casacche. `null` se nemmeno i
 * mescolati bastano. La partita intera ripiega sul sei contro sei solo se lo
 * chiede chi chiama (`allowFallback`).
 */
export function buildSfida(
  ctx: SfidaContext,
  wanted: { mode: SfidaMode; grouping: SfidaGrouping },
  rand: () => number,
  nonce = 0
): SfidaState | null {
  const playable = ctx.players.filter(canPlaySfida);
  if (wanted.grouping === "season") {
    const teams = shuffle(seasonTeamsPlayable(ctx, wanted.mode), rand).slice(0, 2);
    if (teams.length === 2) {
      const [ta, tb] = teams;
      const poolA = playable.filter((p) => p.teamIds.includes(ta.id));
      // Chi è in rosa in tutte e due le squadre gioca con la prima.
      const poolB = playable.filter((p) => p.teamIds.includes(tb.id) && !poolA.includes(p));
      const side = (t: SfidaTeamView, pool: readonly SfidaPlayer[]) =>
        fillSide(
          {
            name: t.name,
            teamId: t.id,
            color: t.fill ? { kind: "team", ...t.fill } : null,
            pool: keysOf(pool),
          },
          playable,
          wanted.mode,
          rand
        );
      const a = side(ta, poolA);
      const b = side(tb, poolB);
      if (a && b) return { mode: wanted.mode, grouping: "season", sides: [a, b], nonce };
    }
  }
  // Tutti mescolati: qualche tentativo, la divisione a caso può venire storta.
  for (let i = 0; i < 12; i++) {
    const [poolA, poolB] = splitMixed(playable, rand);
    const [nameA, nameB] = twoNames(ctx.names, rand);
    const a = fillSide(
      { name: nameA, teamId: null, color: { kind: "bib", bib: "orange" }, pool: keysOf(poolA) },
      playable,
      wanted.mode,
      rand
    );
    const b = fillSide(
      { name: nameB, teamId: null, color: { kind: "bib", bib: "black" }, pool: keysOf(poolB) },
      playable,
      wanted.mode,
      rand
    );
    if (a && b) return { mode: wanted.mode, grouping: "mixed", sides: [a, b], nonce };
  }
  return null;
}

/** Il nome scritto a mano, pulito: niente a capo, al massimo 20 caratteri. */
export function cleanSideName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_SIDE_NAME);
}

// ── Link condiviso ───────────────────────────────────────────────────────────

/** Parametri del link: `/giochi/sfida?m=…&g=…&s=…&na=…&nb=…&ta=…&tb=…&a=…&b=…` (o `qa`/`qb`). */
export function sfidaSearchParams(state: SfidaState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("m", state.mode);
  params.set("g", state.grouping);
  params.set("s", String(state.nonce));
  const [a, b] = state.sides;
  params.set("na", a.name);
  params.set("nb", b.name);
  if (a.teamId) params.set("ta", a.teamId);
  if (b.teamId) params.set("tb", b.teamId);
  if (state.mode === "six") {
    params.set("a", a.lineup.join(","));
    params.set("b", b.lineup.join(","));
  } else {
    params.set("qa", a.quarters.map((q) => q.join(",")).join(";"));
    params.set("qb", b.quarters.map((q) => q.join(",")).join(";"));
  }
  return params;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Lo stato di un link condiviso, se torna con i giocatori della stagione:
 * stesse squadre o stessi lati, stessi nomi, stesse formazioni. Chi non è più
 * della stagione rende il link non valido (`null`: si parte da una sfida nuova).
 */
export function parseSfidaLink(params: Params, ctx: SfidaContext): SfidaState | null {
  const mode = one(params.m) === "full" ? "full" : one(params.m) === "six" ? "six" : null;
  if (!mode) return null;
  const grouping: SfidaGrouping = one(params.g) === "season" ? "season" : "mixed";
  const nonceRaw = Number(one(params.s) ?? 0);
  const nonce = Number.isInteger(nonceRaw) && nonceRaw >= 0 && nonceRaw <= 1_000_000 ? nonceRaw : 0;
  const known = new Set(ctx.players.filter(canPlaySfida).map((p) => p.key));
  const list = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : []);
  const allKnown = (ks: string[]) => ks.length > 0 && ks.every((k) => known.has(k));

  const lineups = mode === "six" ? [list(one(params.a)), list(one(params.b))] : null;
  const quarters =
    mode === "full"
      ? [one(params.qa), one(params.qb)].map((v) => (v ? v.split(";").map(list) : []))
      : null;
  if (lineups && !lineups.every(allKnown)) return null;
  if (quarters && !quarters.every((q) => q.length === QUARTERS && q.every(allKnown))) return null;

  const used = (i: 0 | 1) => [...new Set(lineups ? lineups[i] : quarters![i].flat())];
  const team = (id: string | undefined) => (id ? ctx.teams.find((t) => t.id === id) : undefined);
  const restSplit = (taken: Set<string>) => {
    const rest = ctx.players.filter((p) => canPlaySfida(p) && !taken.has(p.key));
    return [rest.filter((_, i) => i % 2 === 0), rest.filter((_, i) => i % 2 === 1)].map(keysOf);
  };
  const taken = new Set([...used(0), ...used(1)]);
  const extra = restSplit(taken);

  const side = (i: 0 | 1): SfidaSide => {
    const t = grouping === "season" ? team(one(i === 0 ? params.ta : params.tb)) : undefined;
    const fallbackName =
      cleanSideName(one(i === 0 ? params.na : params.nb) ?? "") || (t?.name ?? "");
    const mine = used(i);
    const pool = t
      ? [
          ...new Set([
            ...mine,
            ...ctx.players
              .filter(
                (p) =>
                  canPlaySfida(p) &&
                  p.teamIds.includes(t.id) &&
                  !used(i === 0 ? 1 : 0).includes(p.key)
              )
              .map((p) => p.key),
          ]),
        ]
      : [...mine, ...extra[i]];
    return {
      name: fallbackName || (i === 0 ? "A" : "B"),
      teamId: t?.id ?? null,
      color: t
        ? t.fill
          ? { kind: "team", ...t.fill }
          : null
        : { kind: "bib", bib: i === 0 ? "orange" : "black" },
      pool,
      roster: mode === "full" ? mine : pool.slice(0, MAX_ROSTER),
      lineup: lineups ? lineups[i] : [],
      quarters: quarters ? quarters[i] : [],
    };
  };
  if (grouping === "season" && (!team(one(params.ta)) || !team(one(params.tb)))) return null;
  return { mode, grouping, sides: [side(0), side(1)], nonce };
}

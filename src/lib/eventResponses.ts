import type { EventAttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Riepilogo delle risposte a un evento, per lo staff: chi viene all'evento
 * principale, chi a ciascun extra, le note (allergie, esigenze) e gli esterni
 * sotto chi li ha portati. Lo usano il dialog "Risposte" di /admin/eventi e il
 * CSV da mandare al ristorante.
 *
 * Gli esterni li vede solo chi li ha aggiunti, quindi due genitori possono
 * aggiungere la stessa persona senza accorgersene: qui si segnalano gli
 * esterni con lo stesso nome di un altro esterno o di un partecipante.
 *
 * Chi gioca: chi ha un ruolo Baskin (1-5), qualunque sia il ruolo nell'app. Un
 * genitore con un ruolo gioca; uno senza partecipa ma non gioca. Serve per le
 * partite di dimostrazione, dove conta sapere chi scende in campo.
 */

export type ResponseKind = "user" | "child" | "guest";

export interface ResponseRow {
  id: string;
  name: string;
  kind: ResponseKind;
  status: EventAttendanceStatus;
  optionIds: string[];
  note: string | null;
  /** Solo per gli esterni: chi li ha portati. */
  guestOf: string | null;
  /** Chi ha dato la risposta, se non e' la persona stessa. */
  respondedBy: string | null;
  /** Esterno con lo stesso nome di un altro esterno o di un partecipante. */
  possibleDuplicate: boolean;
  /** Ruolo Baskin: chi ce l'ha puo' giocare. Mai per gli esterni. */
  sportRole: number | null;
  sportRoleVariant: string | null;
}

export interface PlayersSummary {
  going: number;
  maybe: number;
  /** Solo chi ha detto Ci sarò, per ruolo 1-5: per comporre le squadre. */
  goingByRole: Record<number, number>;
}

export interface EventResponses {
  options: { id: string; label: string; count: number; guestCount: number }[];
  totals: Record<EventAttendanceStatus, number> & { guests: number };
  players: PlayersSummary;
  rows: ResponseRow[];
}

// ── Parte pura ────────────────────────────────────────────────────────────────

export interface AttendanceInput {
  id: string;
  status: EventAttendanceStatus;
  note: string | null;
  userId: string | null;
  childId: string | null;
  guestId: string | null;
  respondedById: string | null;
  user: { name: string | null; sportRole: number | null; sportRoleVariant: string | null } | null;
  child: {
    name: string;
    userId: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
    /** Account della persona, se ha anche una scheda figlio: il ruolo puo' stare li'. */
    user: { sportRole: number | null; sportRoleVariant: string | null } | null;
  } | null;
  guest: { name: string | null; addedById: string; addedBy: { name: string | null } } | null;
  respondedBy: { name: string | null } | null;
}

export interface SelectionInput {
  optionId: string;
  userId: string | null;
  childId: string | null;
  guestId: string | null;
}

const STATUS_ORDER: Record<EventAttendanceStatus, number> = { GOING: 0, MAYBE: 1, NOT_GOING: 2 };

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function summarizeResponses(
  options: { id: string; label: string }[],
  attendances: AttendanceInput[],
  selections: SelectionInput[]
): EventResponses {
  // Una sola riga per chi ha scheda figlio e account: vale la scheda, come
  // nell'RSVP. Una vecchia riga sull'account si scarta.
  const accountsWithChildRow = new Set(
    attendances.map((a) => a.child?.userId).filter(Boolean) as string[]
  );
  const kept = attendances.filter((a) => !(a.userId && accountsWithChildRow.has(a.userId)));

  const selectionsOf = (a: AttendanceInput) =>
    selections
      .filter((s) =>
        a.guestId
          ? s.guestId === a.guestId
          : a.childId
            ? s.childId === a.childId
            : s.userId === a.userId && !s.childId && !s.guestId
      )
      .map((s) => s.optionId);

  // Ruolo della scheda figlio, o in mancanza del suo account.
  const roleOf = (a: AttendanceInput) => {
    if (a.guestId) return { sportRole: null, sportRoleVariant: null };
    if (a.child) {
      const src = a.child.sportRole != null ? a.child : a.child.user;
      return { sportRole: src?.sportRole ?? null, sportRoleVariant: src?.sportRoleVariant ?? null };
    }
    return {
      sportRole: a.user?.sportRole ?? null,
      sportRoleVariant: a.user?.sportRoleVariant ?? null,
    };
  };

  // Account della persona: serve a capire se ha risposto lei e dove stanno i
  // suoi esterni.
  const accountOf = (a: AttendanceInput) => a.userId ?? a.child?.userId ?? null;

  const toRow = (a: AttendanceInput): ResponseRow => {
    // "Figlio" e' chi non ha un account; chi ha scheda figlio e account (un
    // atleta adulto figlio di tesserati) per lo staff e' un tesserato.
    const kind: ResponseKind = a.guestId
      ? "guest"
      : a.childId && !a.child?.userId
        ? "child"
        : "user";
    const self = a.respondedById !== null && a.respondedById === accountOf(a);
    return {
      id: a.id,
      name: a.guest ? (a.guest.name ?? "") : (a.child?.name ?? a.user?.name ?? "—"),
      kind,
      status: a.status,
      optionIds: selectionsOf(a),
      note: a.note,
      guestOf: a.guest ? (a.guest.addedBy.name ?? "—") : null,
      respondedBy: kind === "guest" || self ? null : (a.respondedBy?.name ?? null),
      possibleDuplicate: false,
      ...roleOf(a),
    };
  };

  const people = kept.filter((a) => !a.guestId);
  const guests = kept.filter((a) => a.guestId);

  // Doppioni possibili fra gli esterni (solo quelli con un nome).
  const guestNames = guests.map((g) => normalize(g.guest?.name ?? "")).filter(Boolean);
  const peopleNames = new Set(people.map((p) => normalize(toRow(p).name)));
  const isDuplicate = (name: string | null) => {
    if (!name?.trim()) return false;
    const n = normalize(name);
    return guestNames.filter((x) => x === n).length > 1 || peopleNames.has(n);
  };

  const byName = (a: ResponseRow, b: ResponseRow) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "it");

  // Esterni subito sotto chi li ha portati; quelli di chi non ha risposto in fondo.
  const peopleRows = people.map(toRow).sort(byName);
  const guestRows = guests.map((g) => ({
    row: { ...toRow(g), possibleDuplicate: isDuplicate(g.guest!.name) },
    addedById: g.guest!.addedById,
  }));
  const rows: ResponseRow[] = [];
  const placed = new Set<string>();
  for (const p of peopleRows) {
    rows.push(p);
    const account = accountOf(people.find((a) => a.id === p.id)!);
    for (const g of guestRows) {
      if (account && g.addedById === account && !placed.has(g.row.id)) {
        rows.push(g.row);
        placed.add(g.row.id);
      }
    }
  }
  rows.push(...guestRows.filter((g) => !placed.has(g.row.id)).map((g) => g.row));

  const all = [...peopleRows, ...guestRows.map((g) => g.row)];
  const totals = { GOING: 0, MAYBE: 0, NOT_GOING: 0, guests: guestRows.length };
  for (const r of all) totals[r.status] += 1;

  const players: PlayersSummary = { going: 0, maybe: 0, goingByRole: {} };
  for (const r of all) {
    if (r.sportRole == null) continue;
    if (r.status === "GOING") {
      players.going += 1;
      players.goingByRole[r.sportRole] = (players.goingByRole[r.sportRole] ?? 0) + 1;
    } else if (r.status === "MAYBE") players.maybe += 1;
  }

  return {
    players,
    options: options.map((o) => {
      const joined = all.filter((r) => r.optionIds.includes(o.id));
      return {
        id: o.id,
        label: o.label,
        count: joined.length,
        guestCount: joined.filter((r) => r.kind === "guest").length,
      };
    }),
    totals,
    rows,
  };
}

// ── Lettura dal database ──────────────────────────────────────────────────────

export async function loadEventResponses(eventId: string) {
  const [event, attendances, selections] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        title: true,
        options: {
          orderBy: [{ order: "asc" }, { startsAt: "asc" }],
          select: { id: true, label: true },
        },
      },
    }),
    prisma.eventAttendance.findMany({
      where: { eventId },
      select: {
        id: true,
        status: true,
        note: true,
        userId: true,
        childId: true,
        guestId: true,
        respondedById: true,
        user: { select: { name: true, sportRole: true, sportRoleVariant: true } },
        child: {
          select: {
            name: true,
            userId: true,
            sportRole: true,
            sportRoleVariant: true,
            user: { select: { sportRole: true, sportRoleVariant: true } },
          },
        },
        guest: { select: { name: true, addedById: true, addedBy: { select: { name: true } } } },
        respondedBy: { select: { name: true } },
      },
    }),
    prisma.eventOptionSelection.findMany({
      where: { option: { eventId } },
      select: { optionId: true, userId: true, childId: true, guestId: true },
    }),
  ]);
  if (!event) return null;
  return { event, ...summarizeResponses(event.options, attendances, selections) };
}

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
 * Le righe sono raggruppate per famiglia (genitori vicino ai figli), con le
 * famiglie che hanno almeno un "Ci sarò" in testa. La famiglia si ricava dai
 * collegamenti genitore-figlio (`ChildGuardian`, `Child.userId`), come
 * nell'RSVP: chi non ha collegamenti fa famiglia da solo.
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
  /** Famiglia della riga: 1, 2, 3… nell'ordine dell'elenco. */
  family: number;
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

/** Un collegamento genitore-figlio fra le persone dell'evento. */
export interface GuardianLink {
  childId: string;
  /** Il genitore. */
  userId: string;
  /** L'account del figlio, se ne ha uno. */
  childAccountId: string | null;
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
  selections: SelectionInput[],
  links: GuardianLink[] = []
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
      family: 0,
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

  const byName = (a: ResponseRow, b: ResponseRow) => a.name.localeCompare(b.name, "it");

  // Famiglie: componenti connesse fra persone (u:account, c:scheda figlio).
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let root = k;
    while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  const guardianKeys = new Set<string>();
  for (const l of links) {
    union(`c:${l.childId}`, `u:${l.userId}`);
    if (l.childAccountId) union(`c:${l.childId}`, `u:${l.childAccountId}`);
    guardianKeys.add(`u:${l.userId}`);
  }
  const personKey = (a: AttendanceInput) => {
    if (a.childId) {
      if (a.child?.userId) union(`c:${a.childId}`, `u:${a.child.userId}`);
      return `c:${a.childId}`;
    }
    return `u:${a.userId}`;
  };
  // Prima si collegano tutte le chiavi, poi si leggono le radici.
  const keyOf = new Map(people.map((a) => [a.id, personKey(a)]));
  const isGuardianRow = (a: AttendanceInput) =>
    guardianKeys.has(`u:${a.userId}`) ||
    (!!a.child?.userId && guardianKeys.has(`u:${a.child.userId}`));

  interface Family {
    members: { row: ResponseRow; account: string | null; guardian: boolean }[];
    guests: { row: ResponseRow; addedById: string }[];
  }
  const families = new Map<string, Family>();
  const familyOf = (root: string) => {
    let f = families.get(root);
    if (!f) families.set(root, (f = { members: [], guests: [] }));
    return f;
  };
  for (const a of people) {
    familyOf(find(keyOf.get(a.id)!)).members.push({
      row: toRow(a),
      account: accountOf(a),
      guardian: isGuardianRow(a),
    });
  }

  // Esterni subito sotto chi li ha portati; quelli di chi non ha risposto in
  // fondo alla sua famiglia, o in fondo all'elenco se non ne ha una.
  const guestRows = guests.map((g) => ({
    row: { ...toRow(g), possibleDuplicate: isDuplicate(g.guest!.name) },
    addedById: g.guest!.addedById,
  }));
  const strayGuests: ResponseRow[] = [];
  for (const g of guestRows) {
    const root = find(`u:${g.addedById}`);
    if (families.has(root)) families.get(root)!.guests.push(g);
    else strayGuests.push(g.row);
  }

  // Dentro la famiglia prima i genitori, poi gli altri, per nome. Le famiglie
  // con un "Ci sarò" (poi con un "Forse") in testa, poi per nome.
  const ordered = [...families.values()].map((f) => {
    f.members.sort((a, b) => Number(b.guardian) - Number(a.guardian) || byName(a.row, b.row));
    const best = Math.min(...f.members.map((m) => STATUS_ORDER[m.row.status]));
    return { f, best };
  });
  ordered.sort((a, b) => a.best - b.best || byName(a.f.members[0].row, b.f.members[0].row));

  const rows: ResponseRow[] = [];
  ordered.forEach(({ f }, i) => {
    const family = i + 1;
    const placed = new Set<string>();
    for (const m of f.members) {
      rows.push({ ...m.row, family });
      for (const g of f.guests) {
        if (m.account && g.addedById === m.account && !placed.has(g.row.id)) {
          rows.push({ ...g.row, family });
          placed.add(g.row.id);
        }
      }
    }
    for (const g of f.guests) {
      if (!placed.has(g.row.id)) rows.push({ ...g.row, family });
    }
  });
  strayGuests.forEach((g, i) => rows.push({ ...g, family: ordered.length + i + 1 }));

  const all = rows;
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

  // Collegamenti genitore-figlio fra chi ha risposto, per raggruppare le famiglie.
  const childIds = attendances.flatMap((a) => (a.childId ? [a.childId] : []));
  const userIds = attendances.flatMap((a) =>
    [a.userId, a.child?.userId].filter((id): id is string => !!id)
  );
  const links =
    childIds.length + userIds.length === 0
      ? []
      : await prisma.childGuardian.findMany({
          where: {
            OR: [
              { childId: { in: childIds } },
              { userId: { in: userIds } },
              { child: { userId: { in: userIds } } },
            ],
          },
          select: { childId: true, userId: true, child: { select: { userId: true } } },
        });

  return {
    event,
    ...summarizeResponses(
      event.options,
      attendances,
      selections,
      links.map((l) => ({ childId: l.childId, userId: l.userId, childAccountId: l.child.userId }))
    ),
  };
}

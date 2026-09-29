import type { EventAttendanceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { memberRowFilter, type FamilyMember } from "@/lib/eventFamily";

/**
 * Risposte di una famiglia a un evento: una per persona (vedi `eventFamily`),
 * piu' gli esterni aggiunti da chi guarda. Gli esterni di un altro membro
 * della famiglia non compaiono: li vede solo chi li ha aggiunti (e lo staff).
 */

export type RsvpStatus = EventAttendanceStatus;

export interface MemberRsvp {
  key: FamilyMember["key"];
  name: string;
  isSelf: boolean;
  status: RsvpStatus | null;
  note: string | null;
  optionIds: string[];
  /** Chi ha dato la risposta, se non e' la persona stessa ne' chi guarda. */
  respondedByName: string | null;
}

export interface GuestRsvp {
  id: string;
  name: string | null;
  status: RsvpStatus;
  note: string | null;
  optionIds: string[];
}

interface AttendanceRow {
  userId: string | null;
  childId: string | null;
  status: RsvpStatus;
  note: string | null;
  respondedById: string | null;
  respondedBy: { name: string | null } | null;
}

function subjectOr(members: FamilyMember[]): Prisma.EventAttendanceWhereInput[] {
  const userIds = members.map((m) => m.userId).filter(Boolean) as string[];
  const childIds = members.map((m) => m.childId).filter(Boolean) as string[];
  return [{ userId: { in: userIds } }, { childId: { in: childIds } }];
}

/**
 * La riga di un membro: quella della scheda figlio, o in mancanza quella
 * sull'account (risposte date prima che la persona avesse una scheda figlio).
 */
function pick<T extends { userId: string | null; childId: string | null }>(
  rows: T[],
  m: FamilyMember
): T[] {
  const byChild = m.childId ? rows.filter((r) => r.childId === m.childId) : [];
  if (byChild.length > 0) return byChild;
  return m.userId ? rows.filter((r) => r.userId === m.userId && !r.childId) : [];
}

export async function loadFamilyRsvp(
  eventId: string,
  selfId: string,
  members: FamilyMember[],
  optionIds: string[]
): Promise<{ members: MemberRsvp[]; guests: GuestRsvp[] }> {
  const or = subjectOr(members);
  const [attendances, selections, guests] = await Promise.all([
    prisma.eventAttendance.findMany({
      where: { eventId, OR: or },
      select: {
        userId: true,
        childId: true,
        status: true,
        note: true,
        respondedById: true,
        respondedBy: { select: { name: true } },
      },
    }),
    optionIds.length > 0
      ? prisma.eventOptionSelection.findMany({
          where: {
            optionId: { in: optionIds },
            OR: or as Prisma.EventOptionSelectionWhereInput[],
          },
          select: { optionId: true, userId: true, childId: true },
        })
      : [],
    prisma.eventGuest.findMany({
      where: { eventId, addedById: selfId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        attendance: { select: { status: true, note: true } },
        selections: { select: { optionId: true } },
      },
    }),
  ]);

  return {
    members: members.map((m) => {
      const a = pick<AttendanceRow>(attendances, m)[0];
      const own = a?.respondedById && (a.respondedById === m.userId || a.respondedById === selfId);
      return {
        key: m.key,
        name: m.name,
        isSelf: m.isSelf,
        status: a?.status ?? null,
        note: a?.note ?? null,
        optionIds: pick(selections, m).map((s) => s.optionId),
        respondedByName: a && !own ? (a.respondedBy?.name ?? null) : null,
      };
    }),
    guests: guests.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.attendance?.status ?? "GOING",
      note: g.attendance?.note ?? null,
      optionIds: g.selections.map((s) => s.optionId),
    })),
  };
}

// ── Salvataggio ───────────────────────────────────────────────────────────────

export interface MemberInput {
  key: string;
  status: RsvpStatus | null;
  optionIds: string[];
  note?: string | null;
}

export interface GuestInput {
  id?: string;
  name?: string | null;
  status: RsvpStatus;
  optionIds: string[];
  note?: string | null;
}

export class RsvpError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * Salva in blocco le risposte della famiglia e gli esterni di chi risponde.
 * Una persona senza stato e senza opzioni torna "senza risposta". Si toccano
 * solo le righe cambiate, cosi' "risposto da" resta di chi ha risposto davvero.
 */
export async function saveFamilyRsvp(args: {
  eventId: string;
  selfId: string;
  members: FamilyMember[];
  optionIds: string[];
  people: MemberInput[];
  guests: GuestInput[];
  allowGuests: boolean;
  maxGuests: number | null;
}): Promise<void> {
  const { eventId, selfId, members, optionIds, people, guests } = args;
  const byKey = new Map(members.map((m) => [m.key as string, m]));
  const validOptions = new Set(optionIds);

  for (const p of people) {
    const m = byKey.get(p.key);
    if (!m) throw new RsvpError("Puoi rispondere solo per la tua famiglia", 403);
    if (p.optionIds.some((id) => !validOptions.has(id))) throw new RsvpError("Opzione non valida");
    if (!p.status && p.optionIds.length > 0) {
      throw new RsvpError(`Indica se ${m.name} viene all'evento`);
    }
  }
  // Un esterno o viene all'evento (GOING) o viene solo agli extra (NOT_GOING
  // con almeno un extra): "Forse" non c'e', e chi non viene si toglie.
  for (const g of guests) {
    if (g.optionIds.some((id) => !validOptions.has(id))) throw new RsvpError("Opzione non valida");
    if (g.status === "MAYBE") throw new RsvpError('Un esterno viene o no: niente "Forse"');
    if (g.status === "NOT_GOING" && g.optionIds.length === 0) {
      throw new RsvpError(`Scegli a quali extra partecipa ${g.name?.trim() || "l'esterno"}`);
    }
  }
  if (guests.length > 0 && !args.allowGuests) {
    throw new RsvpError("Per questo evento non sono ammessi esterni");
  }
  if (args.maxGuests !== null && guests.length > args.maxGuests) {
    throw new RsvpError(`Puoi aggiungere al massimo ${args.maxGuests} esterni`);
  }

  const current = await loadFamilyRsvp(eventId, selfId, members, optionIds);
  const currentByKey = new Map(current.members.map((c) => [c.key as string, c]));
  const myGuestIds = new Set(current.guests.map((g) => g.id));
  if (guests.some((g) => g.id && !myGuestIds.has(g.id))) {
    throw new RsvpError("Esterno non valido", 403);
  }

  await prisma.$transaction(async (tx) => {
    for (const p of people) {
      const m = byKey.get(p.key)!;
      const before = currentByKey.get(p.key);
      const note = p.note?.trim() || null;
      const unchanged =
        before &&
        before.status === p.status &&
        (before.note ?? null) === note &&
        sameSet(before.optionIds, p.optionIds);
      if (unchanged) continue;

      const subject = memberRowFilter(m);
      // Una vecchia riga sull'account di chi ora ha una scheda figlio: via,
      // cosi' la persona non conta due volte.
      const legacy = m.childId && m.userId ? [{ userId: m.userId, childId: null }] : [];
      await tx.eventOptionSelection.deleteMany({
        where: { optionId: { in: optionIds }, OR: [subject, ...legacy] },
      });
      await tx.eventAttendance.deleteMany({ where: { eventId, OR: [subject, ...legacy] } });

      if (!p.status) continue; // torna "senza risposta"
      await tx.eventAttendance.create({
        data: { eventId, ...subject, status: p.status, note, respondedById: selfId },
      });
      if (p.optionIds.length > 0) {
        await tx.eventOptionSelection.createMany({
          data: p.optionIds.map((optionId) => ({ optionId, ...subject })),
          skipDuplicates: true,
        });
      }
    }

    // Esterni: l'elenco inviato sostituisce quello di chi risponde.
    const keep = new Set(guests.map((g) => g.id).filter(Boolean) as string[]);
    const removed = [...myGuestIds].filter((id) => !keep.has(id));
    if (removed.length > 0) await tx.eventGuest.deleteMany({ where: { id: { in: removed } } });

    for (const g of guests) {
      const name = g.name?.trim() || null;
      const note = g.note?.trim() || null;
      const guest = g.id
        ? await tx.eventGuest.update({ where: { id: g.id }, data: { name } })
        : await tx.eventGuest.create({ data: { eventId, name, addedById: selfId } });
      await tx.eventAttendance.upsert({
        where: { guestId: guest.id },
        create: { eventId, guestId: guest.id, status: g.status, note, respondedById: selfId },
        update: { status: g.status, note },
      });
      await tx.eventOptionSelection.deleteMany({ where: { guestId: guest.id } });
      if (g.optionIds.length > 0) {
        await tx.eventOptionSelection.createMany({
          data: g.optionIds.map((optionId) => ({ optionId, guestId: guest.id })),
          skipDuplicates: true,
        });
      }
    }
  });
}

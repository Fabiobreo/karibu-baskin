import { NextRequest, NextResponse } from "next/server";
import { Prisma, type AppRole } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { canViewAdminPanel, isMemberRole } from "@/lib/authRoles";
import { staffActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DrillUpdateSchema, drillContentSchema } from "@/lib/schemas/drill";
import { inBackground } from "@/lib/background";
import { deliverNotices } from "@/lib/notifications/matchNotify";
import { canBePublic } from "@/lib/board/category";
import { proposalPublishedNotice } from "@/lib/board/proposalNotify";
import {
  DRILL_ADMIN_SELECT,
  DRILL_PUBLIC_SELECT,
  auditDrill,
  visibleDrillWhere,
} from "@/lib/board/drillAdmin";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Non trovato" }, { status: 404 });

/**
 * GET — un esercizio o uno schema (UX-72). Ai tesserati se pubblicato e non
 * archiviato, a tutti gli altri solo un esercizio pubblico; a chi entra nel
 * pannello (staff e dirigente) anche le bozze, con i campi del pannello.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const rl = checkRateLimit(getClientIp(req), "get-drill", 120, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.appRole as AppRole | undefined;
  if (canViewAdminPanel(role)) {
    // La bozza di una proposta non ancora inviata e' solo dell'autore (UX-73).
    const drill = await prisma.drill.findFirst({
      where: { id, NOT: { status: "PROPOSED", proposedAt: null } },
      select: DRILL_ADMIN_SELECT,
    });
    return drill ? NextResponse.json(drill) : notFound();
  }
  const drill = await prisma.drill.findFirst({
    where: { id, ...visibleDrillWhere(isMemberRole(role)) },
    select: DRILL_PUBLIC_SELECT,
  });
  return drill ? NextResponse.json(drill) : notFound();
}

/**
 * PUT — modifica anagrafica, disegno o stato. Staff. Il disegno si ricontrolla
 * contro il campo (quello nuovo, se cambia): passando a meta' campo i pezzi
 * devono gia' stare nella meta' di destra (li sposta l'editor).
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const who = await staffActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  const parsed = DrillUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.drill.findUnique({
      where: { id },
      select: {
        title: true,
        kind: true,
        court: true,
        status: true,
        visibility: true,
        content: true,
        archivedAt: true,
        publishedAt: true,
        adoptedAt: true,
        createdById: true,
      },
    });
    if (!existing) return notFound();
    // Una proposta di un tesserato (UX-73) si adotta prima di cambiarla.
    if (existing.status === "PROPOSED") {
      return NextResponse.json(
        { error: "È una proposta: adottala prima di modificarla" },
        { status: 409 }
      );
    }
    if (existing.archivedAt) {
      return NextResponse.json({ error: "Lo schema è archiviato" }, { status: 409 });
    }

    const { content: rawContent, ...fields } = parsed.data;
    const court = fields.court ?? existing.court;
    const contentResult = drillContentSchema(court).safeParse(rawContent ?? existing.content);
    if (!contentResult.success) {
      const message =
        rawContent === undefined && fields.court
          ? "Prima porta tutti i pezzi nella metà campo di destra"
          : (contentResult.error.issues[0]?.message ?? "Disegno non valido");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const content = contentResult.data;
    const status = fields.status ?? existing.status;

    // Solo un esercizio puo' essere pubblico. Chi trasforma un esercizio
    // pubblico in uno schema lo riporta ai soli tesserati senza doverci pensare.
    const kind = fields.kind ?? existing.kind;
    if (fields.visibility === "PUBLIC" && !canBePublic(kind)) {
      return NextResponse.json(
        { error: "Solo un esercizio può essere pubblico: gli schemi sono dei tesserati" },
        { status: 400 }
      );
    }
    const visibility = canBePublic(kind) ? (fields.visibility ?? existing.visibility) : "MEMBERS";
    if (status === "PUBLISHED" && content.pieces.length === 0) {
      return NextResponse.json(
        { error: "Aggiungi almeno un pezzo prima di pubblicare" },
        { status: 409 }
      );
    }

    const drill = await prisma.drill.update({
      where: { id },
      data: {
        ...fields,
        visibility,
        content: content as unknown as Prisma.InputJsonValue,
        updatedById: who.actorId,
        ...(status === "PUBLISHED" && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      },
      select: DRILL_ADMIN_SELECT,
    });

    // Prima pubblicazione di un esercizio proposto da un tesserato: glielo diciamo.
    if (status === "PUBLISHED" && !existing.publishedAt && existing.adoptedAt) {
      const notice = proposalPublishedNotice({
        authorId: existing.createdById,
        actorId: who.actorId,
        title: drill.title,
        slug: drill.slug,
      });
      if (notice) {
        inBackground(deliverNotices([notice], "drill published"), "notification drill published");
      }
    }

    const statusChanged = status !== existing.status;
    auditDrill({
      actorId: who.actorId,
      action: statusChanged
        ? status === "PUBLISHED"
          ? "PUBLISH_DRILL"
          : "UNPUBLISH_DRILL"
        : "UPDATE_DRILL",
      targetId: id,
      before: {
        title: existing.title,
        court: existing.court,
        status: existing.status,
        visibility: existing.visibility,
      },
      after: {
        title: drill.title,
        court: drill.court,
        status: drill.status,
        visibility: drill.visibility,
        ...(rawContent !== undefined
          ? { steps: content.steps.length, pieces: content.pieces.length }
          : {}),
      },
    });
    return NextResponse.json(drill);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Squadra non trovata" }, { status: 400 });
    }
    console.error("[playbook] modifica", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

/**
 * DELETE — uno schema mai usato in un allenamento si elimina; uno usato si
 * archivia, perche' gli allenamenti passati continuino a mostrarlo. Staff.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const who = await staffActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  try {
    const existing = await prisma.drill.findUnique({
      where: { id },
      select: {
        title: true,
        status: true,
        proposedAt: true,
        archivedAt: true,
        suggestionId: true,
        _count: { select: { trainings: true } },
      },
    });
    if (!existing) return notFound();

    // Una proposta (UX-73) non si cancella: e' il lavoro dell'autore, che la
    // puo' rileggere. Lo staff la mette da parte ("Non adesso").
    if (existing.status === "PROPOSED") {
      if (!existing.proposedAt) return notFound();
      if (!existing.archivedAt) {
        await prisma.$transaction([
          prisma.drill.update({
            where: { id },
            data: { archivedAt: new Date(), updatedById: who.actorId },
          }),
          ...(existing.suggestionId
            ? [
                prisma.suggestion.update({
                  where: { id: existing.suggestionId },
                  data: { status: "ARCHIVIATO" },
                }),
              ]
            : []),
        ]);
        auditDrill({
          actorId: who.actorId,
          action: "DECLINE_DRILL_PROPOSAL",
          targetId: id,
          before: { title: existing.title },
        });
      }
      return NextResponse.json({ archived: true });
    }

    if (existing._count.trainings > 0) {
      if (!existing.archivedAt) {
        await prisma.drill.update({
          where: { id },
          data: { archivedAt: new Date(), updatedById: who.actorId },
        });
        auditDrill({
          actorId: who.actorId,
          action: "ARCHIVE_DRILL",
          targetId: id,
          before: { title: existing.title },
        });
      }
      return NextResponse.json({ archived: true });
    }

    await prisma.drill.delete({ where: { id } });
    auditDrill({
      actorId: who.actorId,
      action: "DELETE_DRILL",
      targetId: id,
      before: { title: existing.title },
    });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    // Usato in un allenamento fra la lettura e l'eliminazione.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json(
        { error: "Lo schema è appena entrato in un allenamento: riprova" },
        { status: 409 }
      );
    }
    console.error("[playbook] elimina", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { memberActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { ProposalUpdateSchema, drillContentSchema } from "@/lib/schemas/drill";
import { auditDrill } from "@/lib/board/drillAdmin";
import { canEditProposal, canStaffEditProposal, canWithdrawProposal } from "@/lib/board/proposals";

type Ctx = { params: Promise<{ id: string }> };

const PROPOSAL_FIELDS = {
  status: true,
  createdById: true,
  proposedAt: true,
  adoptedAt: true,
  archivedAt: true,
  court: true,
  content: true,
  description: true,
  suggestionId: true,
} as const;

// A chi non e' l'autore la proposta non esiste: 404, mai 403.
const notFound = () => NextResponse.json({ error: "Non trovato" }, { status: 404 });

/**
 * PUT — l'autore modifica la sua proposta (UX-73) finche' lo staff non l'ha
 * adottata o messa da parte: titolo, tipo (solo esercizi), campo, descrizione,
 * "Mostra il mio nome" e il disegno. Se e' gia' inviata, la descrizione
 * aggiorna anche il testo del suggerimento collegato. Allenatori e admin la
 * correggono anche prima di adottarla, una volta inviata (non "Mostra il mio
 * nome", che resta una scelta dell'autore).
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const who = await memberActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  const rl = checkRateLimit(getClientIp(req), `drill-proposal-put-${who.actorId}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const parsed = ProposalUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const kindIssue = parsed.error.issues.some((i) => i.path[0] === "kind");
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Dati non validi",
        ...(kindIssue ? { code: "kind" } : {}),
      },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.drill.findUnique({ where: { id }, select: PROPOSAL_FIELDS });
    const isAuthor = existing?.createdById === who.actorId;
    const staffEdit = !isAuthor && who.isStaff && !!existing && canStaffEditProposal(existing);
    if (!existing || existing.status !== "PROPOSED" || (!isAuthor && !staffEdit)) {
      return notFound();
    }
    if (isAuthor && !canEditProposal(existing, who.actorId)) {
      return NextResponse.json(
        { error: "Lo staff ha già deciso su questa proposta", code: "locked" },
        { status: 409 }
      );
    }

    const { content: rawContent, showAuthor, ...rest } = parsed.data;
    const fields = staffEdit ? rest : { ...rest, showAuthor };
    const court = fields.court ?? existing.court;
    const contentResult = drillContentSchema(court).safeParse(rawContent ?? existing.content);
    if (!contentResult.success) {
      return NextResponse.json(
        {
          error:
            rawContent === undefined && fields.court
              ? "Prima porta tutti i pezzi nella metà campo di destra"
              : (contentResult.error.issues[0]?.message ?? "Disegno non valido"),
          code: rawContent === undefined && fields.court ? "halfCourt" : "content",
        },
        { status: 400 }
      );
    }

    const description =
      fields.description === undefined ? existing.description : fields.description;
    const updateSuggestion =
      existing.suggestionId && fields.description !== undefined && description;
    const [drill] = await prisma.$transaction([
      prisma.drill.update({
        where: { id },
        data: {
          ...fields,
          content: contentResult.data as unknown as Prisma.InputJsonValue,
          updatedById: who.actorId,
        },
        select: { id: true, updatedAt: true },
      }),
      ...(updateSuggestion
        ? [
            prisma.suggestion.update({
              where: { id: existing.suggestionId! },
              data: { message: description },
            }),
          ]
        : []),
    ]);
    if (staffEdit) {
      auditDrill({
        actorId: who.actorId,
        action: "UPDATE_DRILL",
        targetId: id,
        after: { proposal: true, ...(fields.title ? { title: fields.title } : {}) },
      });
    }
    return NextResponse.json({ id: drill.id, updatedAt: drill.updatedAt.toISOString() });
  } catch (err) {
    console.error("[playbook] modifica proposta", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

/**
 * DELETE — l'autore ritira la sua proposta finche' non e' adottata: si
 * cancellano l'esercizio e il suggerimento collegato, con le sue note.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const who = await memberActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  try {
    const existing = await prisma.drill.findUnique({ where: { id }, select: PROPOSAL_FIELDS });
    if (!existing || existing.createdById !== who.actorId) return notFound();
    if (!canWithdrawProposal(existing, who.actorId)) {
      return NextResponse.json(
        { error: "Lo staff ha già preso questo esercizio", code: "locked" },
        { status: 409 }
      );
    }
    await prisma.$transaction([
      prisma.drill.delete({ where: { id } }),
      ...(existing.suggestionId
        ? [prisma.suggestion.deleteMany({ where: { id: existing.suggestionId } })]
        : []),
    ]);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[playbook] ritira proposta", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { memberActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { EMPTY_DRILL_CONTENT, ProposalCreateSchema } from "@/lib/schemas/drill";
import { freeDrillSlug } from "@/lib/board/drillAdmin";
import { loadMyProposals } from "@/lib/board/loadProposals";
import { MAX_PENDING_PROPOSALS, pendingProposalsWhere } from "@/lib/board/proposals";

/**
 * GET — le proprie proposte di esercizi (UX-73), con il disegno. Solo i
 * tesserati, e solo le proprie: le risposte dello staff si leggono in
 * `/profilo/suggerimenti`.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!isMemberRole(session.user.appRole)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  return NextResponse.json(await loadMyProposals(session.user.id));
}

/**
 * POST — nuova proposta, una bozza dell'autore con un passo vuoto. Solo
 * esercizi (lo schema rifiuta i tipi degli schemi), al massimo
 * `MAX_PENDING_PROPOSALS` in attesa per persona.
 */
export async function POST(req: NextRequest) {
  const who = await memberActor();
  if ("error" in who) return who.error;

  const rl = checkRateLimit(getClientIp(req), `drill-proposal-${who.actorId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const parsed = ProposalCreateSchema.safeParse(await req.json().catch(() => null));
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
    const pending = await prisma.drill.count({ where: pendingProposalsWhere(who.actorId) });
    if (pending >= MAX_PENDING_PROPOSALS) {
      return NextResponse.json(
        {
          error: `Hai già ${MAX_PENDING_PROPOSALS} proposte in attesa: aspetta che lo staff le guardi, o ritirane una.`,
          code: "limit",
        },
        { status: 409 }
      );
    }

    const { showAuthor, ...fields } = parsed.data;
    const drill = await prisma.drill.create({
      data: {
        ...fields,
        status: "PROPOSED",
        showAuthor: showAuthor ?? true,
        slug: await freeDrillSlug(fields.title),
        content: EMPTY_DRILL_CONTENT as unknown as Prisma.InputJsonValue,
        createdById: who.actorId,
        updatedById: who.actorId,
      },
      select: { id: true },
    });
    return NextResponse.json(drill, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Riprova: titolo già usato" }, { status: 409 });
    }
    console.error("[playbook] nuova proposta", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { staffActor } from "@/lib/apiAuth";
import { inBackground } from "@/lib/background";
import { prisma } from "@/lib/db";
import { deliverNotices } from "@/lib/notifications/matchNotify";
import { auditDrill } from "@/lib/board/drillAdmin";
import { canAdoptProposal } from "@/lib/board/proposals";
import { ADOPTION_REPLY, proposalAdoptedNotice } from "@/lib/board/proposalNotify";

/**
 * POST — lo staff adotta una proposta di esercizio (UX-73): diventa una bozza
 * dello staff (`DRAFT`, `adoptedAt`; `createdById` resta l'autore), che lo
 * staff sistema e pubblica quando vuole. Sul filo del suggerimento va una
 * risposta automatica all'autore. Anche una proposta messa da parte si adotta.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const who = await staffActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  try {
    const drill = await prisma.drill.findUnique({
      where: { id },
      select: {
        title: true,
        status: true,
        createdById: true,
        proposedAt: true,
        adoptedAt: true,
        archivedAt: true,
        suggestionId: true,
      },
    });
    if (!drill || drill.status !== "PROPOSED" || !drill.proposedAt) {
      return NextResponse.json({ error: "Proposta non trovata" }, { status: 404 });
    }
    if (!canAdoptProposal(drill)) {
      return NextResponse.json({ error: "Proposta già adottata" }, { status: 409 });
    }

    const adopted = await prisma.$transaction(async (tx) => {
      const claimed = await tx.drill.updateMany({
        where: { id, status: "PROPOSED", adoptedAt: null },
        data: {
          status: "DRAFT",
          adoptedAt: new Date(),
          archivedAt: null,
          updatedById: who.actorId,
        },
      });
      if (claimed.count === 0) return false;
      if (drill.suggestionId && drill.createdById) {
        await tx.suggestionNote.create({
          data: {
            suggestionId: drill.suggestionId,
            authorId: who.actorId,
            body: ADOPTION_REPLY,
            isReply: true,
          },
        });
      }
      if (drill.suggestionId) {
        await tx.suggestion.update({
          where: { id: drill.suggestionId },
          data: { status: "LETTO" },
        });
      }
      return true;
    });
    if (!adopted) {
      return NextResponse.json({ error: "Proposta già adottata" }, { status: 409 });
    }

    auditDrill({
      actorId: who.actorId,
      action: "ADOPT_DRILL",
      targetId: id,
      after: { title: drill.title },
    });
    const notice = proposalAdoptedNotice({
      authorId: drill.createdById,
      actorId: who.actorId,
      suggestionId: drill.suggestionId,
    });
    if (notice)
      inBackground(deliverNotices([notice], "drill adopted"), "notification drill adopted");
    return NextResponse.json({ id, adopted: true });
  } catch (err) {
    console.error("[playbook] adotta", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

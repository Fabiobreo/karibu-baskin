import { NextRequest, NextResponse } from "next/server";
import { memberActor } from "@/lib/apiAuth";
import { inBackground } from "@/lib/background";
import { prisma } from "@/lib/db";
import { deliverNotices } from "@/lib/notifications/matchNotify";
import { staffUserIds } from "@/lib/notifications/recipients";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { parseDrillContent } from "@/lib/schemas/drill";
import { canSubmitProposal } from "@/lib/board/proposals";
import { proposalSubmittedNotice } from "@/lib/board/proposalNotify";

/** Il testo del suggerimento collegato deve avere almeno tanti caratteri. */
const MIN_DESCRIPTION = 5;

/**
 * POST — l'autore invia la sua bozza allo staff (UX-73): l'esercizio prende
 * `proposedAt` e nasce il suggerimento collegato (categoria `ESERCIZIO`, testo
 * = descrizione), per il filo di note e risposte. Allo staff arriva l'avviso
 * dei suggerimenti, con il nome: le proposte sono firmate.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const who = await memberActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  const rl = checkRateLimit(getClientIp(req), `drill-proposal-submit-${who.actorId}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  try {
    const drill = await prisma.drill.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        court: true,
        content: true,
        description: true,
        status: true,
        createdById: true,
        proposedAt: true,
        adoptedAt: true,
        archivedAt: true,
      },
    });
    if (!drill || drill.createdById !== who.actorId || drill.status !== "PROPOSED") {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    if (!canSubmitProposal(drill, who.actorId)) {
      return NextResponse.json(
        { error: "Questa proposta è già stata inviata", code: "alreadySent" },
        { status: 409 }
      );
    }
    const content = parseDrillContent(drill.content, drill.court);
    if (!content || content.pieces.length === 0) {
      return NextResponse.json(
        { error: "Metti almeno un pezzo in campo prima di inviare", code: "empty" },
        { status: 409 }
      );
    }
    const description = drill.description?.trim() ?? "";
    if (description.length < MIN_DESCRIPTION) {
      return NextResponse.json(
        { error: "Scrivi due righe su come si fa prima di inviare", code: "noDescription" },
        { status: 409 }
      );
    }

    // Solo se e' ancora una bozza: due invii insieme non creano due suggerimenti.
    const sent = await prisma.$transaction(async (tx) => {
      const claimed = await tx.drill.updateMany({
        where: { id, proposedAt: null, status: "PROPOSED" },
        data: { proposedAt: new Date(), updatedById: who.actorId },
      });
      if (claimed.count === 0) return false;
      const suggestion = await tx.suggestion.create({
        data: { category: "ESERCIZIO", message: description, userId: who.actorId },
        select: { id: true },
      });
      await tx.drill.update({ where: { id }, data: { suggestionId: suggestion.id } });
      return true;
    });
    if (!sent) {
      return NextResponse.json(
        { error: "Questa proposta è già stata inviata", code: "alreadySent" },
        { status: 409 }
      );
    }

    inBackground(
      (async () => {
        const notice = proposalSubmittedNotice(
          { drillId: id, title: drill.title, authorId: who.actorId, authorName: who.name },
          await staffUserIds()
        );
        if (notice) await deliverNotices([notice], "drill proposal");
      })(),
      "notification drill proposal"
    );
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[playbook] invia proposta", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

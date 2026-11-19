import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { staffActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { auditDrill, freeDrillSlug } from "@/lib/board/drillAdmin";

const MAX_TITLE = 80;

/** POST — copia di uno schema, in bozza, con "(copia)" nel titolo. Staff. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const who = await staffActor();
  if ("error" in who) return who.error;
  const { id } = await params;

  try {
    // Le proposte dei tesserati (UX-73) si adottano, non si copiano.
    const source = await prisma.drill.findFirst({
      where: { id, status: { not: "PROPOSED" } },
      select: {
        title: true,
        kind: true,
        court: true,
        description: true,
        durationMin: true,
        competitiveTeamId: true,
        content: true,
      },
    });
    if (!source) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

    const suffix = " (copia)";
    const title = source.title.slice(0, MAX_TITLE - suffix.length) + suffix;
    const drill = await prisma.drill.create({
      data: {
        ...source,
        content: source.content as Prisma.InputJsonValue,
        title,
        slug: await freeDrillSlug(title),
        createdById: who.actorId,
        updatedById: who.actorId,
      },
      select: { id: true, slug: true, title: true },
    });
    auditDrill({
      actorId: who.actorId,
      action: "CREATE_DRILL",
      targetId: drill.id,
      after: { title, copiedFrom: id },
    });
    return NextResponse.json(drill, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Riprova: titolo già usato" }, { status: 409 });
    }
    console.error("[playbook] duplica", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

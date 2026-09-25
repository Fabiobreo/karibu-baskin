import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

/**
 * Presenze di un allenamento salvate tutte insieme (UX-13): la chiusura
 * dell'allenamento in admin raccoglie presenti e assenti in locale e li manda
 * con un solo salvataggio. `attended: null` = non segnato.
 */
const AttendanceBulkSchema = z.object({
  attendance: z
    .array(
      z.object({
        regId: z.string().min(1),
        attended: z.boolean().nullable(),
      })
    )
    .min(1)
    .max(200),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { sessionId } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = AttendanceBulkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const items = parsed.data.attendance;

  try {
    // Solo iscrizioni di questo allenamento: un id di un altro allenamento non
    // deve passare di qui.
    const ids = [...new Set(items.map((i) => i.regId))];
    const owned = await prisma.registration.findMany({
      where: { id: { in: ids }, sessionId },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json(
        { error: "Una o piu' iscrizioni non appartengono a questo allenamento" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      items.map((i) =>
        prisma.registration.update({
          where: { id: i.regId },
          data: { attended: i.attended },
        })
      )
    );
    return NextResponse.json({ updated: items.length });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Errore nel salvataggio delle presenze" }, { status: 500 });
    }
    throw err;
  }
}

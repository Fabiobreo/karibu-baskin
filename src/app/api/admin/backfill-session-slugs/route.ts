import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { format } from "date-fns";

// POST — assegna dateSlug a tutti gli allenamenti che non ce l'hanno (solo admin)
export async function POST() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const sessions = await prisma.trainingSession.findMany({
    where: { dateSlug: null },
    select: { id: true, date: true },
  });

  if (sessions.length === 0) {
    return NextResponse.json({ updated: 0, message: "Nessun allenamento da aggiornare" });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const s of sessions) {
    const candidate = format(new Date(s.date), "yyyyMMddHHmm");

    // Controlla collisioni
    const existing = await prisma.trainingSession.findFirst({
      where: { dateSlug: candidate, id: { not: s.id } },
    });

    const slug = existing ? `${candidate}-${s.id.slice(0, 6)}` : candidate;

    try {
      await prisma.trainingSession.update({
        where: { id: s.id },
        data: { dateSlug: slug },
      });
      updated++;
    } catch {
      errors.push(s.id);
    }
  }

  return NextResponse.json({
    updated,
    total: sessions.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Aggiornati ${updated}/${sessions.length} allenamenti`,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { inBackground } from "@/lib/background";
import { reconcileTrainingBadges } from "@/lib/rating/trainingBadges";

const AttendanceSchema = z.object({
  attended: z.boolean().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ regId: string }> }) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { regId } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = AttendanceSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valore non valido" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: regId },
    select: { id: true, sessionId: true },
  });
  if (!registration) {
    return NextResponse.json({ error: "Iscrizione non trovata" }, { status: 404 });
  }

  const updated = await prisma.registration.update({
    where: { id: regId },
    data: { attended: parsed.data.attended },
    select: { id: true, attended: true },
  });
  // Traguardi di costanza (UX-59), dopo la risposta.
  if (updated.attended === true) {
    inBackground(reconcileTrainingBadges(registration.sessionId), "badges allenamento");
  }

  return NextResponse.json(updated);
}

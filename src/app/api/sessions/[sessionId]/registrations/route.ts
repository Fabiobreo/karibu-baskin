import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { StaffRegistrationCreateSchema } from "@/lib/schemas";

type Params = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/registrations — lo staff iscrive una persona.
//
// A differenza di POST /api/registrations (l'iscrizione che fa l'atleta) qui
// non valgono né la finestra temporale né l'apertura delle iscrizioni né le
// restrizioni di ruolo o squadra: serve a ricostruire chi c'era, anche mesi
// dopo. Restano i controlli sui doppioni. Le squadre già generate non si
// toccano: la pagina dell'allenamento segnala da sola che vanno ricreate.
// Per togliere qualcuno si usa DELETE /api/registrations/[regId].
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { sessionId } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = StaffRegistrationCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { userId, childId, role, attended } = parsed.data;

  const training = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!training) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  let name: string;
  let profileRole: number | null;
  // Per i doppioni: la stessa persona può comparire come utente o come figlio
  // (figlio con account collegato).
  let duplicateWhere: Prisma.RegistrationWhereInput[];

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, sportRole: true, childAccount: { select: { id: true } } },
    });
    if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    name = user.name?.trim() || user.email;
    profileRole = user.sportRole;
    duplicateWhere = [{ userId }];
    if (user.childAccount) duplicateWhere.push({ childId: user.childAccount.id });
  } else {
    const child = await prisma.child.findUnique({
      where: { id: childId! },
      select: { name: true, sportRole: true, userId: true },
    });
    if (!child) return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
    name = child.name;
    profileRole = child.sportRole;
    duplicateWhere = [{ childId }];
    if (child.userId) duplicateWhere.push({ userId: child.userId });
  }

  const effectiveRole = profileRole ?? role;
  if (!effectiveRole) {
    return NextResponse.json(
      { error: `${name} non ha un ruolo Baskin: sceglilo per iscriverlo` },
      { status: 400 }
    );
  }

  const existing = await prisma.registration.findFirst({
    where: { sessionId, OR: duplicateWhere },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: `${name} è già iscritto` }, { status: 409 });
  }

  try {
    const registration = await prisma.registration.create({
      data: {
        sessionId,
        name,
        role: effectiveRole,
        userId: userId ?? null,
        childId: childId ?? null,
        attended: attended ?? null,
      },
      select: { id: true, name: true, role: true, attended: true, userId: true, childId: true },
    });

    logAudit({
      actorId: session.user.id,
      action: "ADD_REGISTRATION",
      targetType: "Registration",
      targetId: registration.id,
      after: { sessionId, userId, childId, name, role: effectiveRole, attended },
    }).catch((err) => console.error("[audit] add registration", err));

    return NextResponse.json(registration, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: `${name} è già iscritto` }, { status: 409 });
    }
    console.error("[sessions/registrations] create", err);
    return NextResponse.json({ error: "Errore durante l'iscrizione" }, { status: 500 });
  }
}

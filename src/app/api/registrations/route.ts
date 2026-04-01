import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { auth } from "@/lib/authjs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 });
  }

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(registrations);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId, role, name: bodyName, roleVariant } = body as {
    sessionId?: string;
    role?: number;
    name?: string;
    roleVariant?: string;
  };

  if (!sessionId || !role) {
    return NextResponse.json(
      { error: "sessionId e ruolo sono obbligatori" },
      { status: 400 }
    );
  }

  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Ruolo non valido (1-5)" }, { status: 400 });
  }

  const trainingSession = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!trainingSession) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  // Controlla se l'utente è autenticato
  const authSession = await auth();
  const userId = authSession?.user?.id ?? null;

  let name: string;

  if (userId) {
    // Utente loggato: recupera nome dal profilo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, appRole: true, sportRoleSuggested: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    name = user.name?.trim() || (bodyName?.trim() ?? "");
    if (!name) {
      return NextResponse.json({ error: "Nome utente non disponibile" }, { status: 400 });
    }

    // Controlla se già iscritto tramite userId
    const existing = await prisma.registration.findFirst({
      where: { sessionId, userId },
    });
    if (existing) {
      return NextResponse.json({ error: "Sei già iscritto a questo allenamento" }, { status: 409 });
    }

    // Per gli utenti GUEST senza ruolo confermato: salva il suggerimento
    if (user.appRole === "GUEST" && !user.sportRoleSuggested) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          sportRoleSuggested: role,
          sportRoleSuggestedVariant: roleVariant ?? null,
        },
      });
    }

    try {
      const registration = await prisma.registration.create({
        data: { sessionId, name: name.slice(0, 60), role, userId },
      });
      return NextResponse.json(registration, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        return NextResponse.json({ error: "Sei già iscritto a questo allenamento" }, { status: 409 });
      }
      throw err;
    }
  } else {
    // Utente anonimo: nome obbligatorio dal body
    const trimmedName = bodyName?.trim().slice(0, 60) ?? "";
    if (!trimmedName) {
      return NextResponse.json({ error: "Nome obbligatorio per gli utenti non registrati" }, { status: 400 });
    }

    // Controlla duplicato per nome (solo per anonimi)
    const existing = await prisma.registration.findFirst({
      where: { sessionId, name: { equals: trimmedName, mode: "insensitive" }, userId: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Questo nome è già iscritto all'allenamento" }, { status: 409 });
    }

    try {
      const registration = await prisma.registration.create({
        data: { sessionId, name: trimmedName, role },
      });
      return NextResponse.json(registration, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        return NextResponse.json({ error: "Questo nome è già iscritto all'allenamento" }, { status: 409 });
      }
      throw err;
    }
  }
}

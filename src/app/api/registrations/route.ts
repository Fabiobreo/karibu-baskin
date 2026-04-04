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
  const { sessionId, role, name: bodyName, roleVariant, childId } = body as {
    sessionId?: string;
    role?: number;
    name?: string;
    roleVariant?: string;
    childId?: string;
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

  const sessionEnd = trainingSession.endTime
    ?? new Date(trainingSession.date.getTime() + 2 * 60 * 60 * 1000);
  if (new Date() > sessionEnd) {
    return NextResponse.json({ error: "Le iscrizioni per questo allenamento sono chiuse" }, { status: 400 });
  }

  const authSession = await auth();
  const userId = authSession?.user?.id ?? null;

  // ── Iscrizione figlio (genitore loggato) ────────────────────────────────────
  if (childId) {
    if (!userId) {
      return NextResponse.json({ error: "Devi essere autenticato per iscrivere un figlio" }, { status: 401 });
    }

    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      return NextResponse.json({ error: "Figlio non trovato" }, { status: 404 });
    }
    if (child.parentId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const existing = await prisma.registration.findFirst({ where: { sessionId, childId } });
    if (existing) {
      return NextResponse.json({ error: `${child.name} è già iscritto a questo allenamento` }, { status: 409 });
    }

    // Se il figlio ha un account collegato, controlla che non si sia già iscritto da solo
    if (child.userId) {
      const accountReg = await prisma.registration.findFirst({ where: { sessionId, userId: child.userId } });
      if (accountReg) {
        return NextResponse.json({ error: `${child.name} è già iscritto con il proprio account` }, { status: 409 });
      }
    }

    // Usa il ruolo confermato del figlio se disponibile, altrimenti quello scelto dal form
    const effectiveRole = child.sportRole ?? role;

    // Se il figlio non ha ancora un ruolo confermato, salva il ruolo scelto come proposta
    if (!child.sportRole) {
      await prisma.child.update({
        where: { id: childId },
        data: { sportRole: role, sportRoleVariant: roleVariant ?? null },
      });
    }

    try {
      const registration = await prisma.registration.create({
        data: { sessionId, name: child.name, role: effectiveRole, childId },
      });
      return NextResponse.json(registration, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        return NextResponse.json({ error: `${child.name} è già iscritto a questo allenamento` }, { status: 409 });
      }
      throw err;
    }
  }

  // ── Iscrizione utente loggato ───────────────────────────────────────────────
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, appRole: true, sportRole: true, sportRoleSuggested: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const name = user.name?.trim() || (bodyName?.trim() ?? "");
    if (!name) {
      return NextResponse.json({ error: "Nome utente non disponibile" }, { status: 400 });
    }

    const existing = await prisma.registration.findFirst({ where: { sessionId, userId } });
    if (existing) {
      return NextResponse.json({ error: "Sei già iscritto a questo allenamento" }, { status: 409 });
    }

    // Se l'utente è collegato come figlio di qualcuno, controlla che non sia già iscritto via childId
    const linkedChild = await prisma.child.findUnique({ where: { userId } });
    if (linkedChild) {
      const childReg = await prisma.registration.findFirst({ where: { sessionId, childId: linkedChild.id } });
      if (childReg) {
        return NextResponse.json({ error: "Sei già iscritto a questo allenamento (tramite il tuo genitore)" }, { status: 409 });
      }
    }

    if (!user.sportRole) {
      await prisma.user.update({
        where: { id: userId },
        data: { sportRoleSuggested: role, sportRoleSuggestedVariant: roleVariant ?? null },
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
  }

  // ── Iscrizione anonima ──────────────────────────────────────────────────────
  const trimmedName = bodyName?.trim().slice(0, 60) ?? "";
  if (!trimmedName) {
    return NextResponse.json({ error: "Nome obbligatorio per gli utenti non registrati" }, { status: 400 });
  }

  const existing = await prisma.registration.findFirst({
    where: { sessionId, name: { equals: trimmedName, mode: "insensitive" }, userId: null, childId: null },
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

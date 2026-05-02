import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRegistrationAllowed } from "@/lib/registrationRestrictions";
import { RegistrationPostSchema, RegistrationPatchSchema } from "@/lib/schemas/registration";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 });
  }

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { slug: true } } },
  });

  return NextResponse.json(
    registrations.map(({ user, ...r }) => ({ ...r, userSlug: user?.slug ?? null }))
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, "registrations", 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche secondo." }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = RegistrationPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const { sessionId, role, name: bodyName, roleVariant, childId, note, anonymousEmail, registeredAsCoach } = parsed.data;

  const trimmedNote = note?.trim().slice(0, 300) || null;

  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      date: true,
      endTime: true,
      allowedRoles: true,
      restrictTeamId: true,
      openRoles: true,
    },
  });
  if (!trainingSession) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  const sessionEnd = trainingSession.endTime
    ?? new Date(trainingSession.date.getTime() + 2 * 60 * 60 * 1000);
  if (new Date() > sessionEnd) {
    return NextResponse.json({ error: "Le iscrizioni per questo allenamento sono chiuse" }, { status: 400 });
  }

  const restrictions = {
    allowedRoles: trainingSession.allowedRoles,
    restrictTeamId: trainingSession.restrictTeamId,
    openRoles: trainingSession.openRoles,
  };

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

    // Usa il ruolo confermato del figlio se disponibile, altrimenti quello scelto dal form
    const effectiveRole = child.sportRole ?? role;

    // Controllo restrizioni
    const parent = await prisma.user.findUnique({ where: { id: userId }, select: { appRole: true } });
    if (parent?.appRole !== "COACH" && parent?.appRole !== "ADMIN") {
      let isInRestrictedTeam = false;
      if (restrictions.restrictTeamId) {
        const membership = await prisma.teamMembership.findFirst({
          where: { teamId: restrictions.restrictTeamId, childId },
        });
        isInRestrictedTeam = !!membership;
      }
      const check = checkRegistrationAllowed(restrictions, "ATHLETE", effectiveRole, isInRestrictedTeam);
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason ?? "Iscrizione non consentita per questo allenamento" }, { status: 403 });
      }
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

    try {
      const registration = await prisma.$transaction(async (tx) => {
        // Se il figlio non ha ancora un ruolo confermato, salva il ruolo scelto come proposta
        if (!child.sportRole) {
          await tx.child.update({
            where: { id: childId },
            data: { sportRole: role, sportRoleVariant: roleVariant ?? null },
          });
        }
        return tx.registration.create({
          data: { sessionId, name: child.name, role: effectiveRole, childId, note: trimmedNote },
        });
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

    // Controllo restrizioni (COACH/ADMIN/GUEST bypassati dentro checkRegistrationAllowed)
    const effectiveRole = user.sportRole ?? role;
    let isInRestrictedTeam = false;
    if (restrictions.restrictTeamId) {
      const membership = await prisma.teamMembership.findFirst({
        where: { teamId: restrictions.restrictTeamId, userId },
      });
      isInRestrictedTeam = !!membership;
    }
    const check = checkRegistrationAllowed(restrictions, user.appRole, effectiveRole, isInRestrictedTeam, registeredAsCoach ?? false);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason ?? "Iscrizione non consentita per questo allenamento" }, { status: 403 });
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

    try {
      const registration = await prisma.$transaction(async (tx) => {
        if (!user.sportRole) {
          await tx.user.update({
            where: { id: userId },
            data: { sportRoleSuggested: role, sportRoleSuggestedVariant: roleVariant ?? null },
          });
        }
        return tx.registration.create({
          data: { sessionId, name: name.slice(0, 60), role, userId, note: trimmedNote, registeredAsCoach: registeredAsCoach ?? false },
        });
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
  // Utenti anonimi non possono iscriversi se ci sono restrizioni
  const anonCheck = checkRegistrationAllowed(restrictions, null, role, false);
  if (!anonCheck.allowed) {
    return NextResponse.json({ error: anonCheck.reason ?? "Iscrizione non consentita per questo allenamento" }, { status: 403 });
  }

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

  const trimmedEmail = anonymousEmail?.trim().toLowerCase().slice(0, 254) || null;

  try {
    const registration = await prisma.registration.create({
      data: { sessionId, name: trimmedName, role, note: trimmedNote, anonymousEmail: trimmedEmail },
    });
    return NextResponse.json(registration, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Questo nome è già iscritto all'allenamento" }, { status: 409 });
    }
    throw err;
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const rawPatch = await req.json().catch(() => null);
  const parsedPatch = RegistrationPatchSchema.safeParse(rawPatch);
  if (!parsedPatch.success) {
    return NextResponse.json({ error: parsedPatch.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsedPatch.data;

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if ("anonymousEmail" in body) data.anonymousEmail = body.anonymousEmail?.trim() || null;
  if (body.role !== undefined) data.role = body.role;

  await prisma.registration.updateMany({
    where: { id: { in: body.ids }, userId: null, childId: null },
    data,
  });

  return NextResponse.json({ updated: body.ids.length });
}

export async function DELETE(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("name");
  if (!name?.trim()) {
    return NextResponse.json({ error: "name richiesto" }, { status: 400 });
  }

  // Trova tutte le iscrizioni anonime con questo nome (case-insensitive)
  const regs = await prisma.registration.findMany({
    where: { userId: null, childId: null, name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true, sessionId: true },
  });

  if (regs.length === 0) return new NextResponse(null, { status: 204 });

  const sessionIds = [...new Set(regs.map((r) => r.sessionId))];

  await prisma.registration.deleteMany({ where: { id: { in: regs.map((r) => r.id) } } });

  // Azzera le squadre generate degli allenamenti coinvolti
  await prisma.trainingSession.updateMany({
    where: { id: { in: sessionIds } },
    data: { teams: Prisma.DbNull },
  });

  return new NextResponse(null, { status: 204 });
}

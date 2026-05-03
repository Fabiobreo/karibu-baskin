import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { AppRole, Gender } from "@prisma/client";
import { isAdminUser } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { sendPushToUser } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { ROLE_LABELS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { VALID_APP_ROLES, VALID_GENDERS, VALID_SPORT_ROLES, VALID_SPORT_ROLE_VARIANTS } from "@/lib/validators";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const actorSession = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await req.json().catch(() => ({})) as {
    appRole?: AppRole;
    sportRole?: number | null;
    sportRoleVariant?: string | null;
    gender?: Gender | null;
    birthDate?: string | null;
  };

  const data: Record<string, unknown> = {};

  if (body.appRole !== undefined) {
    if (!VALID_APP_ROLES.includes(body.appRole)) {
      return NextResponse.json({ error: "Ruolo app non valido" }, { status: 400 });
    }
    data.appRole = body.appRole;
  }

  if (body.gender !== undefined) {
    if (body.gender !== null && !VALID_GENDERS.includes(body.gender)) {
      return NextResponse.json({ error: "Genere non valido" }, { status: 400 });
    }
    data.gender = body.gender ?? null;
  }

  if (body.birthDate !== undefined) {
    data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  }

  if (body.sportRoleVariant !== undefined) {
    if (body.sportRoleVariant !== null && !VALID_SPORT_ROLE_VARIANTS.includes(body.sportRoleVariant)) {
      return NextResponse.json({ error: "Variante ruolo non valida" }, { status: 400 });
    }
    data.sportRoleVariant = body.sportRoleVariant ?? null;
  }

  // sportRole: se cambia, registra nello storico
  let roleConfirmed = false;
  let prevSportRole: number | null = null;
  if (body.sportRole !== undefined) {
    if (body.sportRole !== null && !VALID_SPORT_ROLES.includes(body.sportRole)) {
      return NextResponse.json({ error: "Ruolo sportivo non valido" }, { status: 400 });
    }
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { sportRole: true } });
    prevSportRole = current?.sportRole ?? null;
    if (current && current.sportRole !== body.sportRole && body.sportRole !== null) {
      await prisma.sportRoleHistory.create({
        data: { userId, sportRole: body.sportRole },
      });
      roleConfirmed = true;
    }
    data.sportRole = body.sportRole ?? null;
    // Quando il ruolo sportivo viene confermato, cancella il suggerimento
    if (body.sportRole !== null) {
      data.sportRoleSuggested = null;
      data.sportRoleSuggestedVariant = null;
    }
  }

  let user;
  try {
    user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, email: true, appRole: true,
        sportRole: true, sportRoleVariant: true, gender: true, birthDate: true,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }
    throw err;
  }

  // Audit log
  const actorId = actorSession?.user?.id;
  if (actorId) {
    const actions: Array<{ action: Parameters<typeof logAudit>[0]["action"]; before?: Record<string, unknown>; after?: Record<string, unknown> }> = [];
    if (body.appRole !== undefined) actions.push({ action: "UPDATE_ROLE", before: { appRole: data.appRole }, after: { appRole: user.appRole } });
    if (body.sportRole !== undefined) actions.push({ action: "UPDATE_SPORT_ROLE", before: { sportRole: prevSportRole }, after: { sportRole: user.sportRole } });
    for (const entry of actions) {
      logAudit({ actorId, action: entry.action, targetType: "User", targetId: userId, before: entry.before, after: entry.after }).catch((err) => console.error("[audit] update user", err));
    }
  }

  // 3.4 — notifica all'utente quando il suo ruolo sportivo viene confermato/aggiornato
  if (roleConfirmed && body.sportRole !== null && body.sportRole !== undefined) {
    const roleName = ROLE_LABELS[body.sportRole as keyof typeof ROLE_LABELS] ?? `Ruolo ${body.sportRole}`;
    const isFirstTime = prevSportRole === null;
    const notifPayload = {
      title: isFirstTime ? "Ruolo sportivo assegnato" : "Ruolo sportivo aggiornato",
      body: isFirstTime
        ? `Il tuo ruolo Baskin è stato impostato: ${roleName}.`
        : `Il tuo ruolo Baskin è cambiato in: ${roleName}.`,
      url: "/profilo",
    };
    sendPushToUser(userId, notifPayload).catch((err) => console.error("[push] sport role update", err));
    createAppNotification({ type: "SYSTEM", targetUserId: userId, ...notifPayload }).catch((err) => console.error("[notification] sport role update", err));
  }

  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { userId } = await params;

  // Impedisce all'admin di cancellare se stesso
  const session = await auth();
  if (session?.user?.id === userId) {
    return NextResponse.json({ error: "Non puoi eliminare il tuo account" }, { status: 400 });
  }

  const deleted = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, appRole: true } });
  if (!deleted) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }
  await prisma.user.delete({ where: { id: userId } });

  if (session?.user?.id) {
    logAudit({ actorId: session.user.id, action: "DELETE_USER", targetType: "User", targetId: userId, before: deleted ?? undefined }).catch((err) => console.error("[audit] delete user", err));
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { AppRole, AthleteStatus, Gender } from "@prisma/client";
import { isAdminUser, isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { canAssignAppRole } from "@/lib/authRoles";
import { sendPushToUser } from "@/lib/notifications/webpush";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { ROLE_LABELS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { recomputeRatings } from "@/lib/rating/ratingEngine";
import { generateUserSlug } from "@/lib/slugUtils";
import {
  VALID_APP_ROLES,
  VALID_ATHLETE_STATUSES,
  VALID_GENDERS,
  VALID_SPORT_ROLES,
  VALID_SPORT_ROLE_VARIANTS,
} from "@/lib/validators";
import { deleteUserAndOrphanedChildren } from "@/lib/guardians";
import { inBackground } from "@/lib/background";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const actorSession = await auth();
  const isAdmin = await isAdminUser();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { userId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    appRole?: AppRole;
    sportRole?: number | null;
    sportRoleVariant?: string | null;
    gender?: Gender | null;
    birthDate?: string | null;
    name?: string;
    email?: string;
    clearRoleSuggestion?: boolean;
    athleteStatus?: AthleteStatus | null;
  };

  const data: Record<string, unknown> = {};

  let prevAppRole: AppRole | null = null;
  if (body.appRole !== undefined) {
    if (!VALID_APP_ROLES.includes(body.appRole)) {
      return NextResponse.json({ error: "Ruolo app non valido" }, { status: 400 });
    }
    const cur = await prisma.user.findUnique({ where: { id: userId }, select: { appRole: true } });
    if (!cur) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    // L'allenatore approva solo i nuovi account; il resto è dell'admin, e
    // nessuno cambia il proprio ruolo (regola in `canAssignAppRole`).
    const allowed = canAssignAppRole({
      actorRole: isAdmin ? "ADMIN" : "COACH",
      isSelf: actorSession?.user?.id === userId,
      current: cur.appRole,
      next: body.appRole,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Non puoi assegnare questo ruolo" }, { status: 403 });
    }
    prevAppRole = cur.appRole;
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

  if (body.athleteStatus !== undefined) {
    if (body.athleteStatus !== null && !VALID_ATHLETE_STATUSES.includes(body.athleteStatus)) {
      return NextResponse.json({ error: "Stato atleta non valido" }, { status: 400 });
    }
    data.athleteStatus = body.athleteStatus ?? null;
  }

  if (body.name !== undefined && isAdmin) {
    const trimmed = body.name.trim().slice(0, 100);
    if (trimmed) {
      data.name = trimmed;
      // Se l'utente non ha ancora uno slug (pre-creato dall'admin e mai
      // loggato) lo genera ora, altrimenti il profilo pubblico resta
      // raggiungibile solo via id. Uno slug esistente non viene mai
      // riscritto: gli URL già condivisi devono restare validi.
      const cur = await prisma.user.findUnique({
        where: { id: userId },
        select: { slug: true },
      });
      if (cur && !cur.slug) {
        const generated = await generateUserSlug(trimmed);
        if (generated) data.slug = generated;
      }
    }
  }

  if (body.email !== undefined && isAdmin) {
    const trimmed = body.email.trim().toLowerCase();
    if (trimmed) {
      const conflict = await prisma.user.findFirst({
        where: { email: trimmed, NOT: { id: userId } },
      });
      if (conflict) return NextResponse.json({ error: "Email già in uso" }, { status: 409 });
      data.email = trimmed;
    }
  }

  if (body.clearRoleSuggestion) {
    data.sportRoleSuggested = null;
    data.sportRoleSuggestedVariant = null;
  }

  if (body.sportRoleVariant !== undefined) {
    if (
      body.sportRoleVariant !== null &&
      !VALID_SPORT_ROLE_VARIANTS.includes(body.sportRoleVariant)
    ) {
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
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { sportRole: true },
    });
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
        id: true,
        name: true,
        email: true,
        appRole: true,
        sportRole: true,
        sportRoleVariant: true,
        sportRoleSuggested: true,
        sportRoleSuggestedVariant: true,
        gender: true,
        birthDate: true,
        athleteStatus: true,
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
    const actions: Array<{
      action: Parameters<typeof logAudit>[0]["action"];
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    }> = [];
    if (body.appRole !== undefined)
      actions.push({
        action: "UPDATE_ROLE",
        before: { appRole: prevAppRole },
        after: { appRole: user.appRole },
      });
    if (body.sportRole !== undefined)
      actions.push({
        action: "UPDATE_SPORT_ROLE",
        before: { sportRole: prevSportRole },
        after: { sportRole: user.sportRole },
      });
    for (const entry of actions) {
      inBackground(
        logAudit({
          actorId,
          action: entry.action,
          targetType: "User",
          targetId: userId,
          before: entry.before,
          after: entry.after,
        }),
        "audit update user"
      );
    }
  }

  // 3.4 — notifica all'utente quando il suo ruolo sportivo viene confermato/aggiornato
  if (roleConfirmed && body.sportRole !== null && body.sportRole !== undefined) {
    const roleName =
      ROLE_LABELS[body.sportRole as keyof typeof ROLE_LABELS] ?? `Ruolo ${body.sportRole}`;
    const isFirstTime = prevSportRole === null;
    const notifPayload = {
      title: isFirstTime ? "Ruolo sportivo assegnato" : "Ruolo sportivo aggiornato",
      body: isFirstTime
        ? `Il tuo ruolo Baskin è stato impostato: ${roleName}.`
        : `Il tuo ruolo Baskin è cambiato in: ${roleName}.`,
      url: "/profilo",
    };
    inBackground(sendPushToUser(userId, notifPayload), "push sport role update");
    inBackground(
      createAppNotification({ type: "SYSTEM", targetUserId: userId, ...notifPayload }),
      "notification sport role update"
    );
  }

  // 3.5 — cambio di CATEGORIA (non prima assegnazione): rigonfia σ del rating
  // TrueSkill mantenendo μ. Il replay legge SportRoleHistory, quindi basta
  // ricalcolare; dopo la risposta perché la risposta non dipende dal rating.
  if (roleConfirmed && prevSportRole !== null) {
    inBackground(recomputeRatings(prisma), "rating role change recompute");
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

  const deleted = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, appRole: true },
  });
  if (!deleted) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }
  // I figli per cui era l'unico genitore se ne vanno con lui, come prima della
  // tabella ChildGuardian; quelli con un altro genitore restano a lui.
  await deleteUserAndOrphanedChildren(userId);

  if (session?.user?.id) {
    inBackground(
      logAudit({
        actorId: session.user.id,
        action: "DELETE_USER",
        targetType: "User",
        targetId: userId,
        before: deleted ?? undefined,
      }),
      "audit delete user"
    );
  }

  return NextResponse.json({ ok: true });
}

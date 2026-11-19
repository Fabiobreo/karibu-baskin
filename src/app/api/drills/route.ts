import { NextRequest, NextResponse } from "next/server";
import { Prisma, type AppRole } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { isMember, staffActor } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DrillCreateSchema, EMPTY_DRILL_CONTENT } from "@/lib/schemas/drill";
import {
  DRILL_ADMIN_SELECT,
  DRILL_PUBLIC_SELECT,
  VISIBLE_DRILL_WHERE,
  auditDrill,
  freeDrillSlug,
} from "@/lib/board/drillAdmin";

/**
 * GET — schemi della lavagna (UX-72). Ai tesserati i pubblicati; allo staff,
 * con `?status=all`, anche bozze e archiviati.
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "get-drills", 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  if (!(await isMember())) {
    return NextResponse.json({ error: "Solo per i tesserati" }, { status: 403 });
  }
  const session = await auth();
  const role = session?.user?.appRole as AppRole | undefined;
  const all = !!role && hasRole(role, "COACH") && req.nextUrl.searchParams.get("status") === "all";

  const drills = all
    ? await prisma.drill.findMany({ orderBy: { updatedAt: "desc" }, select: DRILL_ADMIN_SELECT })
    : await prisma.drill.findMany({
        where: VISIBLE_DRILL_WHERE,
        orderBy: { publishedAt: "desc" },
        select: DRILL_PUBLIC_SELECT,
      });
  return NextResponse.json(drills);
}

/** POST — nuovo schema, in bozza, con un passo vuoto. Staff. */
export async function POST(req: NextRequest) {
  const who = await staffActor();
  if ("error" in who) return who.error;

  const parsed = DrillCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  try {
    const slug = await freeDrillSlug(parsed.data.title);
    const drill = await prisma.drill.create({
      data: {
        ...parsed.data,
        slug,
        content: EMPTY_DRILL_CONTENT as unknown as Prisma.InputJsonValue,
        createdById: who.actorId,
        updatedById: who.actorId,
      },
      select: { id: true, slug: true, title: true },
    });
    auditDrill({
      actorId: who.actorId,
      action: "CREATE_DRILL",
      targetId: drill.id,
      after: { title: drill.title, kind: parsed.data.kind, court: parsed.data.court },
    });
    return NextResponse.json(drill, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Esiste già uno schema con questo titolo" },
        { status: 409 }
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Squadra non trovata" }, { status: 400 });
    }
    console.error("[lavagna] crea", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

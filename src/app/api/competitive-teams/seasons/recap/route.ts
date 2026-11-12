import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/authRoles";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { announceSeasonRecaps } from "@/lib/season/recapNotify";
import { SeasonRecapPublishSchema } from "@/lib/schemas/seasonRecap";
import { parseSeasonParam } from "@/lib/season/seasonUtils";

/**
 * "Pubblica i riepiloghi della stagione" (UX-60), solo admin. Da quel momento
 * ognuno vede "La tua stagione" nel profilo; con `notify` parte l'avviso a chi
 * ha dei dati nella stagione. DELETE ritira la pubblicazione (le pagine
 * tornano 404), per un errore nei numeri.
 */

async function adminId(): Promise<string | null> {
  const session = await auth();
  const role = session?.user?.appRole;
  return session?.user?.id && role && hasRole(role, "ADMIN") ? session.user.id : null;
}

export async function POST(req: NextRequest) {
  const actorId = await adminId();
  if (!actorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const parsed = SeasonRecapPublishSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { season, notify } = parsed.data;

  try {
    const now = new Date();
    // La condizione sta nell'update: due clic insieme non mandano due avvisi.
    const { count } = await prisma.season.updateMany({
      where: { label: season, recapPublishedAt: null },
      data: { recapPublishedAt: now },
    });
    if (count === 0) {
      const exists = await prisma.season.findUnique({ where: { label: season } });
      return exists
        ? NextResponse.json({ error: "Riepiloghi già pubblicati" }, { status: 409 })
        : NextResponse.json({ error: "Stagione non trovata" }, { status: 404 });
    }
    inBackground(
      logAudit({
        actorId,
        action: "PUBLISH_SEASON_RECAP",
        targetType: "Season",
        targetId: season,
        after: { recapPublishedAt: now.toISOString(), notify },
      }),
      "audit stagione"
    );
    if (notify) inBackground(announceSeasonRecaps(season), "avviso stagione");
    return NextResponse.json({ season, recapPublishedAt: now.toISOString() });
  } catch (err) {
    console.error("[recap publish]", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const actorId = await adminId();
  if (!actorId) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const season = parseSeasonParam(req.nextUrl.searchParams.get("season"));
  if (!season) {
    return NextResponse.json({ error: "Stagione non valida" }, { status: 400 });
  }
  try {
    const { count } = await prisma.season.updateMany({
      where: { label: season, recapPublishedAt: { not: null } },
      data: { recapPublishedAt: null },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Riepiloghi non pubblicati" }, { status: 409 });
    }
    inBackground(
      logAudit({
        actorId,
        action: "UNPUBLISH_SEASON_RECAP",
        targetType: "Season",
        targetId: season,
      }),
      "audit stagione"
    );
    return NextResponse.json({ season, recapPublishedAt: null });
  } catch (err) {
    console.error("[recap unpublish]", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

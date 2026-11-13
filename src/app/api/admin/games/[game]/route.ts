import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { GameSettingUpdateSchema } from "@/lib/schemas/games";
import { GAME_RULES, isAllowedVisibility, isGameKey } from "@/lib/games/gameSettings";
import { GAME_SETTINGS_TAG } from "@/lib/games/loadGameSettings";

type Params = { params: Promise<{ game: string }> };

/**
 * PUT — chi vede un gioco (UX-66), solo admin. Ogni gioco ha i suoi stati
 * ammessi (`GAME_RULES`): il pronostico e il simulatore non sono mai per
 * tutti, nemmeno chiamando questa rotta a mano.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  const role = session?.user?.appRole;
  if (!session?.user?.id || !role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const actorId = session.user.id;

  const { game } = await params;
  if (!isGameKey(game)) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  // I quiz si accendono uno per uno, da Giochi > Quiz (UX-67).
  if (game === "quiz") {
    return NextResponse.json({ error: "I quiz si accendono uno per uno" }, { status: 400 });
  }

  const parsed = GameSettingUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { visibility } = parsed.data;
  if (!isAllowedVisibility(game, visibility)) {
    return NextResponse.json({ error: "Questo gioco non può avere questo stato" }, { status: 400 });
  }

  try {
    const before = await prisma.gameSetting.findUnique({
      where: { game },
      select: { visibility: true },
    });
    await prisma.gameSetting.upsert({
      where: { game },
      create: { game, visibility, updatedById: actorId },
      update: { visibility, updatedById: actorId },
    });
    // Menu, sitemap e pagine leggono le impostazioni dalla cache: si svuota subito.
    revalidateTag(GAME_SETTINGS_TAG, { expire: 0 });
    inBackground(
      logAudit({
        actorId,
        action: "UPDATE_GAME_SETTING",
        targetType: "Game",
        targetId: game,
        before: { visibility: before?.visibility ?? GAME_RULES[game].fallback },
        after: { visibility },
      }),
      "audit giochi"
    );
    return NextResponse.json({ game, visibility });
  } catch (err) {
    console.error("[games] impostazione", err);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { staffGuard } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { AlbumCreateSchema } from "@/lib/schemas/photoAlbum";
import { listDriveFolder, parseDriveFolderId } from "@/lib/gallery/drive";
import { createAlbum, loadAlbumCard } from "@/lib/gallery/albums";
import { albumErrorResponse } from "@/lib/gallery/albumApi";

// Crea un album da una cartella Drive: salva l'indice delle foto, non i file.
export async function POST(req: NextRequest) {
  const denied = await staffGuard();
  if (denied) return denied;
  const session = await auth();
  const actor = session?.user;
  if (!actor?.id) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const rl = checkRateLimit(getClientIp(req), "album-create", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const parsed = AlbumCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const folderId = parseDriveFolderId(body.link);
  if (!folderId) {
    return NextResponse.json(
      { error: "Non sembra il link di una cartella Google Drive" },
      { status: 400 }
    );
  }

  try {
    const listing = await listDriveFolder(folderId);
    if (listing.photos.length === 0) {
      return NextResponse.json({ error: "In questa cartella non ci sono foto" }, { status: 422 });
    }
    const id = await createAlbum({
      listing,
      title: body.title,
      date: new Date(body.date),
      visibility: body.visibility,
      eventId: body.eventId ?? null,
      matchId: body.matchId ?? null,
      declaredById: actor.id,
    });

    inBackground(
      logAudit({
        actorId: actor.id,
        action: "CREATE_ALBUM",
        targetType: "PhotoAlbum",
        targetId: id,
        after: {
          title: body.title,
          visibility: body.visibility,
          driveFolderId: folderId,
          photos: listing.photos.length,
          // Chi ha dichiarato di avere il permesso di chi ha scattato le foto.
          permissionDeclaredBy: actor.name ?? actor.id,
        },
      }),
      "audit create album"
    );

    return NextResponse.json(await loadAlbumCard(id), { status: 201 });
  } catch (err) {
    return albumErrorResponse(err, "albums POST");
  }
}

export const maxDuration = 60;

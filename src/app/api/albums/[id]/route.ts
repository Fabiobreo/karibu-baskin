import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { staffGuard } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { AlbumUpdateSchema } from "@/lib/schemas/photoAlbum";
import { loadAlbumCard } from "@/lib/gallery/albums";
import { albumErrorResponse } from "@/lib/gallery/albumApi";

type Params = { params: Promise<{ id: string }> };

// Titolo, data, visibilità, copertina, collegamento a evento o partita.
export async function PUT(req: Request, { params }: Params) {
  const denied = await staffGuard();
  if (denied) return denied;
  const session = await auth();

  const parsed = AlbumUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const { id } = await params;

  try {
    const before = await prisma.photoAlbum.findUnique({
      where: { id },
      select: { title: true, visibility: true },
    });
    if (!before) return NextResponse.json({ error: "Album non trovato" }, { status: 404 });

    if (body.coverPhotoId) {
      const cover = await prisma.albumPhoto.findFirst({
        where: { id: body.coverPhotoId, albumId: id, hidden: false },
        select: { id: true },
      });
      if (!cover) {
        return NextResponse.json(
          { error: "La copertina dev'essere una foto visibile di questo album" },
          { status: 400 }
        );
      }
    }

    await prisma.photoAlbum.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.coverPhotoId !== undefined && { coverPhotoId: body.coverPhotoId }),
        ...(body.eventId !== undefined && { eventId: body.eventId }),
        ...(body.matchId !== undefined && { matchId: body.matchId }),
        // Scegliere un evento toglie la partita, e viceversa.
        ...(body.eventId && { matchId: null }),
        ...(body.matchId && { eventId: null }),
      },
    });

    // Nell'audit finisce il cambio che conta: chi ha reso pubblico un album.
    if (session?.user?.id && body.visibility && body.visibility !== before.visibility) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "UPDATE_ALBUM",
          targetType: "PhotoAlbum",
          targetId: id,
          before: { visibility: before.visibility },
          after: { title: body.title ?? before.title, visibility: body.visibility },
        }),
        "audit update album"
      );
    }

    return NextResponse.json(await loadAlbumCard(id));
  } catch (err) {
    return albumErrorResponse(err, "albums PUT");
  }
}

// Toglie l'album dal sito. La cartella su Drive non si tocca.
export async function DELETE(_req: Request, { params }: Params) {
  const denied = await staffGuard();
  if (denied) return denied;
  const session = await auth();
  const { id } = await params;

  try {
    const album = await prisma.photoAlbum.delete({
      where: { id },
      select: { title: true, driveFolderId: true, visibility: true },
    });
    if (session?.user?.id) {
      inBackground(
        logAudit({
          actorId: session.user.id,
          action: "DELETE_ALBUM",
          targetType: "PhotoAlbum",
          targetId: id,
          before: album,
        }),
        "audit delete album"
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return albumErrorResponse(err, "albums DELETE");
  }
}

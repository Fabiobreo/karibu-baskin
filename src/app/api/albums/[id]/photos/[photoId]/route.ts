import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { staffGuard } from "@/lib/apiAuth";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { AlbumPhotoPatchSchema } from "@/lib/schemas/photoAlbum";
import { recountAlbum } from "@/lib/gallery/albums";
import { albumErrorResponse } from "@/lib/gallery/albumApi";

type Params = { params: Promise<{ id: string; photoId: string }> };

// Nasconde o rimostra una foto. Resta nascosta anche dopo "Aggiorna".
export async function PATCH(req: Request, { params }: Params) {
  const denied = await staffGuard();
  if (denied) return denied;
  const session = await auth();

  const parsed = AlbumPhotoPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const { hidden } = parsed.data;
  const { id, photoId } = await params;

  try {
    const photo = await prisma.albumPhoto.findFirst({
      where: { id: photoId, albumId: id },
      select: { id: true, name: true, hidden: true },
    });
    if (!photo) return NextResponse.json({ error: "Foto non trovata" }, { status: 404 });

    if (photo.hidden !== hidden) {
      await prisma.albumPhoto.update({ where: { id: photoId }, data: { hidden } });
      // Una copertina nascosta non resta copertina.
      if (hidden) {
        await prisma.photoAlbum.updateMany({
          where: { id, coverPhotoId: photoId },
          data: { coverPhotoId: null },
        });
      }
      if (session?.user?.id) {
        inBackground(
          logAudit({
            actorId: session.user.id,
            action: "HIDE_ALBUM_PHOTO",
            targetType: "AlbumPhoto",
            targetId: photoId,
            before: { hidden: photo.hidden },
            after: { hidden, albumId: id, name: photo.name },
          }),
          "audit hide album photo"
        );
      }
    }
    const photoCount = await recountAlbum(id);
    return NextResponse.json({ id: photoId, hidden, photoCount });
  } catch (err) {
    return albumErrorResponse(err, "albums photo PATCH");
  }
}

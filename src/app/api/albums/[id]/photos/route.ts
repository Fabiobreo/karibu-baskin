import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";
import { albumErrorResponse } from "@/lib/gallery/albumApi";

type Params = { params: Promise<{ id: string }> };

// Tutte le foto dell'album, nascoste comprese: serve allo staff per moderarle.
export async function GET(_req: Request, { params }: Params) {
  const denied = await staffGuard();
  if (denied) return denied;
  const { id } = await params;

  try {
    const album = await prisma.photoAlbum.findUnique({
      where: { id },
      select: {
        coverPhotoId: true,
        photos: {
          orderBy: { position: "asc" },
          select: { id: true, driveFileId: true, name: true, hidden: true },
        },
      },
    });
    if (!album) return NextResponse.json({ error: "Album non trovato" }, { status: 404 });
    return NextResponse.json(album);
  } catch (err) {
    return albumErrorResponse(err, "albums photos GET");
  }
}

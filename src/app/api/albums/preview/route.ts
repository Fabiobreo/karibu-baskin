import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { AlbumPreviewSchema } from "@/lib/schemas/photoAlbum";
import { listDriveFolder, parseDriveFolderId } from "@/lib/gallery/drive";
import { suggestedAlbumDate } from "@/lib/gallery/albums";
import { albumErrorResponse } from "@/lib/gallery/albumApi";

// "Leggi cartella": cosa c'è dietro il link, senza salvare niente.
export async function POST(req: NextRequest) {
  const denied = await staffGuard();
  if (denied) return denied;
  const rl = checkRateLimit(getClientIp(req), "album-preview", 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const parsed = AlbumPreviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const folderId = parseDriveFolderId(parsed.data.link);
  if (!folderId) {
    return NextResponse.json(
      { error: "Non sembra il link di una cartella Google Drive" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.photoAlbum.findUnique({
      where: { driveFolderId: folderId },
      select: { title: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Questa cartella è già un album: “${existing.title}”` },
        { status: 409 }
      );
    }

    const listing = await listDriveFolder(folderId);
    if (listing.photos.length === 0) {
      return NextResponse.json({ error: "In questa cartella non ci sono foto" }, { status: 422 });
    }
    return NextResponse.json({
      title: listing.name,
      date: suggestedAlbumDate(listing).toISOString(),
      photoCount: listing.photos.length,
      otherFiles: listing.otherFiles,
      truncated: listing.truncated,
      sampleFileIds: listing.photos.slice(0, 4).map((p) => p.driveFileId),
    });
  } catch (err) {
    return albumErrorResponse(err, "albums/preview");
  }
}

export const maxDuration = 60;

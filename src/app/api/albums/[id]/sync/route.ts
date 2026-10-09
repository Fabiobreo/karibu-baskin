import { NextRequest, NextResponse } from "next/server";
import { staffGuard } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { loadAlbumCard, syncAlbum } from "@/lib/gallery/albums";
import { albumErrorResponse } from "@/lib/gallery/albumApi";

type Params = { params: Promise<{ id: string }> };

// "Aggiorna": rilegge la cartella Drive e riallinea l'indice delle foto.
export async function POST(req: NextRequest, { params }: Params) {
  const denied = await staffGuard();
  if (denied) return denied;
  const rl = checkRateLimit(getClientIp(req), "album-sync", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }
  const { id } = await params;

  try {
    const result = await syncAlbum(id);
    if (!result) return NextResponse.json({ error: "Album non trovato" }, { status: 404 });
    // Anche "non raggiungibile" è una risposta buona: lo stato dell'album è cambiato.
    return NextResponse.json({ result, album: await loadAlbumCard(id) });
  } catch (err) {
    return albumErrorResponse(err, "albums sync");
  }
}

export const maxDuration = 60;

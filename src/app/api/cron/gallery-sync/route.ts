import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { syncInstagram } from "@/lib/gallery/instagram";
import { isDriveConfigured } from "@/lib/gallery/drive";
import { syncRecentAlbums } from "@/lib/gallery/albums";

/** Esito di una delle due metà: il risultato, oppure l'errore che l'ha fermata. */
async function attempt<T>(label: string, task: () => Promise<T>) {
  try {
    return { ok: true as const, result: await task() };
  } catch (err) {
    console.error(`[cron/gallery-sync] ${label}:`, err);
    return { ok: false as const, error: err instanceof Error ? err.message : "Errore" };
  }
}

// Vercel Cron — aggiorna la Gallery: album da Drive e feed Instagram.
// Schedulato in vercel.json (una volta al giorno, alle 06:00).
//
// Un cron solo per due lavori perché il piano Hobby ne concede 7 e sono tutti
// presi. Le due metà non si disturbano: ognuna ha il suo catch e la sua riga
// nei log, e la risposta riporta i due esiti distinti. Prima gli album, che
// sono poche chiamate leggere a Drive e hanno un tetto di tempo; Instagram
// scarica e ricomprime immagini, e se sfora non toglie niente agli album.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret ?? ""}`;
  const valid =
    !!cronSecret &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!valid || !isVercelCron) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Senza chiave gli album non si leggono: non è un errore del giro di oggi.
  const albums = isDriveConfigured()
    ? await attempt("album", () => syncRecentAlbums())
    : { ok: true as const, result: null };
  const instagram = await attempt("instagram", () => syncInstagram());

  // Per Instagram "non configurato" è un esito (`ok: false` con il motivo), non un'eccezione.
  const instagramOk = instagram.ok && instagram.result.ok;
  const albumsOk = albums.ok && (albums.result?.failed ?? 0) === 0;
  const status = !albums.ok || !instagram.ok ? 500 : albumsOk && instagramOk ? 200 : 422;
  return NextResponse.json({ albums, instagram }, { status });
}

// Instagram scarica e ricomprime immagini: può richiedere più del default.
export const maxDuration = 60;

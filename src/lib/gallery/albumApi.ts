import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { DriveError, type DriveErrorCode } from "./drive";

const DRIVE_STATUS: Record<DriveErrorCode, number> = {
  NOT_CONFIGURED: 503,
  NOT_FOUND: 422,
  NOT_A_FOLDER: 422,
  QUOTA: 503,
  FAILED: 502,
};

/**
 * Risposta JSON per un errore nelle rotte degli album: gli errori di Drive con
 * il loro messaggio per lo staff, quelli di Prisma con uno stato leggibile.
 * Mai un 500 con pagina HTML.
 */
export function albumErrorResponse(err: unknown, label: string): NextResponse {
  if (err instanceof DriveError) {
    return NextResponse.json({ error: err.message }, { status: DRIVE_STATUS[err.code] });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Questa cartella è già un album" }, { status: 409 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Evento o partita non trovati" }, { status: 400 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Album non trovato" }, { status: 404 });
    }
  }
  console.error(`[${label}]`, err);
  return NextResponse.json({ error: "Operazione non riuscita. Riprova." }, { status: 500 });
}

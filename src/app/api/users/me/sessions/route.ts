import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

/**
 * Esci da tutti i dispositivi: cancella ogni sessione dell'utente.
 *
 * Con la strategia "database" di Auth.js una sessione è una riga della tabella
 * `Session`: eliminarle le invalida subito su ogni dispositivo, compreso quello
 * da cui parte la richiesta. Serve a chi ha perso il telefono o ha usato un
 * computer condiviso senza uscire (KB-16).
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const { count } = await prisma.session.deleteMany({ where: { userId: session.user.id } });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error("[sessions] delete all", err);
    return NextResponse.json({ error: "Errore nella disconnessione" }, { status: 500 });
  }
}

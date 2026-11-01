import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// POST — salva subscription
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, "push-subscribe", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche secondo." },
      { status: 429 }
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Subscription non valida" }, { status: 400 });
  }

  // Verifica ownership dell'endpoint.
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: body.endpoint },
    select: { userId: true, p256dh: true, auth: true },
  });
  // L'endpoint passa a un altro proprietario (un altro utente, o nessuno dopo
  // l'uscita) solo se le chiavi crittografiche coincidono: le ha soltanto il
  // browser che si è iscritto, quindi è lo stesso dispositivo con un altro
  // account. Prima un altro utente riceveva 409 e su un telefono condiviso
  // (genitore e figlio) chi entrava per secondo non riceveva mai niente.
  // Fra due anonimi resta libero, come prima.
  if (existing && existing.userId !== userId && (existing.userId !== null || userId !== null)) {
    if (existing.p256dh !== body.keys.p256dh || existing.auth !== body.keys.auth) {
      return NextResponse.json({ error: "Endpoint già registrato" }, { status: 409 });
    }
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { p256dh: body.keys.p256dh, auth: body.keys.auth, userId },
    create: { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userId },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — rimuove subscription (solo del richiedente autenticato)
export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, "push-unsubscribe", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche secondo." },
      { status: 429 }
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Endpoint mancante" }, { status: 400 });
  }

  // Se c'è un utente loggato, elimina solo se è la sua subscription
  // Se non è loggato, elimina solo subscription anonime (userId null)
  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint: body.endpoint,
      userId: userId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

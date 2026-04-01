/**
 * Endpoint di login per test — attivo SOLO se ENABLE_TEST_LOGIN=true.
 * Crea una sessione database nel formato Auth.js v5, poi imposta il cookie.
 * Non usare mai in produzione.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_TEST_LOGIN !== "true") {
    return NextResponse.json({ error: "Non disponibile" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Credenziali mancanti" }, { status: 400 });
  }

  const testPassword = process.env.TEST_PASSWORD ?? "karibu-test";
  if (password !== testPassword) {
    return NextResponse.json({ error: "Password errata" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Nessun utente con questa email" }, { status: 404 });
  }

  // Crea la sessione nel DB — stesso schema usato da Auth.js v5 (tabella Session)
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 anno

  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  // Nome cookie: Auth.js v5 usa "__Secure-" prefix in HTTPS, senza in HTTP (sviluppo)
  const secure = process.env.NODE_ENV === "production";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    expires,
    path: "/",
    secure,
  });

  return res;
}

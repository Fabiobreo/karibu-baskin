/**
 * Endpoint di login per test — attivo SOLO se ENABLE_TEST_LOGIN=true e fuori produzione.
 * Crea una sessione database nel formato Auth.js v5, poi imposta il cookie.
 * Non usare mai in produzione.
 *
 * GET  /api/test-login        → debug info (cookie, sessioni DB, auth())
 * POST /api/test-login        → esegue il login
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { auth } from "@/lib/authjs";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Doppio cancello: variabile esplicita *e* ambiente non di produzione.
 *
 * L'endpoint crea sessioni valide un anno per qualunque email con una sola
 * password condivisa, e il GET elenca sessioni ed email. Con la sola variabile,
 * un `ENABLE_TEST_LOGIN=true` finito per errore in un environment Vercel
 * aprirebbe un accesso admin completo senza credenziali reali. Con il controllo
 * su `NODE_ENV`, in una build di produzione la rotta risponde 404 in ogni caso.
 * L'e2e non ne risente: Playwright avvia `npm run dev`.
 */
function isTestLoginEnabled(): boolean {
  return process.env.ENABLE_TEST_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

// Nomi cookie che Auth.js v5 può usare (in ordine di priorità)
const POSSIBLE_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.csrf-token",
];

function getSessionCookieName(): string {
  // Il cookie __Secure- serve su HTTPS (Vercel preview + prod); in localhost usa quello semplice
  const isHttps = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
  return isHttps ? "__Secure-authjs.session-token" : "authjs.session-token";
}

// ── GET: diagnostica ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isTestLoginEnabled()) {
    return NextResponse.json({ error: "Non disponibile" }, { status: 404 });
  }

  // 1. Tutti i cookie presenti nella richiesta
  const allCookies: Record<string, string> = {};
  req.cookies.getAll().forEach((c) => {
    allCookies[c.name] = c.value.slice(0, 40) + (c.value.length > 40 ? "…" : "");
  });

  // 2. Cerca token Auth.js nei cookie noti
  const foundAuthCookies: Record<string, string> = {};
  for (const name of POSSIBLE_COOKIE_NAMES) {
    const val = req.cookies.get(name)?.value;
    if (val) foundAuthCookies[name] = val;
  }

  // 3. Cerca le sessioni nel DB che corrispondono ai token trovati
  const matchedSessions: object[] = [];
  for (const token of Object.values(foundAuthCookies)) {
    const s = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: { select: { id: true, name: true, email: true, appRole: true } } },
    });
    if (s) matchedSessions.push({ ...s, sessionToken: token.slice(0, 8) + "…" });
  }

  // 4. Ultime 5 sessioni nel DB (per vedere se vengono create)
  const recentSessions = await prisma.session.findMany({
    orderBy: { expires: "desc" },
    take: 5,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // 5. Cosa vede auth() in questo momento
  const currentAuth = await auth();

  return NextResponse.json({
    debug: true,
    expectedCookieName: getSessionCookieName(),
    allCookies,
    foundAuthCookies: Object.keys(foundAuthCookies),
    matchedSessions,
    recentDbSessions: recentSessions.map((s) => ({
      token: s.sessionToken.slice(0, 8) + "…",
      userId: s.userId,
      user: s.user,
      expires: s.expires,
      expired: s.expires < new Date(),
    })),
    currentAuthSession: currentAuth
      ? {
          userId: currentAuth.user?.id,
          email: currentAuth.user?.email,
          appRole: currentAuth.user?.appRole,
        }
      : null,
  });
}

// ── POST: esegue il login ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isTestLoginEnabled()) {
    return NextResponse.json({ error: "Non disponibile" }, { status: 404 });
  }

  // Password unica e condivisa: senza limite si prova per forza bruta.
  const rl = checkRateLimit(getClientIp(req), "test-login", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
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

  const cookieName = getSessionCookieName();
  const secure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

  // Costruisce il Set-Cookie header manualmente per evitare il bug Turbopack
  // con NextResponse.cookies.set() che a volte non scrive l'header
  const cookieParts = [
    `${cookieName}=${sessionToken}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Expires=${expires.toUTCString()}`,
  ];
  if (secure) cookieParts.push("Secure");

  const res = NextResponse.json({
    ok: true,
    debug: {
      cookieName,
      userId: user.id,
      email: user.email,
      tokenPrefix: sessionToken.slice(0, 8) + "…",
    },
  });

  res.headers.set("Set-Cookie", cookieParts.join("; "));

  return res;
}

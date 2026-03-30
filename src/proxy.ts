import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";

// Verifica cookie admin usando Web Crypto API (Edge Runtime compatible)
async function isCookieAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return false;

  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.COOKIE_SECRET ?? "default-secret-change-me";

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(password));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return token === expected;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Protezione pannello admin (cookie HMAC oppure appRole ADMIN) ──
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login")
  ) {
    const session = await auth();
    const isOAuthAdmin =
      session?.user?.appRole &&
      hasRole(session.user.appRole as AppRole, "ADMIN");
    const cookieAdmin = await isCookieAdmin(request);

    if (!isOAuthAdmin && !cookieAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ── Protezione API sessioni/teams (COACH o ADMIN) ──
  if (
    (pathname.startsWith("/api/sessions") ||
      pathname.startsWith("/api/teams")) &&
    request.method !== "GET"
  ) {
    const session = await auth();
    const role = session?.user?.appRole as AppRole | undefined;
    const cookieAdmin = await isCookieAdmin(request);

    if (!cookieAdmin && (!role || !hasRole(role, "COACH"))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
  }

  // ── Protezione API utenti (solo ADMIN) ──
  if (pathname.startsWith("/api/users") && !pathname.startsWith("/api/users/me")) {
    const session = await auth();
    const role = session?.user?.appRole as AppRole | undefined;
    const cookieAdmin = await isCookieAdmin(request);

    if (!cookieAdmin && (!role || !hasRole(role, "ADMIN"))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/sessions/:path*",
    "/api/teams/:path*",
    "/api/users/:path*",
  ],
};

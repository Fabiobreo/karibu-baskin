import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";

// GET /api/users/lookup?email=foo@bar.com  → utente singolo o 404 (PARENT+)
// GET /api/users/lookup?name=Mario Rossi   → array (max 5, PARENT+ only, min 3 chars)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (email) {
    // La ricerca per email è riservata a PARENT+ per evitare enumerazione da parte di semplici atleti
    const role = session.user.appRole as AppRole | undefined;
    if (!role || !hasRole(role, "PARENT")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, gender: true, image: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Nessun utente trovato" }, { status: 404 });
    }
    return NextResponse.json(user);
  }

  if (name) {
    // Same gate as email: any authenticated user could enumerate the entire roster with
    // single-letter queries otherwise. Require PARENT+ (already needed to send link requests).
    const role = session.user.appRole as AppRole | undefined;
    if (!role || !hasRole(role, "PARENT")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return NextResponse.json({ error: "Digita almeno 3 caratteri" }, { status: 400 });
    }
    const users = await prisma.user.findMany({
      where: {
        name: { contains: trimmedName, mode: "insensitive" },
        id: { not: session.user.id },
      },
      select: { id: true, name: true, gender: true, image: true },
      take: 5,
    });
    return NextResponse.json(users);
  }

  return NextResponse.json({ error: "Parametro email o name richiesto" }, { status: 400 });
}

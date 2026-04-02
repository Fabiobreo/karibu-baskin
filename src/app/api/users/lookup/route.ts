import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/users/lookup?email=foo@bar.com  → utente singolo o 404
// GET /api/users/lookup?name=Mario Rossi   → array (max 5)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, gender: true, birthDate: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Nessun utente trovato" }, { status: 404 });
    }
    return NextResponse.json(user);
  }

  if (name) {
    const users = await prisma.user.findMany({
      where: { name: { contains: name.trim(), mode: "insensitive" } },
      select: { id: true, name: true, gender: true, birthDate: true },
      take: 5,
    });
    return NextResponse.json(users);
  }

  return NextResponse.json({ error: "Parametro email o name richiesto" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId richiesto" }, { status: 400 });
  }

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(registrations);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId, name, role } = body as {
    sessionId?: string;
    name?: string;
    role?: number;
  };

  if (!sessionId || !name?.trim() || !role) {
    return NextResponse.json(
      { error: "sessionId, nome e ruolo sono obbligatori" },
      { status: 400 }
    );
  }

  const trimmedName = name.trim().slice(0, 60);

  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Ruolo non valido (1-5)" }, { status: 400 });
  }

  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  try {
    const registration = await prisma.registration.create({
      data: { sessionId, name: trimmedName, role },
    });
    return NextResponse.json(registration, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Sei già iscritto a questo allenamento" },
        { status: 409 }
      );
    }
    throw err;
  }
}

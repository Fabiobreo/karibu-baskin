import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { SuggestionCreateSchema, SUGGESTION_STATUSES } from "@/lib/schemas/suggestion";

// Campi esposti all'admin: NB userId/user del suggerimento volutamente esclusi
// (anonimo "per finta"). L'autore delle NOTE invece è visibile (è staff).
const ADMIN_SELECT = {
  id: true,
  category: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  notes: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true, customImage: true } },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = SUGGESTION_STATUSES.find((s) => s === statusParam);
  const items = await prisma.suggestion.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: ADMIN_SELECT,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  // Solo utenti loggati possono inviare suggerimenti.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Devi accedere per inviare un suggerimento" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(getClientIp(req), `suggestion-${session.user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = SuggestionCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  await prisma.suggestion.create({
    data: {
      category: parsed.data.category,
      message: parsed.data.message,
      userId: session.user.id,
    },
  });

  // Nessuna eco dell'autore nella risposta.
  return NextResponse.json({ ok: true }, { status: 201 });
}

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { SportRoleSuggestionSchema } from "@/lib/schemas/sportRole";

/**
 * PUT /api/users/me/sport-role-suggestion — salva il ruolo suggerito dal
 * questionario (`/profilo/ruolo`) senza passare da un'iscrizione.
 *
 * Prima il suggerimento si salvava solo iscrivendosi a un allenamento: chi
 * voleva scoprire il proprio ruolo doveva prima sceglierne uno. Lo staff lo
 * ritrova come oggi in `/admin/utenti`, da confermare o rifiutare.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = SportRoleSuggestionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const { role, variant } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sportRole: true },
    });
    if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    // Un ruolo confermato dallo staff non si sovrascrive con un'autovalutazione.
    if (user.sportRole !== null) {
      return NextResponse.json(
        { error: "Il tuo ruolo è già stato confermato dallo staff" },
        { status: 409 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { sportRoleSuggested: role, sportRoleSuggestedVariant: variant ?? null },
      select: { sportRoleSuggested: true, sportRoleSuggestedVariant: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }
    console.error("[sport-role-suggestion]", err);
    return NextResponse.json({ error: "Errore nel salvataggio" }, { status: 500 });
  }
}

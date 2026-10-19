import type { SuggestionCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { staffGuard } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { inBackground } from "@/lib/background";
import { staffUserIds } from "@/lib/notifications/recipients";
import { deliverNotices } from "@/lib/notifications/matchNotify";
import {
  ADMIN_SUGGESTION_SELECT,
  sortByActivity,
  toAdminSuggestion,
} from "@/lib/suggestions/adminSuggestion";
import { newSuggestionNotice } from "@/lib/suggestions/suggestionNotify";
import { SuggestionCreateSchema, SUGGESTION_STATUSES } from "@/lib/schemas/suggestion";

export async function GET(req: NextRequest) {
  const denied = await staffGuard();
  if (denied) {
    return denied;
  }
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = SUGGESTION_STATUSES.find((s) => s === statusParam);
  const items = await prisma.suggestion.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: ADMIN_SUGGESTION_SELECT,
  });
  return NextResponse.json(sortByActivity(items.map(toAdminSuggestion)));
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

  let created: { id: string; category: SuggestionCategory; message: string };
  try {
    created = await prisma.suggestion.create({
      data: {
        category: parsed.data.category,
        message: parsed.data.message,
        userId: session.user.id,
      },
      select: { id: true, category: true, message: true },
    });
  } catch (err) {
    console.error("[suggestions] salvataggio non riuscito", err);
    return NextResponse.json({ error: "Suggerimento non salvato" }, { status: 500 });
  }

  const authorId = session.user.id;
  inBackground(
    (async () => {
      const notice = newSuggestionNotice({ ...created, authorId }, await staffUserIds());
      if (notice) await deliverNotices([notice], "suggestion");
    })(),
    "notification new suggestion"
  );

  // Nessuna eco dell'autore nella risposta.
  return NextResponse.json({ ok: true }, { status: 201 });
}

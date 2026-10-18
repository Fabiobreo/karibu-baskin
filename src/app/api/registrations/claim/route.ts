import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { mergedFields, replaceRegistrationInTeams } from "@/lib/registrationMerge";

/**
 * Collega all'account le iscrizioni anonime fatte con lo stesso nome.
 *
 * Se l'account è già iscritto a quell'allenamento (la persona si è iscritta da
 * anonima e poi di nuovo con l'account) l'anonima non si assegna: si fonde in
 * quella dell'account e sparisce. Assegnarla violava l'unicità
 * (allenamento, utente), la rotta rispondeva 500 e il doppione restava.
 *
 * Risposta: `claimed` = iscrizioni passate all'account, `merged` = doppioni tolti.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const userId = session.user.id;
  const userName = session.user.name.trim();
  const userEmail = session.user.email?.trim().toLowerCase() ?? null;

  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  // Con degli id, solo quelli (purché anonimi e con lo stesso nome); senza,
  // tutte le anonime con il nome dell'account.
  const onlyIds = Array.isArray(body.ids) && body.ids.length > 0 ? body.ids : null;

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        const anonymous = await tx.registration.findMany({
          where: {
            ...(onlyIds && { id: { in: onlyIds } }),
            userId: null,
            childId: null,
            name: { equals: userName, mode: "insensitive" },
            // Il nome se lo può dare chiunque: se l'iscrizione anonima ha
            // lasciato un'email, deve essere quella dell'account. Altrimenti
            // un omonimo (vero o finto) si prenderebbe, o cancellerebbe con la
            // fusione, l'iscrizione di un altro.
            OR: [{ anonymousEmail: null }, ...(userEmail ? [{ anonymousEmail: userEmail }] : [])],
          },
          select: { id: true, sessionId: true, attended: true, note: true },
          orderBy: { createdAt: "asc" },
        });
        if (anonymous.length === 0) return { claimed: 0, merged: 0 };

        // Le iscrizioni che l'account ha già negli stessi allenamenti, anche
        // tramite la sua scheda figlio (è la stessa persona, @/lib/person).
        const linkedChild = await tx.child.findUnique({
          where: { userId },
          select: { id: true },
        });
        const own = await tx.registration.findMany({
          where: {
            sessionId: { in: [...new Set(anonymous.map((r) => r.sessionId))] },
            OR: [{ userId }, ...(linkedChild ? [{ childId: linkedChild.id }] : [])],
          },
          select: { id: true, sessionId: true, attended: true, note: true },
        });
        const ownBySession = new Map(own.map((r) => [r.sessionId, r]));

        let claimed = 0;
        let merged = 0;
        for (const anon of anonymous) {
          const kept = ownBySession.get(anon.sessionId);
          if (!kept) {
            await tx.registration.update({ where: { id: anon.id }, data: { userId } });
            ownBySession.set(anon.sessionId, anon);
            claimed++;
            continue;
          }

          const fields = mergedFields(kept, anon);
          if (Object.keys(fields).length > 0) {
            await tx.registration.update({ where: { id: kept.id }, data: fields });
          }
          await tx.registration.delete({ where: { id: anon.id } });

          // Le squadre salvate nominano le iscrizioni per id.
          const training = await tx.trainingSession.findUnique({
            where: { id: anon.sessionId },
            select: { teams: true },
          });
          const patched = replaceRegistrationInTeams(training?.teams, anon.id, kept.id);
          if (patched.changed) {
            await tx.trainingSession.update({
              where: { id: anon.sessionId },
              data: { teams: patched.teams as Prisma.InputJsonValue },
            });
          }
          merged++;
        }
        return { claimed, merged };
      },
      { timeout: 20_000, maxWait: 10_000 }
    );

    return NextResponse.json(outcome);
  } catch (err) {
    // Due collegamenti partiti insieme: il secondo trova la riga già presa.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2025" || err.code === "P2002")
    ) {
      return NextResponse.json(
        { error: "Queste iscrizioni sono già state collegate." },
        { status: 409 }
      );
    }
    console.error("[registrations claim]", err);
    return NextResponse.json({ error: "Collegamento non riuscito. Riprova." }, { status: 500 });
  }
}

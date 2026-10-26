import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";
import { bandThresholds, levelBand, type AthleteLevel } from "@/lib/rating/levelBands";
import { TRUESKILL } from "@/lib/rating/trueskill";

/**
 * GET — livello stimato degli iscritti di un allenamento, per id
 * dell'iscrizione (UX-54). Solo allenatori e admin: mai il dirigente né chi
 * non è staff. μ e σ servono al browser per l'anteprima dell'equilibrio
 * mentre si spostano i giocatori; a schermo si vedono solo la fascia e la
 * percentuale della squadra (UX-40). Chi non ha un livello stimato non c'è.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const denied = await staffGuard();
  if (denied) return denied;

  const { sessionId } = await params;
  const ratingSelect = { sportRole: true, ratingMu: true, ratingSigma: true } as const;
  const [registrations, users, children] = await Promise.all([
    prisma.registration.findMany({
      where: { sessionId, registeredAsCoach: false },
      select: {
        id: true,
        role: true,
        user: { select: ratingSelect },
        // Figlio con un account: il livello sta sull'account (una persona sola).
        child: { select: { ...ratingSelect, user: { select: ratingSelect } } },
      },
    }),
    // La rosa valutata, per le soglie delle fasce: la stessa di `/admin/sviluppo`.
    prisma.user.findMany({ where: { ratingMu: { not: null } }, select: ratingSelect }),
    // Senza i figli collegati a un account, già contati come account.
    prisma.child.findMany({
      where: { ratingMu: { not: null }, userId: null },
      select: ratingSelect,
    }),
  ]);

  const thresholds = bandThresholds(
    [...users, ...children].map((p) => ({
      sportRole: p.sportRole,
      mu: p.ratingMu!,
      sigma: p.ratingSigma ?? TRUESKILL.SIGMA,
    }))
  );

  const levels: Record<string, AthleteLevel> = {};
  for (const r of registrations) {
    const person = r.user ?? r.child?.user ?? r.child;
    if (person?.ratingMu == null) continue;
    const rating = { mu: person.ratingMu, sigma: person.ratingSigma ?? TRUESKILL.SIGMA };
    levels[r.id] = {
      ...rating,
      band: levelBand(person.sportRole ?? r.role, rating, thresholds),
    };
  }

  return NextResponse.json({ levels });
}

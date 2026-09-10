import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import SessionPageClient, { type Session } from "@/components/training/SessionPageClient";

export const dynamic = "force-dynamic";

/**
 * Shell server dell'allenamento: legge titolo, data e orario da Prisma e li passa
 * al client come dati iniziali, cosi l'h1 e presente al primo paint e lo skeleton
 * resta confinato a iscritti e squadre.
 */
export default async function AllenamentoPage({
  params,
}: {
  params: Promise<{ session: string }>;
}) {
  const { session: sessionParam } = await params;

  const training = await prisma.trainingSession.findFirst({
    where: { OR: [{ id: sessionParam }, { dateSlug: sessionParam }] },
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
  });

  if (!training) notFound();

  const initialSession: Session = {
    id: training.id,
    title: training.title,
    date: training.date.toISOString(),
    endTime: training.endTime ? training.endTime.toISOString() : null,
    dateSlug: training.dateSlug,
    allowedRoles: training.allowedRoles,
    restrictTeamId: training.restrictTeamId,
    openRoles: training.openRoles,
    restrictTeam: training.restrictTeam,
    registrationOpen: training.registrationOpen,
    registrationOpenedAt: training.registrationOpenedAt
      ? training.registrationOpenedAt.toISOString()
      : null,
    _count: training._count,
  };

  return <SessionPageClient initialSession={initialSession} />;
}

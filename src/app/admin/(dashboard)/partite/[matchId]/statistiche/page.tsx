import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import MatchStatsClient from "@/components/matches/MatchStatsClient";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import { formatRome } from "@/lib/dateUtils";

export const metadata: Metadata = { title: "Statistiche partita | Admin" };

type Params = { params: Promise<{ matchId: string }> };

export default async function MatchStatsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team: { select: { name: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
    },
  });
  if (!match) notFound();

  const opponentLabel = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";
  const matchLabel = `${match.team.name} vs ${opponentLabel} (${formatRome(match.date, "d MMM yyyy", { locale: it })})`;

  return <MatchStatsClient matchId={matchId} matchLabel={matchLabel} ourScore={match.ourScore} />;
}

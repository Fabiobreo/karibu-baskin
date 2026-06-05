import { redirect } from "next/navigation";
import { Paper, Typography } from "@mui/material";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import DevelopmentTracker, { type TrackedAthlete } from "@/components/rating/DevelopmentTracker";

export const revalidate = 60;

export default async function SviluppoPage() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }

  const [users, children, updates] = await Promise.all([
    prisma.user.findMany({
      where: { ratingMu: { not: null } },
      select: {
        id: true,
        name: true,
        sportRole: true,
        sportRoleVariant: true,
        ratingMu: true,
        ratingSigma: true,
      },
    }),
    prisma.child.findMany({
      where: { ratingMu: { not: null } },
      select: {
        id: true,
        name: true,
        sportRole: true,
        sportRoleVariant: true,
        ratingMu: true,
        ratingSigma: true,
      },
    }),
    prisma.ratingUpdate.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { userId: true, childId: true, muAfter: true, reason: true },
    }),
  ]);

  // Costruisci la serie cronologica di μ per ogni giocatore.
  const seriesByKey = new Map<string, { series: number[]; games: number; officialGames: number }>();
  for (const u of updates) {
    const key = u.userId ? `u:${u.userId}` : u.childId ? `c:${u.childId}` : null;
    if (!key) continue;
    const entry = seriesByKey.get(key) ?? { series: [], games: 0, officialGames: 0 };
    entry.series.push(u.muAfter);
    if (u.reason === "TRAINING_MATCH") entry.games++;
    if (u.reason === "OFFICIAL_MATCH") entry.officialGames++;
    seriesByKey.set(key, entry);
  }

  const athletes: TrackedAthlete[] = [
    ...users.map((u) => ({ ...u, kind: "user" as const, name: u.name ?? "Senza nome" })),
    ...children.map((c) => ({ ...c, kind: "child" as const, name: c.name })),
  ].map((a) => {
    const entry = seriesByKey.get(`${a.kind === "user" ? "u" : "c"}:${a.id}`);
    return {
      id: a.id,
      kind: a.kind,
      name: a.name,
      sportRole: a.sportRole,
      sportRoleVariant: a.sportRoleVariant,
      mu: a.ratingMu!,
      sigma: a.ratingSigma!,
      series: entry?.series ?? [],
      games: entry?.games ?? 0,
      officialGames: entry?.officialGames ?? 0,
    };
  });

  return (
    <>
      <AdminPageHeader
        title="Sviluppo giocatori"
        subtitle="Andamento del rating TrueSkill nel tempo (μ). Visibile solo allo staff."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Sviluppo" }]}
      />
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        {athletes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
            Nessun rating disponibile: servono partitelle con punteggio registrato.
          </Typography>
        ) : (
          <DevelopmentTracker athletes={athletes} />
        )}
      </Paper>
    </>
  );
}

import { prisma } from "@/lib/db";
import { Container } from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import AllenamentiClient from "@/components/AllenamentiClient";
import type { TeamsData } from "@/components/TeamDisplay";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Allenamenti | Karibu Baskin" };
export const revalidate = 0;

export default async function AllenamentiPage() {
  const now = new Date();

  const rawSessions = await prisma.trainingSession.findMany({
    orderBy: { date: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  const sessions = rawSessions.map((s) => ({ ...s, teams: s.teams as unknown as TeamsData | null }));

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime
      ? new Date(s.endTime)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });

  const upcoming = sessions.filter((s) => {
    const start = new Date(s.date);
    return start > now;
  });

  const past = sessions
    .filter((s) => {
      const end = s.endTime
        ? new Date(s.endTime)
        : new Date(new Date(s.date).getTime() + 2 * 60 * 60 * 1000);
      return end < now;
    })
    .reverse();

  return (
    <>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <AllenamentiClient inCorso={inCorso} upcoming={upcoming} past={past} />
      </Container>
    </>
  );
}

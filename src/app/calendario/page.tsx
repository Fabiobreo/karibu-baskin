import { getTranslations } from "next-intl/server";
import { Box, Container, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarClient from "@/components/calendar/CalendarClient";
import SubscribeCalendarButton from "@/components/calendar/SubscribeCalendarButton";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import type { AppRole } from "@prisma/client";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Calendario",
  description:
    "Allenamenti, partite ed eventi del Karibu Baskin di Montecchio Maggiore in un unico calendario.",
  path: "/calendario",
});

export default async function CalendarioPage() {
  const t = await getTranslations("nav");
  const [session, teams] = await Promise.all([
    auth(),
    prisma.competitiveTeam.findMany({
      // La Karibu di stagione non e' una squadra come le altre e resta nascosta
      // su tutte le superfici pubbliche: in legenda comparirebbe come filtro di
      // qualcosa che l'utente non puo' vedere altrove.
      where: { isMixed: false },
      select: { id: true, name: true, season: true, color: true },
      orderBy: [{ season: "desc" }, { name: "asc" }],
    }),
  ]);

  // Squadre di chi guarda e dei suoi figli: servono a marcare nel calendario
  // gli impegni che lo riguardano. Niente sessione, nessun contorno. Va dopo
  // perche' dipende dall'esito di `auth()`, non prima: cosi' la query delle
  // squadre resta in parallelo con la sessione invece di accodarsi.
  const userId = session?.user?.id;
  const myMemberships = userId
    ? await prisma.teamMembership.findMany({
        where: { OR: [{ userId }, { child: { parentId: userId } }] },
        select: { teamId: true },
      })
    : [];

  const myTeamIds = [...new Set(myMemberships.map((m) => m.teamId))];
  const userRole = session?.user?.appRole as AppRole | undefined;
  const isStaff = !!userRole && hasRole(userRole, "COACH");
  const isAdmin = !!userRole && hasRole(userRole, "ADMIN");

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            mb: 3,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h4" component="h1" fontWeight={800}>
              {t("calendar")}
            </Typography>
          </Box>
          <SubscribeCalendarButton />
        </Box>
        <CalendarClient isStaff={isStaff} isAdmin={isAdmin} teams={teams} myTeamIds={myTeamIds} />
      </Container>
    </>
  );
}

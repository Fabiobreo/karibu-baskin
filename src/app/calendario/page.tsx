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
      select: { id: true, name: true, season: true, color: true },
      orderBy: [{ season: "desc" }, { name: "asc" }],
    }),
  ]);

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
        <CalendarClient isStaff={isStaff} isAdmin={isAdmin} teams={teams} />
      </Container>
    </>
  );
}

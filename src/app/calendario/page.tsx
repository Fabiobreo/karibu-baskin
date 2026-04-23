import { Box, Container, Typography, Button } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DownloadIcon from "@mui/icons-material/Download";
import SiteHeader from "@/components/SiteHeader";
import CalendarClient from "@/components/CalendarClient";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import type { AppRole } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendario | Karibu Baskin" };

export default async function CalendarioPage() {
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
      <SiteHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              Calendario
            </Typography>
          </Box>
          <Button
            component="a"
            href="/api/calendar/export.ics"
            download="karibu-baskin.ics"
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            sx={{ fontWeight: 600 }}
          >
            Aggiungi al calendario
          </Button>
        </Box>
        <CalendarClient isStaff={isStaff} isAdmin={isAdmin} teams={teams} />
      </Container>
    </>
  );
}

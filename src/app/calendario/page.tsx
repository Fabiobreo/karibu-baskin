import { Box, Container, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SiteHeader from "@/components/SiteHeader";
import CalendarClient from "@/components/CalendarClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendario | Karibu Baskin" };

export default function CalendarioPage() {
  return (
    <>
      <SiteHeader />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>
            Calendario
          </Typography>
        </Box>
        <CalendarClient />
      </Container>
    </>
  );
}

import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { getTranslations } from "next-intl/server";

/**
 * Invito a provare, in fondo alla home pubblica.
 *
 * La home racconta bene chi è il Karibu (valori, storia, dieci anni) ma finiva
 * senza dire cosa fare: per scrivere bisognava tornare al menu e cercare
 * "Contatti". Chi arriva qui è quasi sempre un genitore o un atleta che sta
 * valutando se venire, e la risposta alla sua domanda è un contatto, non un
 * calendario operativo (KB-31).
 */
export default async function JoinUsCta() {
  const t = await getTranslations("home");

  return (
    <Box
      component="section"
      aria-labelledby="join-us-title"
      sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, textAlign: "center" }}>
        <Typography
          id="join-us-title"
          variant="h4"
          component="h2"
          fontWeight={800}
          sx={{ mb: 1.5, fontSize: { xs: "1.6rem", md: "2rem" } }}
        >
          {t("joinTitle")}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 560, mx: "auto" }}>
          {t("joinBody")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/contatti">
            <Button variant="contained" size="large">
              {t("joinCta")}
            </Button>
          </Link>
          <Link href="/il-baskin">
            <Button variant="outlined" size="large">
              {t("joinLearn")}
            </Button>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}

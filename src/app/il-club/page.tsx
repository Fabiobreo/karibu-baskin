import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { RADIUS } from "@/lib/radius";
import PageHero from "@/components/common/PageHero";
import ClubValues from "@/components/common/ClubValues";
import ClubHistory from "@/components/common/ClubHistory";
import { columnSx } from "@/lib/layout";
import { buildMetadata } from "@/lib/seo";
import { CLUB_AFFILIATION, CLUB_LEGAL_NAME, CLUB_TAX_ID } from "@/lib/clubContacts";
import { CLUB_VENUE } from "@/lib/clubVenue";
import { TYPE_SCALE } from "@/lib/typeScale";

export const metadata = buildMetadata({
  title: "Chi siamo",
  description:
    "La storia e i valori dell'ASD Karibu Baskin di Montecchio Maggiore: basket inclusivo dal 2015.",
  path: "/il-club",
});

// "Chi siamo" (UX-36b): presentazione, valori, storia e dati dell'associazione.
// Valori e storia sono gli stessi componenti della home, con gli stessi testi.
// Niente JSON-LD: `SportsOrganization` sta già in home.
export default async function IlClubPage() {
  const t = await getTranslations("club");
  const sectionTitleSx = { mb: 2, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } };
  const facts = [
    { label: t("legalName"), value: CLUB_LEGAL_NAME },
    { label: t("taxId"), value: CLUB_TAX_ID },
    { label: t("affiliation"), value: CLUB_AFFILIATION },
    {
      label: t("venue"),
      value: `${CLUB_VENUE.name}, ${CLUB_VENUE.street}, ${CLUB_VENUE.postalCode} ${CLUB_VENUE.city} (${CLUB_VENUE.province})`,
    },
  ];

  return (
    <>
      <PageHero column="reading" title={t("heroTitle")} subtitle={t("heroSubtitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={{ xs: 5, md: 7 }} sx={columnSx("reading")}>
          {/* Presentazione con la foto di gruppo: accanto al testo da `md`, sotto
              su telefono. E' verticale, e qui non ha testo sopra. */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 300px" },
              alignItems: "center",
              gap: { xs: 3, md: 5 },
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ lineHeight: 1.75, mb: 2 }}>
                {t("intro")}
              </Typography>
              <Button href="/il-baskin" variant="outlined">
                {t("baskinCta")}
              </Button>
            </Box>
            <Box
              sx={{
                position: "relative",
                aspectRatio: "4 / 5",
                width: "100%",
                maxWidth: { xs: 480, md: "none" },
                mx: "auto",
                borderRadius: RADIUS.lg,
                overflow: "hidden",
              }}
            >
              <Image
                src="/club/scalinata.jpg"
                alt={t("photoAlt")}
                fill
                sizes="(min-width: 900px) 300px, (min-width: 520px) 480px, 100vw"
                style={{ objectFit: "cover" }}
              />
            </Box>
          </Box>

          <ClubValues overline={false} />

          <Divider />

          <ClubHistory />

          <Divider />

          <Box>
            <Typography variant="h4" component="h2" sx={sectionTitleSx}>
              {t("teamsTitle")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {t("teamsBody")}
            </Typography>
            <Button href="/squadre" variant="outlined">
              {t("teamsCta")}
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h4" component="h2" sx={sectionTitleSx}>
              {t("associationTitle")}
            </Typography>
            <Stack component="dl" spacing={1.5} sx={{ m: 0, mb: 3 }}>
              {facts.map((f) => (
                <Box
                  key={f.label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" },
                    columnGap: 2,
                  }}
                >
                  <Typography component="dt" variant="body2" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                    {f.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Button href="/contatti" variant="outlined">
              {t("contactCta")}
            </Button>
          </Box>
        </Stack>
      </Container>
    </>
  );
}

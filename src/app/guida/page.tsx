import { Box, Button, Container, Typography } from "@mui/material";
import { getLocale, getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import GuideChapters from "@/components/common/GuideChapters";
import { getGuide } from "@/lib/content/guide";
import { columnSx } from "@/lib/layout";
import { buildMetadata } from "@/lib/seo";
import { RADIUS } from "@/lib/radius";

export const metadata = buildMetadata({
  title: "Guida all'app",
  description:
    "Come usare l'app del Karibu Baskin: entrare, installarla sul telefono, attivare le notifiche, iscrivere i figli agli allenamenti e rispondere a partite ed eventi.",
  path: "/guida",
});

export default async function GuidaPage() {
  const [t, locale] = await Promise.all([getTranslations("pages"), getLocale()]);

  return (
    <>
      <PageHero column="reading" title={t("guida.heroTitle")} subtitle={t("guida.heroSubtitle")} />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        <Box sx={columnSx("reading")}>
          <GuideChapters guide={getGuide(locale)} />

          <Box
            sx={{
              mt: 6,
              p: { xs: 2.5, md: 3 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: RADIUS.lg,
              bgcolor: "action.hover",
              display: "flex",
              gap: 2,
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" component="h2">
                {t("guida.helpTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("guida.helpDesc")}
              </Typography>
            </Box>
            <Button href="/contatti" variant="outlined" sx={{ flexShrink: 0 }}>
              {t("guida.helpBtn")}
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
}

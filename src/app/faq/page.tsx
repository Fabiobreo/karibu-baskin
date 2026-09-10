import { Container, Box, Typography, Button } from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import FaqAccordion from "@/components/common/FaqAccordion";
import { getFaqs } from "@/lib/content/faqs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "FAQ",
  description:
    "Le domande più frequenti su come iniziare a giocare a Baskin con il Karibu di Montecchio Maggiore.",
  path: "/faq",
});

export default async function FaqPage() {
  const [t, locale] = await Promise.all([getTranslations("pages"), getLocale()]);
  const FAQS = getFaqs(locale);

  return (
    <>
      <PageHero
        chip={t("faq.heroChip")}
        title={t("faq.heroTitle")}
        subtitle={t("faq.heroSubtitle")}
        subtitleMaxWidth={520}
      />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t("faq.noAnswer")}{" "}
          <Link href="/contatti" style={{ color: "inherit" }}>
            <Box component="span" sx={{ color: "primary.onLight", fontWeight: 600 }}>
              {t("faq.contactUs")}
            </Box>
          </Link>
          .
        </Typography>

        <FaqAccordion faqs={FAQS} />

        {/* CTA suggerimenti */}
        <Box
          sx={{
            mt: 6,
            p: { xs: 2.5, md: 3 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "action.hover",
            display: "flex",
            gap: 2,
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <LightbulbIcon sx={{ color: "primary.main", flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {t("faq.suggestionCta")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("faq.suggestionCtaDesc")}
            </Typography>
          </Box>
          <Link href="/contatti#suggerimenti" style={{ textDecoration: "none" }}>
            <Button variant="contained" sx={{ fontWeight: 700, borderRadius: 2, flexShrink: 0 }}>
              {t("faq.suggestionCtaBtn")}
            </Button>
          </Link>
        </Box>
      </Container>
    </>
  );
}

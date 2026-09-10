import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import HandshakeIcon from "@mui/icons-material/Handshake";
import EmailIcon from "@mui/icons-material/Email";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Image from "next/image";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { onHover } from "@/lib/hoverStyles";

export const metadata = buildMetadata({
  title: "Sponsor",
  description:
    "Le aziende e le realtà del territorio che sostengono il Karibu Baskin di Montecchio Maggiore.",
  path: "/sponsor",
});

const SPONSORS = [
  {
    name: "Denis M. Photographer",
    url: "https://www.facebook.com/Denis.M.photographer",
    logo: "/sponsors/denis.jpg",
  },
  {
    name: "Villani and Partners",
    url: "https://villaniandpartners.eu/",
    logo: "/sponsors/villani.png",
  },
  {
    name: "LLP",
    url: "https://www.llp.it/",
    logo: "/sponsors/LLP.png",
  },
  {
    name: "Tetti Tecchio",
    url: "https://www.tettitecchio.it/",
    logo: "/sponsors/tettitecchio.png",
  },
  {
    name: "Saby Sport",
    url: "https://www.sabysport.com/",
    logo: "/sponsors/sabysport.png",
  },
  {
    name: "CGRD",
    url: "https://www.cgrd.it/it/",
    logo: "/sponsors/cgrd.png",
  },
];

export default async function SponsorPage() {
  const t = await getTranslations("pages");
  const sponsorsContent = t.raw("sponsor.sponsorsData") as {
    category: string;
    description: string;
  }[];
  const PERKS = t.raw("sponsor.perks") as { title: string; desc: string }[];

  return (
    <>
      <PageHero
        chip={t("sponsor.heroChip")}
        title={t("sponsor.heroTitle")}
        subtitle={t("sponsor.heroSubtitle")}
        subtitleMaxWidth={520}
      />

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {/* Sponsor attuali */}
        <Box sx={{ mb: 7 }}>
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("sponsor.thanksTo")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}
          >
            {t("sponsor.ourSponsors")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t("sponsor.partnersDesc")}
          </Typography>
          <Grid container spacing={2}>
            {SPONSORS.map((s, i) => (
              <Grid key={s.name} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  component="a"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    height: "100%",
                    display: "flex",
                    flexDirection: "row",
                    gap: 2,
                    alignItems: "flex-start",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                    ...onHover({
                      borderColor: "primary.main",
                      boxShadow: `0 2px 12px ${alpha("#E65100", 0.1)}`,
                      transform: "translateY(-2px)",
                    }),
                  }}
                >
                  {/* Logo */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 90,
                      height: 90,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      src={s.logo}
                      alt={`Logo ${s.name}`}
                      width={90}
                      height={90}
                      style={{ objectFit: "contain", padding: "8px" }}
                    />
                  </Box>

                  {/* Testo */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Chip
                      label={sponsorsContent[i].category}
                      size="small"
                      sx={{ mb: 1, fontWeight: 600, fontSize: "0.68rem" }}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {s.name}
                      </Typography>
                      <OpenInNewIcon
                        sx={{ fontSize: "0.9rem", color: "text.disabled", flexShrink: 0 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {sponsorsContent[i].description}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 7 }} />

        {/* Diventa sponsor */}
        <Box>
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("sponsor.joinUs")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}
          >
            {t("sponsor.becomeSponsor")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t("sponsor.becomeSponsorDesc")}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            {PERKS.map((p) => (
              <Grid key={p.title} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                  }}
                >
                  <HandshakeIcon sx={{ color: "primary.main", flexShrink: 0, mt: 0.3 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25 }}>
                      {p.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.desc}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* CTA contatto */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
              borderRadius: 3,
              p: { xs: 3, md: 4 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              color: "#fff",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                {t("sponsor.interestedSponsor")}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {t("sponsor.writeUsDesc")}
              </Typography>
            </Box>
            <Link href="mailto:asdkaribubaskin@gmail.com" style={{ textDecoration: "none" }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EmailIcon />}
                size="large"
                sx={{ whiteSpace: "nowrap" }}
              >
                {t("sponsor.contactUs")}
              </Button>
            </Link>
          </Box>
        </Box>
      </Container>
    </>
  );
}

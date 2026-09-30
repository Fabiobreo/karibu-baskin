"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Button,
  Collapse,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSession } from "next-auth/react";
import PageHero from "@/components/common/PageHero";
import TryItSection from "@/components/common/TryItSection";
import SuggestionForm from "@/components/common/SuggestionForm";
import Image from "next/image";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { onHover } from "@/lib/hoverStyles";
import { heroGradient, heroText, socialBrandColor } from "@/lib/heroStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

// ── Dati ─────────────────────────────────────────────────────────────────────

const CONTACTS = [
  { icon: <PhoneIcon />, label: "Elisa", value: "(+39) 349 297 2703", href: "tel:+393492972703" },
  { icon: <PhoneIcon />, label: "Andrea", value: "(+39) 335 531 0195", href: "tel:+393355310195" },
  {
    icon: <EmailIcon />,
    label: "Email",
    value: "asdkaribubaskin@gmail.com",
    href: "mailto:asdkaribubaskin@gmail.com",
  },
];

const SOCIAL = [
  {
    icon: <InstagramIcon sx={{ fontSize: 26 }} />,
    label: "Instagram",
    handle: "@karibubaskin",
    href: "https://www.instagram.com/karibubaskin/",
    color: socialBrandColor.instagram,
  },
  {
    icon: <FacebookIcon sx={{ fontSize: 26 }} />,
    label: "Facebook",
    handle: "karibubaskin",
    href: "https://www.facebook.com/karibubaskin",
    color: socialBrandColor.facebook,
  },
  {
    icon: <YouTubeIcon sx={{ fontSize: 26 }} />,
    label: "YouTube",
    handle: "@karibubaskin",
    href: "https://youtube.com/@karibubaskin",
    color: socialBrandColor.youtube,
  },
];

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
  { name: "LLP", url: "https://www.llp.it/", logo: "/sponsors/LLP.png" },
  {
    name: "Tetti Tecchio",
    url: "https://www.tettitecchio.it/",
    logo: "/sponsors/tettitecchio.png",
  },
  { name: "Saby Sport", url: "https://www.sabysport.com/", logo: "/sponsors/sabysport.png" },
  { name: "CGRD", url: "https://www.cgrd.it/it/", logo: "/sponsors/cgrd.png" },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ContattiPage() {
  const t = useTranslations("pages");
  const PERKS = t.raw("contatti.perks") as { title: string; desc: string }[];
  const { status } = useSession();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"contatti" | "partner">("contatti");

  // Segue la sezione attiva mentre si scrolla
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as "contatti" | "partner");
          }
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    const s1 = document.getElementById("contatti");
    const s2 = document.getElementById("partner");
    if (s1) observer.observe(s1);
    if (s2) observer.observe(s2);
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <PageHero title={t("contatti.heroTitle")} subtitle={t("contatti.heroSubtitle")} />

      {/* ── Sticky mini-nav ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: "sticky",
          top: { xs: 56, sm: 60 },
          zIndex: 10,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Il testo della prima scheda allineato al titolo della fascia: le
            schede hanno il padding del contenitore, e lo recuperano. */}
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", mx: { xs: -2, sm: -3 } }}>
            {(["contatti", "partner"] as const).map((id) => {
              const labels = {
                contatti: t("contatti.tabContatti"),
                partner: t("contatti.tabPartner"),
              };
              const active = activeSection === id;
              return (
                <Button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  size="small"
                  disableRipple
                  sx={{
                    borderRadius: 0,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                    color: active ? "primary.onLight" : "text.secondary",
                    borderBottom: active ? "2px solid" : "2px solid transparent",
                    borderColor: active ? "primary.main" : "transparent",
                    fontSize: TYPE_SCALE.sm,
                    transition: "all 0.15s",
                    "&:hover": { bgcolor: "transparent", color: "text.primary" },
                  }}
                >
                  {labels[id]}
                </Button>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* ── Sezione Contatti ─────────────────────────────────────────────────── */}
      <Box
        id="contatti"
        sx={{ pt: { xs: 4, md: 5 }, pb: { xs: 6, md: 9 }, scrollMarginTop: { xs: 96, sm: 104 } }}
      >
        <Container maxWidth="lg">
          {/* Vieni a provare (UX-15): quando, dove, cosa portare e il modulo,
              in una schermata. Le CTA per chi non e' tesserato puntano qui. */}
          <TryItSection />

          {/* Titolo sezione */}
          <Typography variant="overline" color="text.secondary">
            {t("contatti.letsTalk")}
          </Typography>
          <Typography
            component="h2"
            variant="h4"
            sx={{ mt: 0.5, mb: 4, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } }}
          >
            {t("contatti.contactUs")}
          </Typography>

          {/* 3 card contatto in fila */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {CONTACTS.map((c) => (
              <Grid key={c.value} size={{ xs: 12, sm: 4 }}>
                <Paper
                  elevation={0}
                  component="a"
                  href={c.href}
                  sx={{
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    height: "100%",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                    ...onHover({
                      borderColor: "primary.main",
                      boxShadow: 3,
                      transform: "translateY(-2px)",
                    }),
                  }}
                >
                  <Box sx={{ color: "primary.main", display: "flex" }}>{c.icon}</Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={FONT_WEIGHT.semibold}
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: TYPE_SCALE.xs,
                    }}
                  >
                    {c.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={FONT_WEIGHT.semibold}
                    sx={{ lineHeight: 1.3 }}
                  >
                    {c.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Suggerimenti — solo utenti loggati */}
          {status === "authenticated" && (
            <Box
              id="suggerimenti"
              sx={{
                scrollMarginTop: 80,
                mb: 5,
                p: { xs: 2.5, md: 3 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: RADIUS.lg,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <LightbulbIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">{t("contatti.haveIdea")}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("contatti.suggestionDesc")}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant={suggestionOpen ? "outlined" : "contained"}
                startIcon={suggestionOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setSuggestionOpen((o) => !o)}
                sx={{ mt: 2 }}
              >
                {suggestionOpen ? t("contatti.closeSuggestion") : t("contatti.openSuggestion")}
              </Button>
              <Collapse in={suggestionOpen} timeout="auto">
                <Box sx={{ mt: 2 }}>
                  <SuggestionForm />
                </Box>
              </Collapse>
            </Box>
          )}

          <Divider sx={{ mb: 5 }} />

          {/* Social + dati legali. La sede con la mappa sta in "Vieni a provare",
              in cima alla pagina: qui sarebbe stata un doppione. */}
          <Grid container spacing={4}>
            <Grid size={12}>
              <Typography variant="overline" color="text.secondary">
                {t("contatti.followUs")}
              </Typography>
              <Typography component="h3" variant="h5" sx={{ mt: 0.5, mb: 2 }}>
                {t("contatti.social")}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                  gap: 1.5,
                  mb: 4,
                }}
              >
                {SOCIAL.map((s) => (
                  <Paper
                    key={s.label}
                    elevation={0}
                    component="a"
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: s.color },
                    }}
                  >
                    <Box sx={{ color: s.color }}>{s.icon}</Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={FONT_WEIGHT.semibold}
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                          fontSize: TYPE_SCALE.xs,
                        }}
                      >
                        {s.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                        {s.handle}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={FONT_WEIGHT.semibold}
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  display: "block",
                  mb: 1,
                }}
              >
                {t("contatti.legalData")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                ASD Karibu Baskin Montecchio Maggiore
                <br />
                C.F. 04301440246
                <br />
                Affiliata ENSI ETS, nr. VEN10
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Sezione Partner ──────────────────────────────────────────────────── */}
      <Box
        id="partner"
        sx={{
          bgcolor: "action.hover",
          borderTop: "1px solid",
          borderColor: "divider",
          pt: { xs: 4, md: 5 },
          pb: { xs: 6, md: 9 },
          scrollMarginTop: { xs: 96, sm: 104 },
        }}
      >
        <Container maxWidth="lg">
          {/* Sponsor attuali — logo strip */}
          <Typography variant="overline" color="text.secondary">
            {t("contatti.thanksTo")}
          </Typography>
          <Typography
            component="h2"
            variant="h4"
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } }}
          >
            {t("contatti.ourPartners")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t("contatti.partnersDesc")}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 8,
            }}
          >
            {SPONSORS.map((s) => (
              <Box
                key={s.name}
                component="a"
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: { xs: "calc(33.333% - 11px)", sm: "calc(16.666% - 14px)" },
                  aspectRatio: "1",
                  bgcolor: "common.white",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: RADIUS.md,
                  overflow: "hidden",
                  transition: "box-shadow 0.2s, transform 0.15s, border-color 0.2s",
                  ...onHover({
                    boxShadow: 3,
                    transform: "translateY(-2px)",
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
                  }),
                }}
              >
                <Image
                  src={s.logo}
                  alt={`Logo ${s.name}`}
                  width={88}
                  height={88}
                  style={{ objectFit: "contain", padding: "10px", width: "100%", height: "100%" }}
                />
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 7 }} />

          {/* Diventa sponsor */}
          <Typography variant="overline" color="text.secondary">
            {t("contatti.joinUs")}
          </Typography>
          <Typography
            component="h2"
            variant="h4"
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 } }}
          >
            {t("contatti.becomeSponsor")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 620 }}>
            {t("contatti.becomeSponsorDesc")}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            {PERKS.map((p) => (
              <Grid key={p.title} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                    height: "100%",
                  }}
                >
                  <Box sx={{ color: "primary.main", flexShrink: 0, mt: 0.25 }}>
                    <HandshakeIcon />
                  </Box>
                  <Box>
                    <Typography component="h3" variant="subtitle2" sx={{ mb: 0.25 }}>
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

          <Box
            sx={{
              background: heroGradient.footer,
              borderRadius: RADIUS.lg,
              p: { xs: 3, md: 4 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              color: "common.white",
            }}
          >
            <Box>
              <Typography
                component="h3"
                variant="h6"
                fontWeight={FONT_WEIGHT.bold}
                sx={{ mb: 0.5 }}
              >
                {t("contatti.interestedSponsor")}
              </Typography>
              <Typography variant="body2" sx={{ color: heroText.muted }}>
                {t("contatti.writeUsDesc")}
              </Typography>
            </Box>
            {/* Contornato (UX-30): il bottone pieno della pagina e' l'invio del modulo. */}
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              href="mailto:asdkaribubaskin@gmail.com"
              component="a"
              size="large"
              sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {t("contatti.writeUs")}
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}

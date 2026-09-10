"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Container,
  Typography,
  Grid2 as Grid,
  Paper,
  Chip,
  Button,
  Collapse,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSession } from "next-auth/react";
import PageHero from "@/components/common/PageHero";
import ContactForm from "@/components/common/ContactForm";
import SuggestionForm from "@/components/common/SuggestionForm";
import Image from "next/image";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import HandshakeIcon from "@mui/icons-material/Handshake";
import MessageIcon from "@mui/icons-material/Message";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MapEmbed from "@/components/common/MapEmbed";
import { onHover } from "@/lib/hoverStyles";

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
    color: "#E1306C",
  },
  {
    icon: <FacebookIcon sx={{ fontSize: 26 }} />,
    label: "Facebook",
    handle: "karibubaskin",
    href: "https://www.facebook.com/karibubaskin",
    color: "#1877F2",
  },
  {
    icon: <YouTubeIcon sx={{ fontSize: 26 }} />,
    label: "YouTube",
    handle: "@karibubaskin",
    href: "https://youtube.com/@karibubaskin",
    color: "#FF0000",
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
  const [formOpen, setFormOpen] = useState(false);
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
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <PageHero
        chip={t("contatti.heroChip")}
        title={t("contatti.heroTitle")}
        subtitle={t("contatti.heroSubtitle")}
        py={{ xs: 7, md: 10 }}
        maxWidth="sm"
      >
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap", mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<MessageIcon />}
            onClick={() => scrollToSection("contatti")}
            sx={{
              fontWeight: 700,
              px: 3.5,
              py: 1.4,
              borderRadius: 2,
              boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
            }}
          >
            {t("contatti.heroHaveQuestion")}
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<HandshakeIcon />}
            onClick={() => scrollToSection("partner")}
            sx={{
              fontWeight: 700,
              px: 3.5,
              py: 1.4,
              borderRadius: 2,
              color: "#fff",
              borderColor: "rgba(255,255,255,0.35)",
              backdropFilter: "blur(4px)",
              bgcolor: "rgba(255,255,255,0.06)",
              "&:hover": {
                borderColor: "rgba(255,255,255,0.65)",
                bgcolor: "rgba(255,255,255,0.12)",
              },
            }}
          >
            {t("contatti.heroSponsor")}
          </Button>
        </Box>
      </PageHero>

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
        <Container maxWidth="md" disableGutters>
          <Box sx={{ display: "flex" }}>
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
                    px: 3,
                    py: 1.5,
                    fontWeight: active ? 700 : 400,
                    color: active ? "primary.main" : "text.secondary",
                    borderBottom: active ? "2px solid" : "2px solid transparent",
                    borderColor: active ? "primary.main" : "transparent",
                    fontSize: "0.88rem",
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
        <Container maxWidth="md">
          {/* Titolo sezione */}
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("contatti.letsTalk")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 4, fontSize: { xs: "1.6rem", md: "2rem" } }}
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
                      boxShadow: (theme) => `0 2px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                      transform: "translateY(-2px)",
                    }),
                  }}
                >
                  <Box sx={{ color: "primary.main", display: "flex" }}>{c.icon}</Box>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    fontWeight={700}
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: "0.62rem",
                    }}
                  >
                    {c.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                    {c.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Form espandibile */}
          <Box sx={{ mb: 5 }}>
            <Button
              variant={formOpen ? "outlined" : "contained"}
              startIcon={formOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setFormOpen((o) => !o)}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {formOpen ? t("contatti.closeForm") : t("contatti.openForm")}
            </Button>
            <Collapse in={formOpen} timeout="auto">
              <Paper
                elevation={0}
                sx={{ mt: 2, p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
              >
                <ContactForm />
              </Paper>
            </Collapse>
          </Box>

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
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <LightbulbIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t("contatti.haveIdea")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("contatti.suggestionDesc")}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant={suggestionOpen ? "outlined" : "contained"}
                startIcon={suggestionOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setSuggestionOpen((o) => !o)}
                sx={{ mt: 2, fontWeight: 700, borderRadius: 2 }}
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

          {/* Mappa + Sede + Social */}
          <Grid container spacing={4}>
            {/* Sinistra: mappa + sede */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="overline"
                color="primary.onLight"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em" }}
              >
                {t("contatti.visitUs")}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
                {t("contatti.ourVenue")}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <MapEmbed height={220} />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <LocationOnIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    Polisportivo Gino Cosaro
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Via del Vigo, 11 - 36075 Montecchio Maggiore (VI)
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Destra: social + dati legali */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="overline"
                color="primary.onLight"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em" }}
              >
                {t("contatti.followUs")}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
                {t("contatti.social")}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}>
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
                        color="text.disabled"
                        fontWeight={700}
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                          fontSize: "0.62rem",
                        }}
                      >
                        {s.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {s.handle}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography
                variant="caption"
                color="text.disabled"
                fontWeight={700}
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
        <Container maxWidth="md">
          {/* Sponsor attuali — logo strip */}
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("contatti.thanksTo")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}
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
                  bgcolor: "#fff",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                  transition: "box-shadow 0.2s, transform 0.15s, border-color 0.2s",
                  ...onHover({
                    boxShadow: (theme) => `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
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
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("contatti.joinUs")}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}
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
                {t("contatti.interestedSponsor")}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {t("contatti.writeUsDesc")}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              href="mailto:asdkaribubaskin@gmail.com"
              component="a"
              size="large"
              sx={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {t("contatti.writeUs")}
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}

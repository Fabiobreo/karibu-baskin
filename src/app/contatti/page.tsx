"use client";

import { useState, useEffect } from "react";
import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Button,
  Collapse, Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import ContactForm from "@/components/ContactForm";
import Image from "next/image";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import HandshakeIcon from "@mui/icons-material/Handshake";
import MessageIcon from "@mui/icons-material/Message";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

// ── Dati ─────────────────────────────────────────────────────────────────────

const CONTACTS = [
  { icon: <PhoneIcon />, label: "Elisa", value: "(+39) 349 297 2703", href: "tel:+393492972703" },
  { icon: <PhoneIcon />, label: "Andrea", value: "(+39) 335 531 0195", href: "tel:+393355310195" },
  { icon: <EmailIcon />, label: "Email", value: "asdkaribubaskin@gmail.com", href: "mailto:asdkaribubaskin@gmail.com" },
];

const SOCIAL = [
  { icon: <InstagramIcon sx={{ fontSize: 26 }} />, label: "Instagram", handle: "@karibubaskin", href: "https://www.instagram.com/karibubaskin/", color: "#E1306C" },
  { icon: <FacebookIcon sx={{ fontSize: 26 }} />, label: "Facebook", handle: "karibubaskin", href: "https://www.facebook.com/karibubaskin", color: "#1877F2" },
  { icon: <YouTubeIcon sx={{ fontSize: 26 }} />, label: "YouTube", handle: "@karibubaskin", href: "https://youtube.com/@karibubaskin", color: "#FF0000" },
];

const SPONSORS = [
  { name: "Denis M. Photographer", url: "https://www.facebook.com/Denis.M.photographer", logo: "/sponsors/denis.jpg" },
  { name: "Villani and Partners", url: "https://villaniandpartners.eu/", logo: "/sponsors/villani.png" },
  { name: "LLP", url: "https://www.llp.it/", logo: "/sponsors/LLP.png" },
  { name: "Tetti Tecchio", url: "https://www.tettitecchio.it/", logo: "/sponsors/tettitecchio.png" },
  { name: "Saby Sport", url: "https://www.sabysport.com/", logo: "/sponsors/sabysport.png" },
  { name: "CGRD", url: "https://www.cgrd.it/it/", logo: "/sponsors/cgrd.png" },
];

const PERKS = [
  { title: "Logo sul sito", desc: "Il tuo brand visibile su tutte le pagine del sito ufficiale" },
  { title: "Visibilità sui social", desc: "Menzioni su Instagram, Facebook e YouTube" },
  { title: "Logo sulla maglia", desc: "Il tuo logo sulle divise di gara delle nostre squadre" },
  { title: "Presenza agli eventi", desc: "Visibilità durante tornei, allenamenti aperti e iniziative" },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ContattiPage() {
  const [formOpen, setFormOpen] = useState(false);
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
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 7, md: 10 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.06)", pointerEvents: "none" }} />
        <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
          <Chip label="Siamo qui" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            Come possiamo aiutarti?
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 400, fontSize: { xs: "1rem", md: "1.1rem" }, mb: 4 }}>
            Hai una domanda, vuoi venire ad allenarci, o sei interessato a supportarci?
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<MessageIcon />}
              onClick={() => scrollToSection("contatti")}
              sx={{ fontWeight: 700, px: 3.5, py: 1.4, borderRadius: 2, boxShadow: "0 4px 20px rgba(230,81,0,0.4)" }}
            >
              Ho una domanda
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<HandshakeIcon />}
              onClick={() => scrollToSection("partner")}
              sx={{
                fontWeight: 700, px: 3.5, py: 1.4, borderRadius: 2,
                color: "#fff", borderColor: "rgba(255,255,255,0.35)",
                backdropFilter: "blur(4px)", bgcolor: "rgba(255,255,255,0.06)",
                "&:hover": { borderColor: "rgba(255,255,255,0.65)", bgcolor: "rgba(255,255,255,0.12)" },
              }}
            >
              Voglio sponsorizzare
            </Button>
          </Box>
        </Container>
      </Box>

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
              const labels = { contatti: "Contatti", partner: "Partner" };
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
      <Box id="contatti" sx={{ pt: { xs: 4, md: 5 }, pb: { xs: 6, md: 9 }, scrollMarginTop: { xs: 96, sm: 104 } }}>
        <Container maxWidth="md">

          {/* Titolo sezione */}
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Parliamoci
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 4, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Contattaci
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
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: "0 2px 12px rgba(230,81,0,0.12)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Box sx={{ color: "primary.main", display: "flex" }}>{c.icon}</Box>
                  <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.62rem" }}>
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
              {formOpen ? "Chiudi il form" : "Scrivi un messaggio"}
            </Button>
            <Collapse in={formOpen} timeout="auto">
              <Paper elevation={0} sx={{ mt: 2, p: 3, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 2 }}>
                <ContactForm />
              </Paper>
            </Collapse>
          </Box>

          <Divider sx={{ mb: 5 }} />

          {/* Mappa + Sede + Social */}
          <Grid container spacing={4}>
            {/* Sinistra: mappa + sede */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Vieni a trovarci
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
                La nostra sede
              </Typography>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid rgba(0,0,0,0.07)",
                  height: 220,
                  mb: 2,
                }}
              >
                <iframe
                  src="https://maps.google.com/maps?q=Polisportivo+Gino+Cosaro,+Via+del+Vigo+11,+Montecchio+Maggiore+VI&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Polisportivo Gino Cosaro - Montecchio Maggiore"
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <LocationOnIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700}>Polisportivo Gino Cosaro</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Via del Vigo, 11 — 36075 Montecchio Maggiore (VI)
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Destra: social + dati legali */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Seguici
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
                Social
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
                      border: "1px solid rgba(0,0,0,0.07)",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: s.color },
                    }}
                  >
                    <Box sx={{ color: s.color }}>{s.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", display: "block", fontSize: "0.62rem" }}>
                        {s.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>{s.handle}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 1 }}>
                Dati associazione
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                ASD Karibu Baskin Montecchio Maggiore<br />
                C.F. 04301440246<br />
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
          bgcolor: "rgba(0,0,0,0.025)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          pt: { xs: 4, md: 5 },
          pb: { xs: 6, md: 9 },
          scrollMarginTop: { xs: 96, sm: 104 },
        }}
      >
        <Container maxWidth="md">

          {/* Sponsor attuali — logo strip */}
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Grazie a
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            I nostri partner
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Il loro contributo ci permette di allenarci, partecipare ai campionati e portare avanti la nostra missione di inclusione.
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
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 2,
                  overflow: "hidden",
                  transition: "box-shadow 0.2s, transform 0.15s, border-color 0.2s",
                  "&:hover": {
                    boxShadow: "0 4px 16px rgba(230,81,0,0.15)",
                    transform: "translateY(-2px)",
                    borderColor: "rgba(230,81,0,0.4)",
                  },
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
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Unisciti a noi
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Diventa sponsor
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 620 }}>
            Supportare il Karibu Baskin significa investire in uno sport inclusivo, in una comunità vera e
            in un progetto che dal 2015 porta valore al territorio vicentino.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            {PERKS.map((p) => (
              <Grid key={p.title} size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 2, alignItems: "flex-start", height: "100%" }}>
                  <Box sx={{ color: "primary.main", flexShrink: 0, mt: 0.25 }}>
                    <HandshakeIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25 }}>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.desc}</Typography>
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
                Interessato a sponsorizzarci?
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                Scrivici, ti risponderemo il prima possibile.
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
              Scrivici
            </Button>
          </Box>

        </Container>
      </Box>
    </>
  );
}

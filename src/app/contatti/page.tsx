import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";

const CONTACTS = [
  {
    icon: <PhoneIcon />,
    label: "Elisa",
    value: "(+39) 349 297 2703",
    href: "tel:+393492972703",
  },
  {
    icon: <PhoneIcon />,
    label: "Andrea",
    value: "(+39) 335 531 0195",
    href: "tel:+393355310195",
  },
  {
    icon: <EmailIcon />,
    label: "Email",
    value: "asdkaribubaskin@gmail.com",
    href: "mailto:asdkaribubaskin@gmail.com",
  },
];

const SOCIAL = [
  {
    icon: <InstagramIcon sx={{ fontSize: 28 }} />,
    label: "Instagram",
    handle: "@karibubaskin",
    href: "https://www.instagram.com/karibubaskin/",
    color: "#E1306C",
  },
  {
    icon: <FacebookIcon sx={{ fontSize: 28 }} />,
    label: "Facebook",
    handle: "karibubaskin",
    href: "https://www.facebook.com/karibubaskin",
    color: "#1877F2",
  },
  {
    icon: <YouTubeIcon sx={{ fontSize: 28 }} />,
    label: "YouTube",
    handle: "@karibubaskin",
    href: "https://youtube.com/@karibubaskin",
    color: "#FF0000",
  },
];

export default function ContattiPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 6, md: 9 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.06)", pointerEvents: "none" }} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip label="Dove siamo" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            Contatti
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 480, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Hai domande o vuoi venire a giocare con noi? Siamo qui.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Grid container spacing={4}>

          {/* Colonna sinistra */}
          <Grid size={{ xs: 12, md: 6 }}>

            {/* Contatti diretti */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Parlaci
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2.5 }}>
                Come contattarci
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {CONTACTS.map((c) => (
                  <Paper
                    key={c.value}
                    elevation={0}
                    component="a"
                    href={c.href}
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      border: "1px solid rgba(0,0,0,0.07)",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: "0 2px 8px rgba(230,81,0,0.12)",
                      },
                    }}
                  >
                    <Box sx={{ color: "primary.main", display: "flex" }}>{c.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", display: "block", fontSize: "0.65rem" }}>
                        {c.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>{c.value}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Sede */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <LocationOnIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle1" fontWeight={700}>Dove ci alleniamo</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 0.5 }}>
                <strong>Polisportivo Gino Cosaro</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Via del Vigo, 11<br />
                36075 Montecchio Maggiore (VI)
              </Typography>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Dati legali */}
            <Box>
              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 1 }}>
                Dati associazione
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                ASD Karibu Baskin Montecchio Maggiore<br />
                C.F. 04301440246<br />
                Affiliata ENSI ETS, nr. VEN10
              </Typography>
            </Box>

          </Grid>

          {/* Colonna destra — mappa + social */}
          <Grid size={{ xs: 12, md: 6 }}>
            {/* Mappa */}
            <Box sx={{ mb: 4 }}>
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
                  height: 260,
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
            </Box>

            {/* Social */}
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Seguici
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
                Social
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
                    <Box sx={{ color: s.color, display: "flex" }}>{s.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", display: "block", fontSize: "0.65rem" }}>
                        {s.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>{s.handle}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          </Grid>

        </Grid>
      </Container>
    </>
  );
}

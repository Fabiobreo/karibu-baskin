import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Divider, Button,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import HandshakeIcon from "@mui/icons-material/Handshake";
import EmailIcon from "@mui/icons-material/Email";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Image from "next/image";
import Link from "next/link";

const SPONSORS = [
  {
    name: "Denis M. Photographer",
    category: "Fotografia",
    description: "Fotografo ufficiale della squadra. Immortala i momenti più belli in campo e fuori.",
    url: "https://www.facebook.com/Denis.M.photographer",
    logo: "/sponsors/denis.jpg",
  },
  {
    name: "Villani and Partners",
    category: "Servizi professionali",
    description: "Supporto professionale alle attività amministrative e legali dell'associazione.",
    url: "https://villaniandpartners.eu/",
    logo: "/sponsors/villani.png",
  },
  {
    name: "LLP",
    category: "Partner",
    description: "Partner storico del Karibu Baskin, al nostro fianco fin dai primi anni.",
    url: "https://www.llp.it/",
    logo: "/sponsors/LLP.png",
  },
  {
    name: "Tetti Tecchio",
    category: "Edilizia",
    description: "Sostegno concreto alle nostre iniziative e attività sportive sul territorio.",
    url: "https://www.tettitecchio.it/",
    logo: "/sponsors/tettitecchio.png",
  },
  {
    name: "Saby Sport",
    category: "Abbigliamento sportivo",
    description: "Fornitore ufficiale di abbigliamento e attrezzatura sportiva per le nostre squadre.",
    url: "https://www.sabysport.com/",
    logo: "/sponsors/sabysport.png",
  },
  {
    name: "CGRD",
    category: "Partner",
    description: "Partner che condivide i nostri valori di inclusione e sport per tutti.",
    url: "https://www.cgrd.it/it/",
    logo: "/sponsors/cgrd.png",
  },
];

const PERKS = [
  { title: "Logo sul sito", desc: "Il tuo brand visibile su tutte le pagine del sito ufficiale" },
  { title: "Visibilità sui social", desc: "Menzioni su Instagram, Facebook e YouTube" },
  { title: "Logo sulla maglia", desc: "Il tuo logo sulle divise di gara delle nostre squadre" },
  { title: "Presenza agli eventi", desc: "Visibilità durante tornei, allenamenti aperti e iniziative" },
];

export default function SponsorPage() {
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
          <Chip label="I nostri partner" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            Sponsor
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 520, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Un ringraziamento speciale a chi ci supporta ogni giorno, in campo e fuori.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* Sponsor attuali */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Grazie a
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            I nostri sponsor
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3}}>
            Il loro contributo ci permette di allenarci, partecipare ai campionati e portare avanti la nostra missione di inclusione.
          </Typography>
          <Grid container spacing={2}>
            {SPONSORS.map((s) => (
              <Grid key={s.name} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  component="a"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    p: 2.5,
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "row",
                    gap: 2,
                    alignItems: "flex-start",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: "0 2px 12px rgba(230,81,0,0.1)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {/* Logo */}
                  <Box
                    sx={{
                      position: "relative",
                      flexShrink: 0,
                      width: 90,
                      height: 90,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Image
                      src={s.logo}
                      alt={`Logo ${s.name}`}
                      fill
                      style={{ objectFit: "contain", padding: "8px" }}
                    />
                  </Box>

                  {/* Testo */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Chip label={s.category} size="small" sx={{ mb: 1, fontWeight: 600, fontSize: "0.68rem" }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {s.name}
                      </Typography>
                      <OpenInNewIcon sx={{ fontSize: "0.9rem", color: "text.disabled", flexShrink: 0 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {s.description}
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
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Unisciti a noi
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Diventa sponsor
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Supportare il Karibu Baskin significa investire in uno sport inclusivo, in una comunità vera e
            in un progetto che dal 2015 porta valore al territorio vicentino. In cambio offriamo visibilità
            e un legame autentico con i nostri 80 atleti e le loro famiglie.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            {PERKS.map((p) => (
              <Grid key={p.title} size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <HandshakeIcon sx={{ color: "primary.main", flexShrink: 0, mt: 0.3 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25 }}>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.desc}</Typography>
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
                Interessato a sponsorizzarci?
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                Scrivici, ti risponderemo il prima possibile.
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
                Contattaci
              </Button>
            </Link>
          </Box>
        </Box>

      </Container>
    </>
  );
}

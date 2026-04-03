import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Divider, Stack, Button,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";

const VALUES = [
  {
    icon: <FavoriteIcon sx={{ fontSize: 32 }} />,
    title: "Inclusione",
    description: 'Il nome "Karibu" in Swahili significa benvenuto. Chiunque voglia giocare, qualunque sia la sua abilità, è il benvenuto sul nostro campo.',
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 32 }} />,
    title: "Comunità",
    description: "Siamo una famiglia di oltre 80 persone. Ogni allenamento è un momento di crescita condivisa, dentro e fuori dal campo.",
  },
  {
    icon: <EmojiEventsIcon sx={{ fontSize: 32 }} />,
    title: "Impegno",
    description: "Campioni regionali nel 2018, con due squadre nei campionati Veneto 2025/2026. Puntiamo sempre al miglioramento.",
  },
  {
    icon: <LocationOnIcon sx={{ fontSize: 32 }} />,
    title: "Territorio",
    description: "Nati da un progetto di inclusione del Comune di Montecchio Maggiore, siamo un punto di riferimento per tutto il Vicentino.",
  },
];

const STORIA = [
  {
    anno: "2015",
    titolo: "La fondazione",
    testo: "Il Karibu nasce da un progetto di inclusione del Comune di Montecchio Maggiore, spinto dalla passione di 4 giovani donne che amavano lo sport e credevano nel potere dello sport per abbattere le barriere.",
  },
  {
    anno: "2018",
    titolo: "Campioni regionali",
    testo: "Tre anni dopo la fondazione, il Karibu conquista il titolo di campione regionale. Una vittoria che premia il lavoro di tutto il gruppo e consolida la squadra come realtà di riferimento nel Veneto.",
  },
  {
    anno: "2020",
    titolo: "La pandemia",
    testo: "Come tante realtà sportive, anche noi ci siamo fermati. Ma non ci siamo arresi: gli allenamenti sono diventati videochiamate su Zoom, mantenendo vivo lo spirito di squadra in attesa di tornare in campo.",
  },
  {
    anno: "2025",
    titolo: "10 anni e due squadre",
    testo: "Raggiungiamo i 10 anni di attività con oltre 80 iscritti e organizziamo la \"Karibu Ten League\", un torneo celebrativo con 6 squadre partecipanti. Un traguardo che celebra la crescita dell'associazione e apre una nuova era: quella dei Montekki e dei Kapuleti.",
  },
];

const TEAMS = [
  {
    name: "Kapuleti",
    campionato: "Campionato Veneto — Gold Ovest",
    chipColor: "#E65100" as const,
    description:
      "La formazione dei Kapuleti milita nel campionato Veneto Gold Ovest, il livello più competitivo della regione. Formata da 25 ragazzi e ragazze molto affiatati, nel corso di questa stagione vogliono vincere il titolo regionale.",
    badge: "Gold",
  },
  {
    name: "Montekki",
    campionato: "Campionato Veneto — Silver Ovest",
    chipColor: "#616161" as const,
    description:
      "La formazione dei Montekki milita nel campionato Veneto Silver Ovest. Formata sia da nuove leve del Karibu che da giocatori più esperti, quest'anno cercheranno l'affiatamento necessario per poter partecipare con la sorella nel campionato Gold la prossima stagione.",
    badge: "Silver",
  },
];

const STATS = [
  { value: "2015", label: "Anno di fondazione" },
  { value: "80+", label: "Atleti tesserati" },
  { value: "2", label: "Squadre in campo" },
  { value: "1°", label: "Titolo regionale 2018" },
];

export default function LaSquadraPage() {
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
          <Chip label="Chi siamo" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            ASD Karibu Baskin
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 540, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Nati nel 2015 a Montecchio Maggiore. Oltre 80 atleti, 2 squadre, un unico obiettivo: giocare insieme, tutti.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 7 }}>
          {STATS.map((s) => (
            <Grid key={s.label} size={{ xs: 6, md: 3 }}>
              <Paper elevation={0} sx={{ p: 2.5, textAlign: "center", border: "1px solid rgba(0,0,0,0.07)" }}>
                <Typography variant="h4" fontWeight={800} color="primary" sx={{ fontSize: { xs: "1.8rem", md: "2.2rem" } }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  {s.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 7 }} />

        {/* Le squadre */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Stagione 2025 / 2026
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Le nostre squadre
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 620 }}>
            Con oltre 80 atleti tesserati, per la stagione 2025/2026 abbiamo formato due squadre che partecipano ai campionati regionali veneti.
          </Typography>
          <Grid container spacing={3}>
            {TEAMS.map((team) => (
              <Grid key={team.name} size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", height: "100%" }}>
                  <Box sx={{ px: 2.5, py: 2, backgroundColor: team.chipColor, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: "#fff" }}>
                      {team.name}
                    </Typography>
                    <Chip label={team.badge} size="small" sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700 }} />
                  </Box>
                  <Box sx={{ p: 2.5 }}>
                    <Typography variant="caption" color="primary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.07em", display: "block", mb: 1 }}>
                      {team.campionato}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                      {team.description}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Link href="/squadre" style={{ textDecoration: "none" }}>
              <Button variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ fontWeight: 700 }}>
                Vedi le squadre
              </Button>
            </Link>
          </Box>
        </Box>

        <Divider sx={{ mb: 7 }} />

        {/* Storia timeline */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            La nostra storia
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            10 anni di Karibu
          </Typography>
          <Stack spacing={0}>
            {STORIA.map((item, i) => (
              <Box key={item.anno} sx={{ display: "flex", gap: 3 }}>
                {/* Timeline line */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: "primary.main",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <StarIcon sx={{ color: "#fff", fontSize: 18 }} />
                  </Box>
                  {i < STORIA.length - 1 && (
                    <Box sx={{ width: 2, flex: 1, backgroundColor: "rgba(230,81,0,0.2)", my: 0.5 }} />
                  )}
                </Box>
                {/* Content */}
                <Box sx={{ pb: i < STORIA.length - 1 ? 4 : 0 }}>
                  <Typography variant="caption" color="primary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {item.anno}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.25, mb: 0.75 }}>
                    {item.titolo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, maxWidth: 560 }}>
                    {item.testo}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        <Divider sx={{ mb: 7 }} />

        {/* Valori */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            I nostri valori
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Quello in cui crediamo
          </Typography>
          <Grid container spacing={2}>
            {VALUES.map((v) => (
              <Grid key={v.title} size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(0,0,0,0.07)", height: "100%" }}>
                  <Box sx={{ color: "primary.main", mb: 1.5 }}>{v.icon}</Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{v.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {v.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
            borderRadius: 3,
            p: { xs: 3, md: 5 },
            textAlign: "center",
            color: "#fff",
          }}
        >
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
            Vuoi giocare con noi?
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", mb: 3, maxWidth: 420, mx: "auto" }}>
            Iscriviti al prossimo allenamento oppure contattaci per saperne di più.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Button variant="contained" color="primary" size="large" sx={{ px: 4 }}>
                Vedi gli allenamenti
              </Button>
            </Link>
            <Link href="/contatti" style={{ textDecoration: "none" }}>
              <Button variant="outlined" size="large" sx={{ px: 4, color: "#fff", borderColor: "rgba(255,255,255,0.4)", "&:hover": { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.05)" } }}>
                Contattaci
              </Button>
            </Link>
          </Box>
        </Box>

      </Container>
    </>
  );
}

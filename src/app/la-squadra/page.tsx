import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Button,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import Link from "next/link";

const VALUES = [
  {
    icon: <FavoriteIcon sx={{ fontSize: 32 }} />,
    title: "Inclusione",
    description: "Crediamo che lo sport debba essere accessibile a tutti, indipendentemente dall'abilità fisica o cognitiva.",
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 32 }} />,
    title: "Comunità",
    description: "Siamo una famiglia. Ogni allenamento è un momento di crescita condivisa, dentro e fuori dal campo.",
  },
  {
    icon: <EmojiEventsIcon sx={{ fontSize: 32 }} />,
    title: "Impegno",
    description: "Ci alleniamo con serietà e passione, puntando sempre al miglioramento personale e di squadra.",
  },
  {
    icon: <LocationOnIcon sx={{ fontSize: 32 }} />,
    title: "Territorio",
    description: "Siamo radicati a Montecchio Maggiore e vogliamo essere un punto di riferimento per l'inclusione nel Vicentino.",
  },
];

const STATS = [
  { value: "2015", label: "Anno di fondazione" },
  { value: "5", label: "Ruoli attivi" },
  { value: "12+", label: "Atleti tesserati" },
  { value: "FIBA", label: "Disciplina federale" },
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
            Karibu Baskin
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 520, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            La squadra di Baskin di Montecchio Maggiore, nata con un unico obiettivo: giocare insieme, tutti.
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

        {/* Storia */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            La nostra storia
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 2, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Da un campo di basket a qualcosa di più grande
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2, maxWidth: 680 }}>
            Il Karibu Baskin nasce a Montecchio Maggiore con la convinzione che lo sport sia uno strumento
            potente di inclusione sociale. &quot;Karibu&quot; in lingua Swahili significa <em>benvenuto</em>: un nome
            che racconta perfettamente il nostro spirito. Chiunque voglia giocare, qualunque sia la sua
            abilità, è il benvenuto nel nostro campo.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 680 }}>
            Ci alleniamo con regolarità, partecipiamo ai campionati regionali e lavoriamo ogni giorno
            per diffondere la cultura del Baskin nel territorio vicentino, portando in campo atleti
            con e senza disabilità che giocano insieme, alla pari.
          </Typography>
        </Box>

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
            Iscriviti al prossimo allenamento. Non serve esperienza, solo voglia di fare squadra.
          </Typography>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary" size="large" sx={{ px: 4 }}>
              Vedi gli allenamenti
            </Button>
          </Link>
        </Box>

      </Container>
    </>
  );
}

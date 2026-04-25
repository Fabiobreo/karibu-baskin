import { prisma } from "@/lib/db";
import {
  Container, Typography, Box, Grid2 as Grid, Paper, Divider, Stack,
} from "@mui/material";
import SessionCard from "@/components/SessionCard";
import type { SessionWithCount } from "@/components/SessionCard";
import SiteHeader from "@/components/SiteHeader";
import type { TeamsData } from "@/components/TeamDisplay";
import HeroSection from "@/components/HeroSection";
import LoSapeviCard from "@/components/LoSapeviCard";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StarIcon from "@mui/icons-material/Star";

export const revalidate = 0;

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
    testo: 'Raggiungiamo i 10 anni di attività con oltre 80 iscritti e organizziamo la "Karibu Ten League", un torneo celebrativo con 6 squadre partecipanti. Un traguardo che celebra la crescita dell\'associazione e apre una nuova era: quella dei Montekki e dei Kapuleti.',
  },
];

export default async function HomePage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rawSessions = await prisma.trainingSession.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: { _count: { select: { registrations: true } } },
  });

  const sessions = rawSessions.map((s) => ({
    ...s,
    teams: s.teams as unknown as TeamsData | null,
  })) satisfies SessionWithCount[];

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime
      ? new Date(s.endTime)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });

  const upcoming = sessions.filter((s) => new Date(s.date) > now);

  return (
    <>
      <SiteHeader />
      <HeroSection />

      <Container id="allenamenti" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>

        {/* ── In corso ── */}
        {inCorso.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "#2E7D32",
                  flexShrink: 0,
                  "@keyframes pulse": {
                    "0%":   { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                    "70%":  { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
                  },
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
              <Typography variant="overline" fontWeight={700} sx={{ letterSpacing: "0.1em", color: "#2E7D32" }}>
                In corso ({inCorso.length})
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {inCorso.map((s) => (
                <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <SessionCard session={s} live />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Prossimi allenamenti ── */}
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: "0.1em", display: "block", mb: 1.5 }}
        >
          Prossimi allenamenti ({upcoming.length})
        </Typography>

        {upcoming.length === 0 ? (
          <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center", borderStyle: "dashed" }}>
            <Typography color="text.secondary">Nessun allenamento programmato.</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {upcoming.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <SessionCard session={s} />
              </Grid>
            ))}
          </Grid>
        )}

      </Container>

      <LoSapeviCard />

      {/* ── Chi siamo ───────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "rgba(0,0,0,0.02)", borderTop: "1px solid rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)", py: { xs: 6, md: 9 } }}>
        <Container maxWidth="md">

          {/* Valori */}
          <Box sx={{ mb: 8 }}>
            <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
              Chi siamo
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}>
              Quello in cui crediamo
            </Typography>
            <Grid container spacing={2}>
              {/* Inclusione */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(0,0,0,0.07)", height: "100%" }}>
                  <Box sx={{ color: "primary.main", mb: 1.5 }}>
                    <FavoriteIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Inclusione</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Il nome &ldquo;Karibu&rdquo; in Swahili significa benvenuto. Chiunque voglia giocare, qualunque sia la sua abilità, è il benvenuto sul nostro campo.
                  </Typography>
                </Paper>
              </Grid>
              {/* Comunità */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(0,0,0,0.07)", height: "100%" }}>
                  <Box sx={{ color: "primary.main", mb: 1.5 }}>
                    <GroupsIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Comunità</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Siamo una famiglia di oltre 80 persone. Ogni allenamento è un momento di crescita condivisa, dentro e fuori dal campo.
                  </Typography>
                </Paper>
              </Grid>
              {/* Impegno */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(0,0,0,0.07)", height: "100%" }}>
                  <Box sx={{ color: "primary.main", mb: 1.5 }}>
                    <EmojiEventsIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Impegno</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Campioni regionali nel 2018, con due squadre nei campionati Veneto 2025/2026. Puntiamo sempre al miglioramento.
                  </Typography>
                </Paper>
              </Grid>
              {/* Territorio */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: "1px solid rgba(0,0,0,0.07)", height: "100%" }}>
                  <Box sx={{ color: "primary.main", mb: 1.5 }}>
                    <LocationOnIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Territorio</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Nati da un progetto di inclusione del Comune di Montecchio Maggiore, siamo un punto di riferimento per tutto il Vicentino.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 8 }} />

          {/* Storia */}
          <Box>
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

        </Container>
      </Box>
    </>
  );
}

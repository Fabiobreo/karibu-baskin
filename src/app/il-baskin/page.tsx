import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import { ROLE_COLORS } from "@/lib/constants";

const ROLES_INFO = [
  {
    role: 1,
    label: "Ruolo 1",
    description:
      "Atleti con disabilità motoria grave che necessitano di supporto per il movimento. Tirano nel canestro laterale più vicino dalla loro area protetta.",
  },
  {
    role: 2,
    label: "Ruolo 2",
    description:
      "Atleti con disabilità motoria moderata. Possono muoversi autonomamente in sedia a rotelle o con ausili. Tirano nel canestro laterale.",
  },
  {
    role: 3,
    label: "Ruolo 3",
    description:
      "Atleti con disabilità lieve o con difficoltà cognitive. Partecipano attivamente al gioco con alcune limitazioni di movimento.",
  },
  {
    role: 4,
    label: "Ruolo 4",
    description:
      "Atleti normodotati con limitazioni imposte dal regolamento per bilanciare il gioco. Non possono tirare nei canestri principali.",
  },
  {
    role: 5,
    label: "Ruolo 5",
    description:
      "Atleti normodotati senza limitazioni. Possono tirare in qualsiasi canestro e svolgono il ruolo di supporto e inclusione attiva.",
  },
];

const RULES = [
  { icon: <SportsBasketballIcon />, text: "Più canestri: 2 principali e 2 laterali più bassi" },
  { icon: <PeopleAltIcon />, text: "Squadre miste con atleti di ogni abilità, genere ed età" },
  { icon: <AccessibilityNewIcon />, text: "2 aree protette per garantire il tiro ai giocatori di ruolo 1 e 2" },
  { icon: <EmojiEventsIcon />, text: "10 regole speciali che assegnano a ciascun atleta un ruolo su misura" },
];

export default function IlBaskinPage() {
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
          <Chip label="Lo sport" color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
            Il Baskin
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 560, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Il basket integrato nato per permettere a persone con e senza disabilità di giocare insieme, nella stessa squadra, con pari dignità.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* Storia */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Le origini
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 2, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Nato nel 2001 a Cremona
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 680 }}>
            Il Baskin è stato ideato da Antonio Bodini e Fausto Capellini in un contesto scolastico,
            con l&apos;obiettivo di creare uno sport in cui ogni persona — indipendentemente dall&apos;abilità fisica
            o cognitiva — potesse partecipare attivamente e con un ruolo reale nel gioco.
            Oggi è praticato in tutta Italia da migliaia di atleti.
          </Typography>
        </Box>

        {/* Regole */}
        <Box sx={{ mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Come funziona
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            Le regole principali
          </Typography>
          <Grid container spacing={2}>
            {RULES.map((rule, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                  }}
                >
                  <Box sx={{ color: "primary.main", mt: 0.3, flexShrink: 0 }}>{rule.icon}</Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{rule.text}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* I ruoli */}
        <Box>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            I giocatori
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            I 5 ruoli del Baskin
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
            Ogni atleta riceve un ruolo da 1 a 5 in base alle proprie competenze motorie e cognitive.
            Questo garantisce a tutti un contributo reale alla squadra.
          </Typography>
          <Grid container spacing={2}>
            {ROLES_INFO.map((r) => (
              <Grid key={r.role} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.07)",
                    height: "100%",
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, backgroundColor: ROLE_COLORS[r.role] }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fff" }}>
                      {r.label}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {r.description}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

      </Container>
    </>
  );
}

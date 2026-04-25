import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Divider, Stack,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import TimerIcon from "@mui/icons-material/Timer";
import StarIcon from "@mui/icons-material/Star";
import GradeIcon from "@mui/icons-material/Grade";
import { ROLE_COLORS } from "@/lib/constants";

const ROLES_INFO = [
  {
    role: 1,
    label: "Ruolo 1 — Il Pivot Fisso",
    tag: "Pivot",
    canestro: "Laterale basso (h. 1,10 m)",
    punteggio: "3 pt (1 tiro) • 2 pt (2 tiri)",
    marcatura: "Non marcabile",
    description:
      "Atleta con disabilità grave che non può spostarsi autonomamente nemmeno in carrozzina. Staziona nell'area laterale e aspetta che un compagno (tutor) gli consegni la palla. Può scegliere: un solo tiro che vale 3 punti, oppure due tentativi che valgono 2 punti. Ha 10 secondi dalla consegna per tirare. Può usare una palla di dimensioni ridotte.",
  },
  {
    role: 2,
    label: "Ruolo 2 — Il Pivot di Movimento",
    tag: "Pivot",
    canestro: "Laterale alto (h. 2,20 m)",
    punteggio: "2 pt (settore centrale) • 3 pt (settore laterale)",
    marcatura: "Non marcabile",
    description:
      "Atleta con disabilità che possiede l'uso (anche parziale) delle mani e il cammino, ma non la corsa o non riesce a utilizzarla. È un pivot dinamico: riceve la palla in area, effettua almeno 2 palleggi, si sposta in uno dei tre settori del canestro laterale alto e tira. Ha 10 secondi di tempo. Il canestro vale 2 punti dal settore centrale, 3 punti dal settore laterale.",
  },
  {
    role: 3,
    label: "Ruolo 3 — Il Protagonista",
    tag: "Protagonista",
    canestro: "Laterale alto o tradizionale",
    punteggio: "2 pt (laterale) • 3 pt (tradizionale)",
    marcatura: "Solo da Ruolo 3",
    description:
      "Atleta con disabilità che ha uso delle mani, cammino e corsa non fluida con scarso equilibrio. I Ruoli 4 e 5 non possono marcarlo (difesa illegale). Tira nel canestro laterale alto (fuori area) o nel canestro tradizionale. Ogni volta che corre con la palla deve eseguire almeno 2 palleggi durante la corsa. Non contano le infrazioni di passi e doppio, ma ogni tiro effettuato senza i 2 palleggi è annullato. Non può essere marcato da ruoli 4 o 5.",
  },
  {
    role: 4,
    label: "Ruolo 4 — Lo specialista",
    tag: "Specialista",
    canestro: "Solo canestro tradizionale",
    punteggio: "2 pt (avanti) • 3 pt (dietro la linea)",
    marcatura: "Da Ruolo 3 o Ruolo 4",
    description:
      "Atleta con uso delle mani, cammino e corsa fluida con palleggio regolare. Tira esclusivamente nei canestri tradizionali. Il Ruolo 5 non può marcarlo (difesa illegale). Prima di tirare deve obbligatoriamente effettuare un arresto. Valgono le infrazioni di passi e doppio (ma non i passi di partenza). Non può essere marcato da ruoli 5.",
  },
  {
    role: 5,
    label: "Ruolo 5 — Il Regista",
    tag: "Regista",
    canestro: "Solo canestro tradizionale",
    punteggio: "2 pt (avanti) • 3 pt (dietro la linea)",
    marcatura: "Da Ruolo 3, 4 o 5",
    description:
      "Atleta che possiede tutti i fondamentali del basket: palleggio, tiro, entrata, passaggio, difesa. Valgono tutte le regole del basket tradizionale. Può effettuare al massimo 3 tiri per tempo — al quarto tiro il gioco viene fermato e la palla passa alla squadra avversaria. Può marcare solo giocatori dello stesso ruolo.",
  },
];

const RULES = [
  {
    icon: <SportsBasketballIcon />,
    title: "Il campo",
    text: "Campo da basket standard con 2 canestri tradizionali + 2 canestri laterali trasversali (h. 2,20 m). Sotto i laterali è possibile aggiungere un canestro basso (h. 1,10 m) per il Ruolo 1.",
  },
  {
    icon: <TimerIcon />,
    title: "Durata",
    text: "4 tempi da 8 minuti con cronometro fermato a ogni fischio. Nel 4° tempo e nei supplementari ogni squadra ha 30 secondi per concludere l'azione.",
  },
  {
    icon: <PeopleAltIcon />,
    title: "La squadra",
    text: "Fino a 14 giocatori, 6 in campo. La somma dei ruoli in campo non deve superare 23. Obbligatori: 1 pivot, 1 Ruolo 3, almeno 2 Ruolo 5. Tra i ruoli 4 e 5 devono esserci almeno una donna e un uomo.",
  },
  {
    icon: <AccessibilityNewIcon />,
    title: "Protezione dei pivot",
    text: "I giocatori di Ruolo 1 e 2 non possono essere marcati. Hanno aree protette riservate. I Ruoli 3 e 4 non possono essere marcati da ruoli superiori (difesa illegale).",
  },
  {
    icon: <GradeIcon />,
    title: "Canestri e punti",
    text: "Ogni giocatore (ruoli 1–4) può realizzare al massimo 3 canestri per tempo. Il Ruolo 5 può effettuare al massimo 3 tiri per tempo. I punti variano da 2 a 3 in base al ruolo e alla posizione di tiro.",
  },
  {
    icon: <StarIcon />,
    title: "Infrazioni speciali",
    text: "Per i Ruoli 3, 4 e 5 non esiste il limite di campo né l'infrazione di 3 secondi. Per i Ruoli 3 non contano passi e doppio. Per i Ruoli 1 e 2 non contano i falli di campo.",
  },
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
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, maxWidth: 580, mx: "auto", fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Il basket inclusivo nato per permettere a persone con e senza disabilità di giocare insieme, nella stessa squadra, con pari dignità e un ruolo reale nel gioco.
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
            Il Baskin (Basket Inclusivo) è stato ideato da Antonio Bodini e Fausto Capellini in un contesto scolastico,
            con l&apos;obiettivo di creare uno sport in cui ogni persona — indipendentemente dall&apos;abilità fisica o cognitiva —
            potesse partecipare attivamente con un ruolo reale e significativo.
            Il regolamento è gestito dall&apos;Ente Italiano Sport Inclusivi (EISI) di Cremona ed è oggi praticato
            in tutta Italia da migliaia di atleti. Ogni giocatore riceve un numero di ruolo (1–5) che compare
            sulla maglia come prima cifra, seguito da un numero identificativo personale.
          </Typography>
        </Box>

        <Divider sx={{ mb: 7 }} />

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
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{rule.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{rule.text}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 7 }} />

        {/* I ruoli */}
        <Box>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            I giocatori
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 1, fontSize: { xs: "1.6rem", md: "2rem" } }}>
            I 5 ruoli del Baskin
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
            I ruoli vengono assegnati in base alle capacità motorie del giocatore: uso delle mani, cammino, corsa ed equilibrio.
            La somma dei ruoli dei giocatori in campo non può superare <strong>23</strong>.
          </Typography>
          <Stack spacing={2}>
            {ROLES_INFO.map((r) => (
              <Paper
                key={r.role}
                elevation={0}
                sx={{ overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}
              >
                {/* Header colorato */}
                <Box
                  sx={{
                    px: 2.5, py: 1.5,
                    backgroundColor: ROLE_COLORS[r.role],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fff" }}>
                    {r.label}
                  </Typography>
                  <Chip
                    label={r.tag}
                    size="small"
                    sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, fontSize: "0.7rem" }}
                  />
                </Box>

                {/* Body */}
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2 }}>
                    {r.description}
                  </Typography>
                  {/* Badge info */}
                  <Grid container spacing={1}>
                    {[
                      { label: "Canestro", value: r.canestro },
                      { label: "Punteggio", value: r.punteggio },
                      { label: "Marcatura", value: r.marcatura },
                    ].map((info) => (
                      <Grid key={info.label} size={{ xs: 12, sm: 4 }}>
                        <Box
                          sx={{
                            px: 1.5, py: 1,
                            backgroundColor: "rgba(0,0,0,0.03)",
                            borderRadius: 1,
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ display: "block", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.65rem" }}>
                            {info.label}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem", mt: 0.25 }}>
                            {info.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 7 }} />

        {/* Curiosità */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
            Lo sapevi?
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
            Il Baskin è unico al mondo
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", lineHeight: 1.8 }}>
            È l&apos;unico sport di squadra in cui persone con e senza disabilità giocano <strong>insieme</strong>,
            non in categorie separate. Ogni giocatore difende contro il suo corrispondente di ruolo
            e ogni canestro è un contributo reale alla vittoria della squadra.
            Il regolamento ufficiale è curato dall&apos;EISI — Ente Italiano Sport Inclusivi.
          </Typography>
        </Box>

      </Container>
    </>
  );
}

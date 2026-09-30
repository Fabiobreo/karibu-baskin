import { Box, Chip, Paper, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface PlayedMatchRowProps {
  href: string;
  dateLabel: string;
  /** "Casa · Campionato" */
  metaLabel: string;
  isHome: boolean;
  ourName: string;
  theirName: string;
  ourScore: number | null;
  theirScore: number | null;
  result: "WIN" | "LOSS" | "DRAW" | null;
  resultLabel: string | null;
}

/**
 * Riga di una partita giocata, in `/risultati` e nella pagina squadra (UX-18).
 *
 * La nostra squadra sta sempre a sinistra (o sopra): casa/trasferta lo dicono
 * icona e testo, e la colonna si legge dall'alto in basso senza cercare il
 * Karibu da una parte o dall'altra. Sotto i 600 px la riga va su due livelli
 * (data ed esito, poi le squadre una per riga col loro punteggio), cosi' i nomi
 * non vengono mai troncati.
 */
export default function PlayedMatchRow({
  href,
  dateLabel,
  metaLabel,
  isHome,
  ourName,
  theirName,
  ourScore,
  theirScore,
  result,
  resultLabel,
}: PlayedMatchRowProps) {
  const meta = result ? MATCH_RESULT_META[result] : null;
  const hasScore = ourScore !== null && theirScore !== null;

  const teamLine = (name: string, score: number | null, us: boolean) => (
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: us ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold,
          color: us ? "text.primary" : "text.secondary",
          minWidth: 0,
          overflowWrap: "anywhere",
        }}
      >
        {name}
      </Typography>
      {hasScore && (
        <Typography
          variant="body1"
          sx={{
            fontWeight: us ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold,
            color: us ? "text.primary" : "text.secondary",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {score}
        </Typography>
      )}
    </Box>
  );

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": { boxShadow: 2, borderColor: "text.secondary" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "stretch" }}>
          {/* Barra colore risultato */}
          <Box sx={{ width: 5, flexShrink: 0, bgcolor: meta?.color ?? "action.hover" }} />

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              px: 2,
              py: 1.5,
              // Da tablet in su colonne fisse (UX-37): data | noi | punteggio |
              // loro | esito. Il punteggio sta alla stessa x in tutte le righe,
              // qualunque sia la lunghezza dei nomi. Su mobile due livelli (UX-18).
              display: { xs: "flex", sm: "grid" },
              gridTemplateColumns: {
                sm: "136px minmax(0, 1fr) 88px minmax(0, 1fr) 132px",
              },
              alignItems: "center",
              columnGap: 2,
              rowGap: 1,
              flexWrap: "wrap",
            }}
          >
            {/* Data, casa/trasferta, tipo */}
            <Box sx={{ minWidth: 90, flexShrink: 0, order: { xs: 1, sm: 0 } }}>
              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                {dateLabel}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {isHome ? (
                  <HomeIcon aria-hidden sx={{ fontSize: 14, color: "text.secondary" }} />
                ) : (
                  <FlightIcon aria-hidden sx={{ fontSize: 14, color: "text.secondary" }} />
                )}
                <Typography variant="caption" color="text.secondary">
                  {metaLabel}
                </Typography>
              </Box>
            </Box>

            {/* Squadre: su mobile una per riga, dal tablet in linea */}
            <Box
              sx={{
                order: { xs: 3, sm: 0 },
                flex: "1 1 100%",
                minWidth: 0,
                // Sul tablet i tre pezzi (noi, punteggio, loro) diventano
                // colonne della griglia della riga.
                display: { sm: "contents" },
              }}
            >
              <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column", gap: 0.25 }}>
                {teamLine(ourName, ourScore, true)}
                {teamLine(theirName, theirScore, false)}
              </Box>
              <Box sx={{ display: { xs: "none", sm: "contents" } }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: FONT_WEIGHT.bold,
                    textAlign: "right",
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  {ourName}
                </Typography>
                <Typography
                  variant="h6"
                  component="span"
                  sx={{
                    fontWeight: FONT_WEIGHT.bold,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    color: hasScore ? "text.primary" : "text.secondary",
                  }}
                >
                  {hasScore ? `${ourScore}–${theirScore}` : "vs"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: FONT_WEIGHT.semibold,
                    color: "text.secondary",
                    textAlign: "left",
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  {theirName}
                </Typography>
              </Box>
            </Box>

            {/* Esito */}
            <Box
              sx={{
                order: { xs: 2, sm: 0 },
                ml: "auto",
                flexShrink: 0,
                justifyContent: "flex-end",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {meta && resultLabel && (
                <Chip
                  label={resultLabel}
                  size="small"
                  sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: FONT_WEIGHT.bold }}
                />
              )}
              <ChevronRightIcon aria-hidden sx={{ fontSize: 18, color: "text.secondary" }} />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Link>
  );
}

"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, Grid2 as Grid, Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SessionCard, { type SessionWithCount } from "@/components/SessionCard";

// ── Componente principale ─────────────────────────────────────────────────────

export default function AllenamentiClient({
  inCorso,
  upcoming,
  past,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  past: SessionWithCount[];
}) {
  const [showPast, setShowPast] = useState(false);

  return (
    <Box>
      {/* ── In corso ── */}
      {inCorso.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            {/* Pallino pulsante */}
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#2E7D32",
                flexShrink: 0,
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                  "70%": { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
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

      {/* ── Prossimi ── */}
      <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: "0.1em", display: "block", mb: 1.5 }}>
        Prossimi ({upcoming.length})
      </Typography>

      {upcoming.length === 0 ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: "center", mb: 4, borderStyle: "dashed" }}>
          <Typography color="text.secondary">Nessun allenamento programmato.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {upcoming.map((s) => (
            <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <SessionCard session={s} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Passati ── */}
      {past.length > 0 && (
        <Box>
          <Button
            size="small"
            endIcon={showPast ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowPast((v) => !v)}
            sx={{ color: "text.secondary", fontWeight: 600, mb: showPast ? 1.5 : 0 }}
          >
            Allenamenti passati ({past.length})
          </Button>
          {showPast && (
            <Grid container spacing={2}>
              {past.map((s) => (
                <Grid key={s.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <SessionCard session={s} muted />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}


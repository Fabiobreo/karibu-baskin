"use client";

import {
  Box, Typography, Paper, Button, Stack, Divider, Select, MenuItem,
  FormControl, InputLabel, Chip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import GroupsIcon from "@mui/icons-material/Groups";
import EventIcon from "@mui/icons-material/Event";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useState } from "react";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth();
const CURRENT_SEASON_START = CURRENT_MONTH >= 8 ? CURRENT_YEAR : CURRENT_YEAR - 1;

function seasonLabel(start: number) {
  return `${start}-${String(start + 1).slice(-2)}`;
}

const SEASONS = Array.from({ length: 4 }, (_, i) => seasonLabel(CURRENT_SEASON_START - i));

export default function AdminEsportaPage() {
  const [season, setSeason] = useState(SEASONS[0]);

  function download(type: string, params: Record<string, string> = {}) {
    const url = new URL("/api/admin/export", window.location.origin);
    url.searchParams.set("type", type);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    window.open(url.toString(), "_blank");
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Esporta dati</Typography>
        <Typography variant="body2" color="text.secondary">
          Scarica i dati in formato CSV, compatibile con Excel e Google Sheets.
        </Typography>
      </Box>

      {/* Filtro stagione globale */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>Stagione di riferimento</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Stagione</InputLabel>
          <Select value={season} label="Stagione" onChange={(e) => setSeason(e.target.value as string)}>
            <MenuItem value=""><em>Tutte le stagioni</em></MenuItem>
            {SEASONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Chip label={season || "Tutte"} color="primary" size="small" sx={{ fontWeight: 700 }} />
      </Paper>

      <Stack spacing={2}>
        {/* Rosa */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <GroupsIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Rosa giocatori</Typography>
                <Typography variant="body2" color="text.secondary">
                  Nome, email, ruolo app, ruolo Baskin, genere, data nascita, squadra, totale allenamenti.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => download("rosa", ...(season ? [{ season }] : [{}]))}
            >
              Scarica CSV
            </Button>
          </Box>
        </Paper>

        <Divider />

        {/* Presenze */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <EventIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Presenze allenamenti</Typography>
                <Typography variant="body2" color="text.secondary">
                  Una riga per ogni presenza: data, allenamento, atleta, email, ruolo Baskin.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => download("presenze", ...(season ? [{ season }] : [{}]))}
            >
              Scarica CSV
            </Button>
          </Box>
        </Paper>

        <Divider />

        {/* Statistiche */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <BarChartIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Statistiche partite</Typography>
                <Typography variant="body2" color="text.secondary">
                  Punti, canestri, assist, rimbalzi, falli per ogni giocatore per ogni partita.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => download("stats", ...(season ? [{ season }] : [{}]))}
            >
              Scarica CSV
            </Button>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}

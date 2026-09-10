"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Button,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import TrainingMatchResults from "@/components/training/TrainingMatchResults";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import type { TeamsData } from "@/lib/schemas";

interface Athlete {
  id: string;
  name: string;
  role: number;
  attended: boolean | null;
}

export interface AdminSessionRow {
  id: string;
  title: string;
  date: string;
  dateSlug: string | null;
  athleteCount: number;
  presentCount: number;
  athletes: Athlete[];
  expectedResults: number;
  teams: TeamsData | null;
}

// ── Lista presenze ────────────────────────────────────────────────────────────

function AttendanceList({ athletes }: { athletes: Athlete[] }) {
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleToggle(a: Athlete) {
    const current = a.id in overrides ? overrides[a.id] : a.attended;
    const next = current == null ? true : current === true ? false : null;
    setToggling(a.id);
    setOverrides((prev) => ({ ...prev, [a.id]: next }));
    try {
      const res = await fetch(`/api/registrations/${a.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended: next }),
      });
      if (!res.ok) {
        setOverrides((prev) => ({ ...prev, [a.id]: current ?? null }));
        showToast({ message: "Errore nell'aggiornamento", severity: "error" });
      }
    } catch {
      setOverrides((prev) => ({ ...prev, [a.id]: current ?? null }));
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setToggling(null);
    }
  }

  if (athletes.length === 0) {
    return (
      <Typography variant="caption" color="text.disabled">
        Nessun iscritto
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      {athletes.map((a) => {
        const effective = a.id in overrides ? overrides[a.id] : a.attended;
        const color = ROLE_COLORS[a.role] ?? "#9E9E9E";
        const isToggling = toggling === a.id;

        return (
          <Box
            key={a.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              py: 0.25,
              px: 0.5,
              borderRadius: 1,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: color,
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                fontSize: "0.82rem",
                color: effective === false ? "text.disabled" : "text.primary",
              }}
            >
              {a.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: "0.65rem", mr: 0.25 }}
            >
              {ROLE_LABELS[a.role]}
            </Typography>
            <Tooltip
              title={
                effective === true
                  ? "Presente (clicca per segnare assente)"
                  : effective === false
                    ? "Assente (clicca per resettare)"
                    : "Non marcato (clicca per segnare presente)"
              }
              arrow
              placement="left"
            >
              <span>
                {/* 44px pieni: e' l'azione piu' ripetuta della pagina e si
                    usa col pollice, in palestra. */}
                <IconButton
                  onClick={() => handleToggle(a)}
                  disabled={isToggling}
                  aria-label={
                    effective === true
                      ? `${a.name}: presente`
                      : effective === false
                        ? `${a.name}: assente`
                        : `${a.name}: non marcato`
                  }
                  sx={{ width: 44, height: 44, color: "inherit" }}
                >
                  {isToggling ? (
                    <CircularProgress size={22} />
                  ) : effective === true ? (
                    <CheckCircleIcon sx={{ fontSize: 26, color: "success.main" }} />
                  ) : effective === false ? (
                    <CancelIcon sx={{ fontSize: 26, color: "error.main" }} />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ fontSize: 26, color: "text.secondary" }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Card sessione ─────────────────────────────────────────────────────────────

function SessionCard({ s, onComplete }: { s: AdminSessionRow; onComplete: () => void }) {
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const hasAthletes = s.athleteCount > 0;
  const [confirming, setConfirming] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const { showToast } = useToast();

  async function handleConclude() {
    setConcluding(true);
    try {
      const res = await fetch(`/api/sessions/${s.id}/conclude`, { method: "POST" });
      if (res.ok) {
        onComplete();
      } else {
        showToast({ message: "Errore durante la conclusione", severity: "error" });
        setConfirming(false);
      }
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
      setConfirming(false);
    } finally {
      setConcluding(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.grey[50],
          display: "flex",
          alignItems: "baseline",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ "&:hover": { textDecoration: "underline" } }}
          >
            {s.title}
          </Typography>
        </Link>
        <Typography variant="caption" color="text.secondary">
          {format(new Date(s.date), "EEEE d MMMM yyyy", { locale: it })}
        </Typography>
      </Box>

      {/* Body: due colonne quando c'e' qualcosa da mettere nella seconda */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: hasAthletes ? "1fr 1fr" : "1fr" },
        }}
      >
        {/* Colonna sinistra: presenze */}
        <Box
          sx={{
            p: 2.5,
            borderRight: { md: hasAthletes ? "1px solid" : "none" },
            borderColor: { md: "divider" },
          }}
        >
          <Typography
            variant="overline"
            fontWeight={700}
            color="text.secondary"
            sx={{ letterSpacing: "0.08em" }}
          >
            Presenze: {s.presentCount}/{s.athleteCount}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <AttendanceList athletes={s.athletes} />
        </Box>

        {/* Colonna destra: risultati. Senza iscritti non c'e' nessuna
            partitella da registrare, e il form chiedeva "Arancioni vs Neri"
            anche sugli allenamenti con zero presenze. */}
        {hasAthletes && (
          <Box sx={{ p: 2.5 }}>
            <TrainingMatchResults sessionId={s.id} isStaff={true} teams={s.teams} />
          </Box>
        )}
      </Box>

      {/* Footer: concludi */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1.5,
          bgcolor: (theme) =>
            confirming
              ? alpha(theme.palette.success.main, 0.08)
              : theme.palette.mode === "dark"
                ? theme.palette.background.default
                : theme.palette.grey[50],
          transition: "background-color 0.2s",
        }}
      >
        {confirming ? (
          <>
            <Typography variant="body2" fontWeight={600} color="success.dark">
              Confermi di aver completato la gestione?
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setConfirming(false)}
              disabled={concluding}
            >
              Annulla
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={handleConclude}
              disabled={concluding}
              startIcon={
                concluding ? <CircularProgress size={13} color="inherit" /> : <DoneAllIcon />
              }
            >
              {concluding ? "Salvataggio..." : "Sì, concludi"}
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<DoneAllIcon />}
            onClick={() => setConfirming(true)}
            sx={{ fontWeight: 700 }}
          >
            Concludi allenamento
          </Button>
        )}
      </Box>
    </Paper>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminAllenamentiClient({ sessions }: { sessions: AdminSessionRow[] }) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
        <CheckCircleIcon sx={{ fontSize: 40, color: "success.main", mb: 1 }} />
        <Typography fontWeight={700}>Tutto in ordine!</Typography>
        <Typography variant="body2" color="text.secondary">
          Nessun allenamento passato richiede attenzione.
        </Typography>
      </Paper>
    );
  }

  // Quindici allenamenti arretrati di fila sono troppi da scorrere: il mese e'
  // il raggruppamento naturale, e le sessioni arrivano gia' ordinate per data.
  const months: { key: string; label: string; items: AdminSessionRow[] }[] = [];
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(s);
    else months.push({ key, label: format(d, "MMMM yyyy", { locale: it }), items: [s] });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* La legenda del ciclo a tre stati stava dentro ogni card, ripetuta
          quindici volte e in un grigio troppo chiaro. Una volta sola, qui. */}
      <Paper
        variant="outlined"
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "action.hover",
        }}
      >
        <TouchAppIcon sx={{ fontSize: 18, color: "text.secondary" }} />
        <Typography variant="body2" color="text.secondary">
          Nelle presenze, tocca il pallino per ciclare:{" "}
          <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>
            presente
          </Box>{" "}
          →{" "}
          <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
            assente
          </Box>{" "}
          → non marcato.
        </Typography>
      </Paper>

      {months.map((m) => (
        <Box key={m.key} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography
            variant="overline"
            component="h2"
            fontWeight={800}
            color="text.secondary"
            sx={{ letterSpacing: "0.1em", textTransform: "capitalize" }}
          >
            {m.label} · {m.items.length}
          </Typography>
          {m.items.map((s) => (
            <SessionCard key={s.id} s={s} onComplete={() => router.refresh()} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

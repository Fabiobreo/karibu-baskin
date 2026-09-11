"use client";

import { useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Button,
  IconButton,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import type { SimResult } from "@/lib/rating/matchSimulator";
import { simPlayerKey } from "@/lib/rating/simulatorShared";
import type { SimulateInput } from "@/lib/schemas/simulator";
import {
  validateLineup,
  canAddToLineup,
  LINEUP_SIZE,
  type LineupChecks,
} from "@/lib/rating/lineupRules";
import SimulatorResult from "@/components/teams/SimulatorResult";
import SimulatorChecklist from "@/components/teams/SimulatorChecklist";
import SimulatorPool from "@/components/teams/SimulatorPool";

/**
 * Giocatore selezionabile nel simulatore.
 *
 * Nessun campo di rating: il TrueSkill è visibile solo allo staff, e la
 * simulazione avviene sul server (`POST /api/simulator`). Il client sceglie chi
 * schierare e riceve solo probabilità e punteggio.
 */
export interface SimPlayer {
  id: string;
  kind: "user" | "child";
  name: string;
  image: string | null;
  sportRole: number | null;
  gender: "MALE" | "FEMALE" | null;
  teamName: string;
}

export interface SimTeam {
  id: string;
  name: string;
  roster: SimPlayer[];
}

/** Stato iniziale calcolato dal server a partire da un link "sfida" condiviso. */
export interface SimInitialState {
  selA: string[];
  selB: string[];
  nonce: number;
  result: SimResult | null;
}

interface MatchSimulatorProps {
  teams: SimTeam[];
  initial?: SimInitialState;
}

const keyOf = (p: SimPlayer) => simPlayerKey(p.kind, p.id);

/** Ordina per ruolo crescente (senza ruolo in fondo), poi per nome. */
const byRoleThenName = (a: SimPlayer, b: SimPlayer) =>
  (a.sportRole ?? 99) - (b.sportRole ?? 99) || a.name.localeCompare(b.name);

const EMPTY_INITIAL: SimInitialState = { selA: [], selB: [], nonce: 0, result: null };

export default function MatchSimulator({ teams, initial = EMPTY_INITIAL }: MatchSimulatorProps) {
  const t = useTranslations("simulator");
  const { showToast } = useToast();

  const [selA, setSelA] = useState<string[]>(initial.selA);
  const [selB, setSelB] = useState<string[]>(initial.selB);
  const [nonce, setNonce] = useState(initial.nonce);
  const [result, setResult] = useState<SimResult | null>(initial.result);

  // Ogni richiesta ha un numero: una risposta arrivata dopo che l'utente ha
  // cambiato formazione riguarda una sfida che non esiste più, e va scartata.
  const latestRequest = useRef(0);

  const simulate = useMutation({
    mutationFn: async (input: SimulateInput): Promise<SimResult> => {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res));
      return res.json();
    },
  });

  // Pool: tutti i giocatori di tutte le squadre della stagione (dedup per
  // chiave: chi milita in più squadre compare una sola volta).
  const pool = useMemo<SimPlayer[]>(() => {
    const seen = new Set<string>();
    const all: SimPlayer[] = [];
    for (const team of teams) {
      for (const p of team.roster) {
        const k = keyOf(p);
        if (seen.has(k)) continue;
        seen.add(k);
        all.push(p);
      }
    }
    return all;
  }, [teams]);

  const byKey = useMemo(() => {
    const m = new Map<string, SimPlayer>();
    for (const team of teams) for (const p of team.roster) m.set(keyOf(p), p);
    return m;
  }, [teams]);

  const available = useMemo(
    () => pool.filter((p) => !selA.includes(keyOf(p)) && !selB.includes(keyOf(p))),
    [pool, selA, selB]
  );

  // Giocatori schierati, ordinati per ruolo e poi per nome (l'ordine non incide
  // su validazione/simulazione, che sono indipendenti dall'ordine).
  const playersA = useMemo(
    () =>
      selA
        .map((k) => byKey.get(k))
        .filter((p): p is SimPlayer => !!p)
        .sort(byRoleThenName),
    [selA, byKey]
  );
  const playersB = useMemo(
    () =>
      selB
        .map((k) => byKey.get(k))
        .filter((p): p is SimPlayer => !!p)
        .sort(byRoleThenName),
    [selB, byKey]
  );
  const checksA = useMemo(() => validateLineup(playersA), [playersA]);
  const checksB = useMemo(() => validateLineup(playersB), [playersB]);
  const canSimulate = checksA.valid && checksB.valid;

  /** Invalida risultato e richieste in corso: la formazione è cambiata. */
  function clearResult() {
    latestRequest.current++;
    setResult(null);
  }

  // Una scelta è ammessa solo se non rende la formazione non valida (regole
  // condivise in lib/rating/lineupRules.ts).
  function canAssign(p: SimPlayer, side: "A" | "B"): boolean {
    return canAddToLineup(side === "A" ? playersA : playersB, p);
  }

  function assign(p: SimPlayer, side: "A" | "B") {
    const k = keyOf(p);
    if (!canAssign(p, side)) return;
    setSelA((prev) =>
      side === "A" ? [...prev.filter((x) => x !== k), k] : prev.filter((x) => x !== k)
    );
    setSelB((prev) =>
      side === "B" ? [...prev.filter((x) => x !== k), k] : prev.filter((x) => x !== k)
    );
    clearResult();
  }

  function unassign(k: string) {
    setSelA((prev) => prev.filter((x) => x !== k));
    setSelB((prev) => prev.filter((x) => x !== k));
    clearResult();
  }

  function resetSelection() {
    setSelA([]);
    setSelB([]);
    clearResult();
  }

  function runSim(useNonce: number) {
    const requestId = ++latestRequest.current;
    simulate.mutate(
      { a: selA, b: selB, nonce: useNonce },
      {
        onSuccess: (r) => {
          if (requestId === latestRequest.current) setResult(r);
        },
        onError: () => {
          if (requestId === latestRequest.current) {
            showToast({ message: t("simulateError"), severity: "error" });
          }
        },
      }
    );
  }

  function handleSimulate() {
    if (!canSimulate) return;
    runSim(nonce);
  }

  function handleRematch() {
    const next = nonce + 1;
    setNonce(next);
    runSim(next);
  }

  async function handleShare() {
    const params = new URLSearchParams();
    params.set("a", selA.join(","));
    params.set("b", selB.join(","));
    params.set("s", String(nonce));
    const url = `${window.location.origin}/squadre/sfida?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: t("shareCopied"), severity: "success" });
    } catch {
      showToast({ message: url, severity: "info" });
    }
  }

  return (
    <Box>
      {/* Sestetti A / B */}
      <Box
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}
      >
        <SideColumn
          title={t("teamA")}
          colorToken="primary.main"
          players={playersA}
          checks={checksA}
          onRemove={unassign}
          emptyText={t("emptySide")}
          countLabel={t("playerCount", { count: checksA.count, full: LINEUP_SIZE })}
        />
        <SideColumn
          title={t("teamB")}
          colorToken="secondary.main"
          players={playersB}
          checks={checksB}
          onRemove={unassign}
          emptyText={t("emptySide")}
          countLabel={t("playerCount", { count: checksB.count, full: LINEUP_SIZE })}
        />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={
            simulate.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SportsBasketballIcon />
            )
          }
          disabled={!canSimulate || simulate.isPending}
          onClick={handleSimulate}
          sx={{ fontWeight: 800, flex: 1 }}
        >
          {t("simulate")}
        </Button>
        {(selA.length > 0 || selB.length > 0) && (
          <Button variant="text" color="inherit" onClick={resetSelection}>
            {t("reset")}
          </Button>
        )}
      </Stack>
      {!canSimulate && (selA.length > 0 || selB.length > 0) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          {t("needValid")}
        </Typography>
      )}

      {result && (
        <SimulatorResult
          result={result}
          nameA={t("teamA")}
          nameB={t("teamB")}
          onRematch={handleRematch}
          onShare={handleShare}
        />
      )}

      <Divider sx={{ my: 3 }} />

      {/* Pool disponibili — raggruppato per ruolo */}
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={700}
        sx={{ letterSpacing: "0.1em" }}
      >
        {t("allPlayers")}
      </Typography>
      {available.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t("allAssigned")}
        </Typography>
      ) : (
        <SimulatorPool players={available} canAssign={canAssign} onAssign={assign} />
      )}
    </Box>
  );
}

function SideColumn({
  title,
  colorToken,
  players,
  checks,
  onRemove,
  emptyText,
  countLabel,
}: {
  title: string;
  colorToken: string;
  players: SimPlayer[];
  checks: LineupChecks;
  onRemove: (k: string) => void;
  emptyText: string;
  countLabel: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        borderColor: checks.valid ? "success.main" : "divider",
        borderWidth: checks.valid ? 2 : 1,
        minHeight: 120,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: colorToken }}>
            {title}
          </Typography>
          {checks.valid && <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />}
        </Box>
        <Chip label={countLabel} size="small" sx={{ fontWeight: 700 }} />
      </Box>
      {players.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {players.map((p) => (
            <Box key={keyOf(p)} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar src={p.image ?? undefined} sx={{ width: 28, height: 28, fontSize: 13 }}>
                {p.name[0]}
              </Avatar>
              {p.sportRole != null && (
                <Chip
                  label={`R${p.sportRole}`}
                  size="small"
                  sx={{ height: 18, fontSize: 11, fontWeight: 700 }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {p.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block", lineHeight: 1.1 }}
                >
                  {p.teamName}
                </Typography>
              </Box>
              {p.gender === "FEMALE" && (
                <FemaleIcon sx={{ fontSize: 15, color: "secondary.main" }} />
              )}
              {p.gender === "MALE" && <MaleIcon sx={{ fontSize: 15, color: "text.disabled" }} />}
              <IconButton size="small" onClick={() => onRemove(keyOf(p))} aria-label="remove">
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      <SimulatorChecklist checks={checks} />
    </Paper>
  );
}

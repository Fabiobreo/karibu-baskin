"use client";

import { useMemo, useState } from "react";
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
} from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import CloseIcon from "@mui/icons-material/Close";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { simulateMatch, type SimResult } from "@/lib/rating/matchSimulator";
import {
  validateLineup,
  canAddToLineup,
  LINEUP_SIZE,
  type LineupChecks,
} from "@/lib/rating/lineupRules";
import SimulatorResult from "@/components/teams/SimulatorResult";
import SimulatorChecklist from "@/components/teams/SimulatorChecklist";
import SimulatorPool from "@/components/teams/SimulatorPool";

export interface SimPlayer {
  id: string;
  kind: "user" | "child";
  name: string;
  image: string | null;
  sportRole: number | null;
  mu: number | null;
  gender: "MALE" | "FEMALE" | null;
  teamName: string;
}

export interface SimTeam {
  id: string;
  name: string;
  roster: SimPlayer[];
}

interface MatchSimulatorProps {
  teams: SimTeam[];
}

const keyOf = (p: SimPlayer) => `${p.kind}-${p.id}`;

/** Ordina per ruolo crescente (senza ruolo in fondo), poi per nome. */
const byRoleThenName = (a: SimPlayer, b: SimPlayer) =>
  (a.sportRole ?? 99) - (b.sportRole ?? 99) || a.name.localeCompare(b.name);

export default function MatchSimulator({ teams }: MatchSimulatorProps) {
  const t = useTranslations("simulator");
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // Stato iniziale derivato una sola volta dalla querystring (?a=&b=&s=):
  // permette di aprire un link "sfida" già impostato e simulato. Niente effetto
  // di mount → niente cascading render.
  const [initial] = useState(() => computeInitial(teams, searchParams));
  const [selA, setSelA] = useState<string[]>(initial.selA);
  const [selB, setSelB] = useState<string[]>(initial.selB);
  const [nonce, setNonce] = useState(initial.nonce);
  const [result, setResult] = useState<SimResult | null>(initial.result);

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
    setResult(null);
  }

  function unassign(k: string) {
    setSelA((prev) => prev.filter((x) => x !== k));
    setSelB((prev) => prev.filter((x) => x !== k));
    setResult(null);
  }

  function resetSelection() {
    setSelA([]);
    setSelB([]);
    setResult(null);
  }

  function runSim(useNonce: number) {
    setResult(
      simulateMatch({
        teamAMus: selA.map((k) => byKey.get(k)?.mu ?? null),
        teamBMus: selB.map((k) => byKey.get(k)?.mu ?? null),
        seed: buildSeed(selA, selB, useNonce),
      })
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
          startIcon={<SportsBasketballIcon />}
          disabled={!canSimulate}
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

function buildSeed(a: string[], b: string[], nonce: number): string {
  return `${[...a].sort().join(",")}|${[...b].sort().join(",")}|${nonce}`;
}

interface InitialState {
  selA: string[];
  selB: string[];
  nonce: number;
  result: SimResult | null;
}

/** Deriva lo stato iniziale dalla querystring (chiavi valide filtrate sul roster). */
function computeInitial(teams: SimTeam[], sp: { get(name: string): string | null }): InitialState {
  const playerByKey = new Map<string, SimPlayer>();
  for (const team of teams) for (const p of team.roster) playerByKey.set(keyOf(p), p);

  const parse = (v: string | null) => (v ? v.split(",").filter((k) => playerByKey.has(k)) : []);
  const selA = parse(sp.get("a"));
  const selB = parse(sp.get("b"));

  const nRaw = sp.get("s");
  const nParsed = nRaw ? Number(nRaw) : 0;
  const nonce = Number.isFinite(nParsed) ? nParsed : 0;

  // Auto-simula solo se entrambe le formazioni del link sono valide secondo le
  // regole Baskin (coerente con il gate del pulsante "Simula").
  const playersA = selA.map((k) => playerByKey.get(k)!).filter(Boolean);
  const playersB = selB.map((k) => playerByKey.get(k)!).filter(Boolean);
  let result: SimResult | null = null;
  if (validateLineup(playersA).valid && validateLineup(playersB).valid) {
    result = simulateMatch({
      teamAMus: playersA.map((p) => p.mu),
      teamBMus: playersB.map((p) => p.mu),
      seed: buildSeed(selA, selB, nonce),
    });
  }

  return { selA, selB, nonce, result };
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
            <Box key={`${p.kind}-${p.id}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
              <IconButton
                size="small"
                onClick={() => onRemove(`${p.kind}-${p.id}`)}
                aria-label="remove"
              >
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

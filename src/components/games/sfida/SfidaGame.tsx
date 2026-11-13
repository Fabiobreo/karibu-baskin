"use client";

import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import ShareSection from "@/components/common/ShareSection";
import SfidaBoard from "@/components/games/sfida/SfidaBoard";
import SfidaLineup from "@/components/games/sfida/SfidaLineup";
import SfidaNameDialog from "@/components/games/sfida/SfidaNameDialog";
import SfidaQuarters from "@/components/games/sfida/SfidaQuarters";
import SfidaSwapSheet, { type SwapChoice } from "@/components/games/sfida/SfidaSwapSheet";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import {
  MAX_ROSTER,
  quarterPlan,
  quartersPlayed,
  shuffle,
  swapOptions,
  type SfidaGrouping,
  type SfidaMode,
  type SwapBlock,
} from "@/lib/games/sfida";
import {
  buildSfida,
  seasonTeamsPlayable,
  sfidaSearchParams,
  type SfidaPlayerView,
  type SfidaSide,
  type SfidaState,
  type SfidaTeamView,
} from "@/lib/games/sfidaState";
import { RADIUS } from "@/lib/radius";
import { mulberry32 } from "@/lib/seededRandom";

/** Il risultato come lo mostra il tabellone. */
export type SfidaOutcome =
  | { kind: "six"; scoreA: number; scoreB: number; winner: "A" | "B" | "draw"; pctA: number }
  | {
      kind: "full";
      scoreA: number;
      scoreB: number;
      winner: "A" | "B";
      quarters: { a: number; b: number }[];
    };

interface SfidaGameProps {
  players: readonly SfidaPlayerView[];
  teams: readonly SfidaTeamView[];
  names: readonly string[];
  initial: SfidaState;
  initialOutcome: SfidaOutcome | null;
  /** La partita intera non si poteva fare: si parte dal sei contro sei, e lo si dice. */
  initialNotice?: "fullNotPossible" | null;
}

type Sheet = { side: 0 | 1; quarter: number | null; out: string | null };

const byRole = (a: SfidaPlayerView, b: SfidaPlayerView) =>
  (a.sportRole ?? 9) - (b.sportRole ?? 9) || a.name.localeCompare(b.name);

const freshRand = () => mulberry32(Math.floor(Math.random() * 2 ** 31));

/**
 * La Sfida (UX-69): si apre con una partita pronta, si gioca con un tocco, si
 * cambia per sostituzione. Due modi, partita intera in 4 tempi e sei contro
 * sei; squadre della stagione o tutti mescolati. Le regole del Baskin le
 * rispetta l'app: si scelgono solo cambi possibili. Il risultato lo calcola il
 * server (`POST /api/simulator`), che non manda mai livelli.
 */
export default function SfidaGame({
  players,
  teams,
  names,
  initial,
  initialOutcome,
  initialNotice = null,
}: SfidaGameProps) {
  const t = useTranslations("simulator");
  const { showToast } = useToast();
  const ctx = useMemo(() => ({ players, teams, names }), [players, teams, names]);
  const byKey = useMemo(() => new Map(players.map((p) => [p.key, p])), [players]);
  const canSeason = useMemo(() => seasonTeamsPlayable(ctx, "six").length >= 2, [ctx]);

  const [state, setState] = useState<SfidaState>(initial);
  const [outcome, setOutcome] = useState<SfidaOutcome | null>(initialOutcome);
  const [notice, setNotice] = useState<string | null>(initialNotice ? t(initialNotice) : null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [renaming, setRenaming] = useState<0 | 1 | null>(null);
  const [convocati, setConvocati] = useState<0 | 1 | null>(null);
  const [openQuarter, setOpenQuarter] = useState<number | null>(null);
  const latest = useRef(0);

  const resolve = (keys: readonly string[]) =>
    keys
      .map((k) => byKey.get(k))
      .filter((p): p is SfidaPlayerView => !!p)
      .sort(byRole);

  /** Ogni cambio di squadre cancella il risultato e le risposte in arrivo. */
  function update(next: SfidaState) {
    latest.current++;
    setOutcome(null);
    setState(next);
  }

  function rebuild(mode: SfidaMode, grouping: SfidaGrouping) {
    let next = buildSfida(ctx, { mode, grouping }, freshRand());
    let msg: string | null = null;
    if (!next && mode === "full") {
      next = buildSfida(ctx, { mode: "six", grouping }, freshRand());
      msg = t("fullNotPossible");
    }
    if (!next) return;
    if (grouping === "season" && next.grouping === "mixed") msg = t("seasonNeedsTwo");
    setNotice(msg);
    update(next);
  }

  function setSide(i: 0 | 1, patch: Partial<SfidaSide>) {
    const sides = [...state.sides] as [SfidaSide, SfidaSide];
    sides[i] = { ...sides[i], ...patch };
    update({ ...state, sides });
  }

  // ── Gioca ──────────────────────────────────────────────────────────────────
  const simulate = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res));
      return res.json();
    },
  });

  const [a, b] = state.sides;
  const ready =
    state.mode === "six"
      ? a.lineup.length === 6 && b.lineup.length === 6
      : a.quarters.length === 4 && b.quarters.length === 4;

  function play(nonce: number) {
    if (!ready) return;
    const id = ++latest.current;
    const body =
      state.mode === "six"
        ? { mode: "six", a: a.lineup, b: b.lineup, nonce }
        : { mode: "full", qa: a.quarters, qb: b.quarters, nonce };
    setState((s) => ({ ...s, nonce }));
    simulate.mutate(body, {
      onSuccess: (r) => {
        if (id !== latest.current) return;
        setOutcome(
          state.mode === "six"
            ? {
                kind: "six",
                scoreA: r.scoreA,
                scoreB: r.scoreB,
                winner: r.winner,
                pctA: Math.round(r.winProbabilityA * 100),
              }
            : { kind: "full", ...r }
        );
      },
      onError: () => {
        if (id === latest.current) showToast({ message: t("simulateError"), severity: "error" });
      },
    });
  }

  // ── Cambi ──────────────────────────────────────────────────────────────────
  const sheetData = useMemo(() => {
    if (!sheet) return null;
    const side = state.sides[sheet.side];
    const other = state.sides[sheet.side === 0 ? 1 : 0];
    const out = sheet.out ? (byKey.get(sheet.out) ?? null) : null;
    if (state.mode === "six") {
      const taken = new Set([...side.lineup, ...other.lineup]);
      const r = swapOptions({
        lineup: resolve(side.lineup),
        out,
        bench: resolve(side.pool.filter((k) => !taken.has(k))),
        other: resolve(other.lineup),
      });
      return { side, other, out, ...r };
    }
    const q = sheet.quarter ?? 0;
    const lineup = resolve(side.quarters[q] ?? []);
    const r = swapOptions({
      lineup,
      out,
      bench: resolve(side.roster.filter((k) => !lineup.some((p) => p.key === k))),
      played: quartersPlayed(side.quarters.map(resolve)),
    });
    return { side, other, out, ...r };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resolve` dipende solo da byKey
  }, [sheet, state, byKey]);

  function choose(choice: SwapChoice) {
    if (!sheet || !sheetData) return;
    const i = sheet.side;
    const j = i === 0 ? 1 : 0;
    const outKey = sheet.out;
    const inKey = choice.player.key;
    const replace = (keys: string[]) =>
      outKey ? keys.map((k) => (k === outKey ? inKey : k)) : [...keys, inKey];
    const sides = [...state.sides] as [SfidaSide, SfidaSide];
    if (state.mode === "six") {
      sides[i] = { ...sides[i], lineup: replace(sides[i].lineup) };
      if (choice.from !== "bench" && outKey) {
        sides[j] = {
          ...sides[j],
          lineup: sides[j].lineup.map((k) => (k === inKey ? outKey : k)),
        };
      }
    } else {
      const q = sheet.quarter ?? 0;
      sides[i] = {
        ...sides[i],
        quarters: sides[i].quarters.map((l, n) => (n === q ? replace(l) : l)),
      };
    }
    setSheet(null);
    update({ ...state, sides });
  }

  const blockedNote = (b: SwapBlock | null) =>
    b ? t(`blocked.${b}`, { name: sheetData?.out?.name ?? "" }) : null;

  // ── Convocati ──────────────────────────────────────────────────────────────
  const [rosterError, setRosterError] = useState(false);
  function toggleConvocato(i: 0 | 1, key: string) {
    const side = state.sides[i];
    const roster = side.roster.includes(key)
      ? side.roster.filter((k) => k !== key)
      : [...side.roster, key];
    const plan = quarterPlan(resolve(roster), freshRand());
    setRosterError(!plan);
    setSide(i, { roster, quarters: plan ? plan.map((l) => l.map((p) => p.key)) : [] });
  }

  const randomName = () => shuffle(names, freshRand())[0] ?? "";
  const sharePath = `/giochi/sfida?${sfidaSearchParams(state).toString()}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Tabs
        value={state.mode}
        onChange={(_, m: SfidaMode) => rebuild(m, state.grouping)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="full" label={t("modeFull")} sx={{ textTransform: "none", minHeight: 48 }} />
        <Tab value="six" label={t("modeSix")} sx={{ textTransform: "none", minHeight: 48 }} />
      </Tabs>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        aria-label={t("groupingLabel")}
        value={state.grouping}
        onChange={(_, g: SfidaGrouping | null) => g && rebuild(state.mode, g)}
      >
        <ToggleButton
          value="season"
          disabled={!canSeason}
          sx={{ minHeight: 44, textTransform: "none" }}
        >
          {t("groupingSeason")}
        </ToggleButton>
        <ToggleButton value="mixed" sx={{ minHeight: 44, textTransform: "none" }}>
          {t("groupingMixed")}
        </ToggleButton>
      </ToggleButtonGroup>

      {notice && (
        <Alert severity="info" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <SfidaBoard
        sides={state.sides}
        hint={state.mode === "six" ? t("hintSix") : t("hintFull")}
        outcome={outcome}
        onRename={setRenaming}
      />

      <Box sx={{ display: "flex", gap: 1.5 }}>
        <Button
          variant="contained"
          size="large"
          disabled={!ready || simulate.isPending}
          onClick={() => play(outcome ? state.nonce + 1 : state.nonce)}
          startIcon={
            simulate.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SportsBasketballIcon />
            )
          }
          sx={{ flex: 1 }}
        >
          {outcome ? t("rematch") : t("play")}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ShuffleIcon />}
          onClick={() => rebuild(state.mode, state.grouping)}
        >
          {t("shuffle")}
        </Button>
      </Box>
      {!ready && state.mode === "six" && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: -1 }}>
          {t("needSix")}
        </Typography>
      )}

      {state.mode === "six" ? (
        <>
          <Box
            sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.25 }}
          >
            {state.sides.map((side, i) => (
              <SfidaLineup
                key={i}
                side={side}
                players={resolve(side.lineup)}
                onPick={(p) => setSheet({ side: i as 0 | 1, quarter: null, out: p?.key ?? null })}
              />
            ))}
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Button
              variant="text"
              onClick={() =>
                update({
                  ...state,
                  sides: [
                    { ...a, lineup: [] },
                    { ...b, lineup: [] },
                  ],
                })
              }
            >
              {t("chooseYourself")}
            </Button>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
            gap: 1.5,
          }}
        >
          {state.sides.map((side, i) => (
            <Box key={i} sx={{ minWidth: 0 }}>
              {side.quarters.length === 4 ? (
                <SfidaQuarters
                  side={side}
                  roster={resolve(side.roster)}
                  onOpenQuarter={setOpenQuarter}
                  footer={
                    <ConvocatiButton
                      label={t("convocati", { count: side.roster.length, total: side.pool.length })}
                      onClick={() => setConvocati(i as 0 | 1)}
                    />
                  }
                />
              ) : (
                <Alert severity="warning">
                  {t("rosterTooShort")}
                  <Box sx={{ mt: 1 }}>
                    <Button
                      color="inherit"
                      variant="outlined"
                      onClick={() => setConvocati(i as 0 | 1)}
                    >
                      {t("convocatiTitle", { team: side.name })}
                    </Button>
                  </Box>
                </Alert>
              )}
            </Box>
          ))}
        </Box>
      )}

      {outcome && (
        <ShareSection
          kind="sfida"
          title={t("shareTitle")}
          path={sharePath}
          message={t("shareText", { a: a.name, b: b.name, sa: outcome.scoreA, sb: outcome.scoreB })}
        />
      )}

      {/* Un tempo della partita intera: il sei contro sei di quel tempo. */}
      <Dialog
        open={openQuarter !== null}
        onClose={() => setOpenQuarter(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pr: 7 }}>
          {openQuarter !== null && t("quarter", { n: openQuarter + 1 })}
          <IconButton
            onClick={() => setOpenQuarter(null)}
            aria-label={t("close")}
            sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.25 }}
          >
            {openQuarter !== null &&
              state.sides.map((side, i) => (
                <SfidaLineup
                  key={i}
                  side={side}
                  players={resolve(side.quarters[openQuarter] ?? [])}
                  onPick={(p) =>
                    p && setSheet({ side: i as 0 | 1, quarter: openQuarter, out: p.key })
                  }
                />
              ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Convocati della partita intera. */}
      <Dialog
        open={convocati !== null}
        onClose={() => {
          setConvocati(null);
          setRosterError(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        {convocati !== null && (
          <>
            <DialogTitle sx={{ pr: 7 }}>
              {t("convocatiTitle", { team: state.sides[convocati].name })}
              <IconButton
                onClick={() => {
                  setConvocati(null);
                  setRosterError(false);
                }}
                aria-label={t("close")}
                sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t("convocatiHint")}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {resolve(state.sides[convocati].pool).map((p) => {
                  const on = state.sides[convocati].roster.includes(p.key);
                  const full = !on && state.sides[convocati].roster.length >= MAX_ROSTER;
                  return (
                    <ButtonBase
                      key={p.key}
                      role="checkbox"
                      aria-checked={on}
                      disabled={full}
                      onClick={() => toggleConvocato(convocati, p.key)}
                      sx={{
                        minHeight: 44,
                        pl: 0.75,
                        pr: 1.25,
                        gap: 0.75,
                        borderRadius: RADIUS.sm,
                        border: "1px solid",
                        borderStyle: on ? "solid" : "dashed",
                        borderColor: on ? "primary.main" : "divider",
                        bgcolor: on ? "background.paper" : "transparent",
                        color: on ? "text.primary" : "text.secondary",
                        typography: "body2",
                        fontWeight: on ? FONT_WEIGHT.semibold : undefined,
                        opacity: full ? 0.5 : 1,
                        "&.Mui-focusVisible": {
                          outline: "2px solid",
                          outlineColor: "primary.main",
                        },
                      }}
                    >
                      <RoleBadge role={p.sportRole ?? 0} />
                      {p.name}
                    </ButtonBase>
                  );
                })}
              </Box>
              {rosterError && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {t("rosterTooShort")}
                </Alert>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      <SfidaSwapSheet
        open={sheet !== null}
        title={
          sheetData?.out
            ? t("swapTitle", { name: sheetData.out.name })
            : t("addTitle", { team: sheetData?.side.name ?? "" })
        }
        subtitle={
          sheetData?.out
            ? t("roleLine", { role: sheetData.out.sportRole ?? 0, team: sheetData.side.name })
            : null
        }
        choices={(sheetData?.options ?? []).map((o) => ({
          player: o.player,
          from: o.from === "bench" ? "bench" : { other: sheetData!.other.name },
        }))}
        note={blockedNote(sheetData?.blockedBy ?? null)}
        onChoose={choose}
        onClose={() => setSheet(null)}
      />

      {renaming !== null && (
        <SfidaNameDialog
          open
          initial={state.sides[renaming].name}
          randomName={randomName}
          onSave={(name) => {
            // Il nome non cambia la partita: il risultato resta.
            const sides = [...state.sides] as [SfidaSide, SfidaSide];
            sides[renaming] = { ...sides[renaming], name };
            setState({ ...state, sides });
            setRenaming(null);
          }}
          onClose={() => setRenaming(null)}
        />
      )}
    </Box>
  );
}

function ConvocatiButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        minHeight: 44,
        px: 1.25,
        justifyContent: "flex-start",
        typography: "body2",
        fontWeight: FONT_WEIGHT.semibold,
        color: "primary.onLight",
        "&:hover": { bgcolor: "action.hover" },
        "&.Mui-focusVisible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "-2px",
        },
      }}
    >
      {label}
    </ButtonBase>
  );
}

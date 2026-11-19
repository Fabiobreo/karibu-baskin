"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Box,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import RepeatIcon from "@mui/icons-material/Repeat";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { useTranslations } from "next-intl";
import type { DrillContent } from "@/lib/board/content";
import { deriveArrows } from "@/lib/board/arrows";
import { interpolateStep } from "@/lib/board/animation";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import { RADIUS } from "@/lib/radius";
import BoardSvg, { type BoardCourt, type PieceName } from "./BoardSvg";
import BoardLegend from "./BoardLegend";

interface DrillPlayerProps {
  title: string;
  court: BoardCourt;
  content: DrillContent;
  names?: Record<string, PieceName>;
  /** Passo da cui partire (l'anteprima dell'editor parte da quello aperto). */
  initialStep?: number;
}

/** Durata dello spostamento fra due passi e pausa su ogni passo, in ms. */
const MOVE_MS = { normal: 1200, slow: 2000 } as const;
const HOLD_MS = 600;

type Speed = keyof typeof MOVE_MS;

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduceMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduceMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false
  );
}

/**
 * Visore di uno schema (UX-72): Play anima i passi uno dopo l'altro, con una
 * pausa su ognuno per leggere la riga; avanti e indietro un passo alla volta.
 * Con `prefers-reduced-motion` i pezzi non scorrono: i passi cambiano di colpo
 * e Play avanza con le stesse pause. Tastiera: spazio, frecce.
 */
export default function DrillPlayer({
  title,
  court,
  content,
  names,
  initialStep = 0,
}: DrillPlayerProps) {
  const t = useTranslations("board");
  const total = content.steps.length;
  const [step, setStep] = useState(Math.min(initialStep, total - 1));
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [loop, setLoop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const atEnd = step >= total - 1;

  // Il ciclo dell'animazione: sposta `progress` da 0 a 1, poi passa al passo
  // successivo e aspetta HOLD_MS prima di ripartire.
  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      // Senza "Ripeti" il ciclo si ferma da solo (vedi `tick`).
      if (!loop) return;
      const id = window.setTimeout(() => {
        setStep(0);
        setProgress(0);
      }, HOLD_MS * 2);
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    let start = 0;
    const hold = window.setTimeout(
      () => {
        const move = MOVE_MS[speed];
        const tick = (now: number) => {
          if (!start) start = now;
          const p = reduceMotion ? 1 : Math.min(1, (now - start) / move);
          if (p >= 1 || reduceMotion) {
            setProgress(0);
            setStep((s) => Math.min(s + 1, total - 1));
            if (step + 1 >= total - 1 && !loop) setPlaying(false);
            return;
          }
          setProgress(p);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      reduceMotion ? MOVE_MS[speed] : HOLD_MS
    );
    return () => {
      window.clearTimeout(hold);
      cancelAnimationFrame(raf);
    };
  }, [playing, step, atEnd, loop, speed, reduceMotion, total]);

  const goTo = useCallback(
    (next: number) => {
      setPlaying(false);
      setProgress(0);
      setStep(Math.max(0, Math.min(total - 1, next)));
    },
    [total]
  );

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      setProgress(0);
      return;
    }
    if (atEnd) setStep(0);
    setPlaying(true);
  }, [playing, atEnd]);

  // Tutto schermo: su telefono prova anche a girare lo schermo in orizzontale.
  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await rootRef.current?.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: "landscape") => Promise<void>;
      };
      await orientation.lock?.("landscape").catch(() => undefined);
    } catch {
      // Browser senza tutto schermo (iPhone): resta la pagina com'e'.
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.key === " ") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(step + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(step - 1);
    }
  }

  const frame = useMemo(() => interpolateStep(content, step, progress), [content, step, progress]);
  const arrows = useMemo(() => deriveArrows(content, step), [content, step]);
  const text = content.steps[step]?.text;
  const canFullscreen = typeof document !== "undefined" && !!document.fullscreenEnabled;

  return (
    <Box
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={title}
      sx={{
        // Sopra la lavagna la riga del passo, sotto i comandi e la legenda.
        "--board-max-h": fullscreen ? "calc(100vh - 160px)" : "calc(100vh - 360px)",
        outline: "none",
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 4,
          borderRadius: RADIUS.lg,
        },
        ...(fullscreen
          ? {
              bgcolor: "background.default",
              p: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
            }
          : {}),
      }}
    >
      <Typography
        variant="body1"
        aria-live="polite"
        sx={{ minHeight: "3em", mb: 1, color: text ? "text.primary" : "text.secondary" }}
      >
        {text || t("noText")}
      </Typography>

      <Box
        sx={
          fullscreen
            ? { flex: 1, minHeight: 0, display: "flex", justifyContent: "center" }
            : undefined
        }
      >
        <Box
          sx={
            fullscreen
              ? { height: "100%", aspectRatio: "auto", maxWidth: "100%", width: "100%" }
              : undefined
          }
        >
          <BoardSvg
            court={court}
            pieces={content.pieces}
            frame={frame}
            arrows={arrows}
            arrowOpacity={progress === 0 ? 1 : Math.max(0, 1 - progress * 2.5)}
            names={names}
            title={title}
            description={text}
          />
        </Box>
      </Box>

      <Box
        sx={{
          mt: 1,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          "& .MuiIconButton-root": { width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE },
        }}
      >
        <IconButton onClick={() => goTo(step - 1)} disabled={step === 0} aria-label={t("prev")}>
          <SkipPreviousIcon />
        </IconButton>
        <Button
          variant="contained"
          onClick={togglePlay}
          startIcon={
            playing ? <PauseIcon /> : atEnd && total > 1 ? <ReplayIcon /> : <PlayArrowIcon />
          }
          disabled={total < 2}
          sx={{ minWidth: 120 }}
        >
          {playing ? t("pause") : atEnd && total > 1 ? t("restart") : t("play")}
        </Button>
        <IconButton onClick={() => goTo(step + 1)} disabled={atEnd} aria-label={t("next")}>
          <SkipNextIcon />
        </IconButton>

        <StepTicks
          total={total}
          current={step}
          onPick={goTo}
          label={t("stepOf", { current: step + 1, total })}
          stepLabel={(n) => t("stepN", { n })}
        />

        <Box sx={{ flex: 1 }} />

        <ToggleButtonGroup
          size="small"
          exclusive
          value={speed}
          onChange={(_, v: Speed | null) => v && setSpeed(v)}
          aria-label={t("speed")}
          sx={{
            // Il grigio di default dei bottoni non scelti non arriva a 4,5:1.
            "& .MuiToggleButton-root": {
              minHeight: TOUCH_TARGET_SIZE,
              px: 1.5,
              color: "text.secondary",
            },
            "& .MuiToggleButton-root.Mui-selected": { color: "text.primary" },
          }}
        >
          <ToggleButton value="slow">{t("slow")}</ToggleButton>
          <ToggleButton value="normal">{t("normal")}</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title={t("loop")}>
          <ToggleButton
            value="loop"
            size="small"
            selected={loop}
            onChange={() => setLoop((v) => !v)}
            aria-label={t("loop")}
            sx={{
              width: TOUCH_TARGET_SIZE,
              height: TOUCH_TARGET_SIZE,
              color: loop ? "text.primary" : "text.secondary",
            }}
          >
            <RepeatIcon />
          </ToggleButton>
        </Tooltip>
        {canFullscreen && (
          <IconButton
            onClick={toggleFullscreen}
            aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
          >
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        )}
      </Box>

      {!fullscreen && (
        <>
          <BoardLegend />
          {total > 1 && (
            <Box component="details" sx={{ mt: 1.5 }}>
              <Box component="summary" sx={{ cursor: "pointer", typography: "body2", py: 1 }}>
                {t("allSteps")}
              </Box>
              <Box component="ol" sx={{ m: 0, pl: 3, typography: "body2" }}>
                {content.steps.map((s, i) => (
                  <li key={i}>
                    <Box
                      component="span"
                      sx={{ color: s.text ? "text.primary" : "text.secondary" }}
                    >
                      {s.text || t("noText")}
                    </Box>
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

/** Le tacche dei passi (come nel quiz, UX-70): neutre, arancio quella aperta. */
function StepTicks({
  total,
  current,
  onPick,
  label,
  stepLabel,
}: {
  total: number;
  current: number;
  onPick: (i: number) => void;
  label: string;
  stepLabel: (n: number) => string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }} role="group" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={i}
          component="button"
          type="button"
          onClick={() => onPick(i)}
          aria-label={stepLabel(i + 1)}
          aria-current={i === current ? "step" : undefined}
          sx={{
            // Bersaglio da 24 px di larghezza e 44 di altezza: la tacca e' la riga dentro.
            width: total > 10 ? 16 : 24,
            height: TOUCH_TARGET_SIZE,
            p: 0,
            border: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            "&::after": {
              content: '""',
              display: "block",
              width: "100%",
              height: 6,
              borderRadius: RADIUS.pill,
              bgcolor: i === current ? "primary.main" : "action.disabled",
            },
            "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
          }}
        />
      ))}
    </Box>
  );
}

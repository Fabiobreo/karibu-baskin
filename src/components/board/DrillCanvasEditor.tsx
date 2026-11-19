"use client";
import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { useTranslations } from "next-intl";
import BoardSvg from "./BoardSvg";
import DrillPieceMenu from "./DrillPieceMenu";
import DrillSelectionPanel from "./DrillSelectionPanel";
import DrillStepsBar from "./DrillStepsBar";
import type { DrillHistory, DrillHistoryAction } from "./drillHistory";
import { useToast } from "@/context/ToastContext";
import { deriveArrows, stepScreens } from "@/lib/board/arrows";
import { interpolateStep } from "@/lib/board/animation";
import { MAX_PIECES, isPlayerPiece, type DrillContent } from "@/lib/board/content";
import type { Point } from "@/lib/board/court";
import * as edit from "@/lib/board/editing";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

interface DrillCanvasEditorProps {
  title: string;
  court: "FULL" | "HALF";
  history: DrillHistory;
  dispatch: Dispatch<DrillHistoryAction>;
  /** Comandi in fondo alla barra (anteprima, dettagli, pubblica…). */
  toolbarEnd?: ReactNode;
  /** Prima della barra (lo stato dello staff). */
  toolbarStart?: ReactNode;
}

type Drag =
  | { kind: "piece"; id: string; pointerId: number; moved: boolean; offset: Point }
  | { kind: "ball"; pointerId: number; moved: boolean };

/**
 * La parte di disegno dell'editor del Playbook (UX-72), condivisa fra l'editor
 * dello staff e quello delle proposte dei tesserati (UX-73): barra (aggiungi,
 * palla, annulla e ripeti), lavagna con dita e mouse, passi e pannello della
 * selezione. Le frecce si disegnano da sole: sulla lavagna si vede da dove
 * arriva ogni pezzo rispetto al passo prima. La storia (e quindi il disegno)
 * la tiene chi la usa.
 */
export default function DrillCanvasEditor({
  title,
  court,
  history,
  dispatch,
  toolbarStart,
  toolbarEnd,
}: DrillCanvasEditorProps) {
  const t = useTranslations("board.editor");
  const { showToast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const textCheckpointRef = useRef(false);
  const { content } = history;
  const current = Math.min(stepIndex, content.steps.length - 1);
  const step = content.steps[current];

  const apply = (fn: (c: DrillContent) => DrillContent) => dispatch({ type: "apply", fn });

  // ── Lavagna: dita e mouse ──────────────────────────────────────────────
  function toMeters(e: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function onPiecePointerDown(id: string, e: ReactPointerEvent<SVGElement>) {
    e.stopPropagation();
    if (screenMode) return;
    setSelectedId(id);
    const at = step.at[id];
    const m = toMeters(e);
    if (!at || !m) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "piece",
      id,
      pointerId: e.pointerId,
      moved: false,
      offset: { x: at.x - m.x, y: at.y - m.y },
    };
  }

  function onBallPointerDown(e: ReactPointerEvent<SVGElement>) {
    e.stopPropagation();
    if (screenMode) return;
    setSelectedId("ball");
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { kind: "ball", pointerId: e.pointerId, moved: false };
  }

  function onBoardPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    const m = toMeters(e);
    if (screenMode && selectedId && m) {
      apply((c) => edit.setScreen(c, current, selectedId, m, court));
      setScreenMode(false);
      return;
    }
    setSelectedId(null);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const m = toMeters(e);
    if (!m) return;
    if (!drag.moved) {
      dispatch({ type: "checkpoint" });
      drag.moved = true;
    }
    if (drag.kind === "piece") {
      const to = { x: m.x + drag.offset.x, y: m.y + drag.offset.y };
      dispatch({ type: "live", fn: (c) => edit.movePiece(c, current, drag.id, to, court) });
    } else {
      dispatch({ type: "live", fn: (c) => edit.setBall(c, current, edit.clampToCourt(m, court)) });
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (drag.kind === "ball" && drag.moved) {
      const m = toMeters(e);
      if (m) dispatch({ type: "live", fn: (c) => edit.dropBall(c, current, m, court) });
    }
  }

  // ── Tastiera ───────────────────────────────────────────────────────────
  function onKeyDown(e: ReactKeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      dispatch({ type: e.shiftKey ? "redo" : "undo" });
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      dispatch({ type: "redo" });
      return;
    }
    if (e.target !== e.currentTarget) return;
    if (e.key === "Escape") {
      setScreenMode(false);
      setSelectedId(null);
      return;
    }
    if (!selectedId || selectedId === "ball") return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      apply((c) => edit.removePiece(c, selectedId));
      setSelectedId(null);
      return;
    }
    const d = e.shiftKey ? 1 : 0.25;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -d, y: 0 },
      ArrowRight: { x: d, y: 0 },
      ArrowUp: { x: 0, y: -d },
      ArrowDown: { x: 0, y: d },
    };
    const at = step.at[selectedId];
    if (delta[e.key] && at) {
      e.preventDefault();
      const to = { x: at.x + delta[e.key].x, y: at.y + delta[e.key].y };
      apply((c) => edit.movePiece(c, current, selectedId, to, court));
    }
  }

  // ── Comandi ────────────────────────────────────────────────────────────
  function addNew(piece: Parameters<typeof edit.addPiece>[2]) {
    const at = edit.freeSpot(content, current, court);
    const result = edit.addPiece(content, current, piece, at);
    if (!result.id) {
      showToast({ message: t("maxPieces", { n: MAX_PIECES }), severity: "warning" });
      return;
    }
    dispatch({ type: "replace", content: result.content });
    setSelectedId(result.id);
  }

  function toggleBall() {
    if (step.ball) {
      apply((c) => edit.setBall(c, current, undefined));
      return;
    }
    const sel = content.pieces.find((p) => p.id === selectedId);
    apply((c) =>
      edit.setBall(
        c,
        current,
        sel && isPlayerPiece(sel) && step.at[sel.id]
          ? { holder: sel.id }
          : edit.freeSpot(c, current, court)
      )
    );
  }

  const frame = useMemo(() => interpolateStep(content, current, 0), [content, current]);
  const arrows = useMemo(
    () => [
      ...(current > 0 ? deriveArrows(content, current - 1).filter((a) => a.kind !== "screen") : []),
      ...stepScreens(content.steps[current]),
    ],
    [content, current]
  );

  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
        {toolbarStart}
        <DrillPieceMenu onAdd={addNew} />
        <Button
          variant="outlined"
          startIcon={<SportsBasketballIcon />}
          onClick={toggleBall}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          {step.ball ? t("removeBall") : t("ballButton")}
        </Button>
        <Tooltip title={t("undoHint")}>
          <span>
            <IconButton
              aria-label={t("undo")}
              onClick={() => dispatch({ type: "undo" })}
              disabled={!history.past.length}
              sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("redoHint")}>
          <span>
            <IconButton
              aria-label={t("redo")}
              onClick={() => dispatch({ type: "redo" })}
              disabled={!history.future.length}
              sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
        {toolbarEnd && (
          <>
            <Box sx={{ flex: 1 }} />
            {toolbarEnd}
          </>
        )}
      </Box>

      <Box
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={t("boardLabel")}
        sx={{
          outline: "none",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
        }}
      >
        {step.text && (
          <Typography variant="body1" sx={{ mb: 1 }}>
            {step.text}
          </Typography>
        )}
        <BoardSvg
          court={court}
          pieces={content.pieces}
          frame={frame}
          arrows={arrows}
          selectedId={selectedId}
          title={t("boardTitle", { title, n: current + 1 })}
          description={step.text}
          svgRef={svgRef}
          onPiecePointerDown={onPiecePointerDown}
          onBallPointerDown={onBallPointerDown}
          onBoardPointerDown={onBoardPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
          {current > 0 ? t("arrowsHint") : t("firstStepHint")}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          mt: 2,
          gridTemplateColumns: { md: "1fr 1fr" },
          alignItems: "start",
        }}
      >
        <DrillStepsBar
          total={content.steps.length}
          current={current}
          text={step.text ?? ""}
          onPick={(i) => {
            setStepIndex(i);
            setScreenMode(false);
          }}
          onAdd={() => {
            apply((c) => edit.addStep(c, current));
            setStepIndex(current + 1);
          }}
          onRemove={() => {
            apply((c) => edit.removeStep(c, current));
            setStepIndex(Math.max(0, current - 1));
          }}
          onMove={(delta) => {
            const next = edit.moveStep(content, current, delta);
            if (next === content) {
              showToast({ message: t("firstStepShot"), severity: "warning" });
              return;
            }
            dispatch({ type: "replace", content: next });
            setStepIndex(current + delta);
          }}
          onTextFocus={() => {
            textCheckpointRef.current = false;
          }}
          onText={(text) => {
            // Una scrittura e' un solo passo della storia: il punto di ritorno
            // si salva alla prima battuta, poi le lettere vanno "live".
            if (!textCheckpointRef.current) {
              dispatch({ type: "checkpoint" });
              textCheckpointRef.current = true;
            }
            dispatch({ type: "live", fn: (c) => edit.setStepText(c, current, text) });
          }}
        />
        <DrillSelectionPanel
          pieces={content.pieces}
          step={step}
          stepIndex={current}
          selectedId={selectedId}
          screenMode={screenMode}
          onUpdate={(id, patch) => apply((c) => edit.updatePiece(c, id, patch))}
          onGiveBall={(id) => apply((c) => edit.setBall(c, current, { holder: id }))}
          onRemoveBall={() => {
            apply((c) => edit.setBall(c, current, undefined));
            setSelectedId(null);
          }}
          onStartScreen={() => setScreenMode(true)}
          onRemoveScreen={(id) => apply((c) => edit.removeScreen(c, current, id))}
          onLeave={(id) => {
            apply((c) => edit.leaveFromStep(c, current, id));
            setSelectedId(null);
          }}
          onRemove={(id) => {
            apply((c) => edit.removePiece(c, id));
            setSelectedId(null);
          }}
          onBringBack={(id) => {
            const at = edit.freeSpot(content, current, court);
            apply((c) => edit.movePiece(c, current, id, at, court));
            setSelectedId(id);
          }}
        />
      </Box>
    </>
  );
}

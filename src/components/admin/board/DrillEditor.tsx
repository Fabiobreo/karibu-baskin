"use client";
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import PageHeader from "@/components/common/PageHeader";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import BoardSvg from "@/components/board/BoardSvg";
import DrillPlayer from "@/components/board/DrillPlayer";
import DrillFormDialog from "./DrillFormDialog";
import DrillPieceMenu from "./DrillPieceMenu";
import DrillSelectionPanel from "./DrillSelectionPanel";
import DrillStateChip from "./DrillStateChip";
import DrillStepsBar from "./DrillStepsBar";
import { drillHistoryReducer } from "./drillHistory";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { deriveArrows, stepScreens } from "@/lib/board/arrows";
import { interpolateStep } from "@/lib/board/animation";
import { isPlayerPiece, type DrillContent } from "@/lib/board/content";
import type { Point } from "@/lib/board/court";
import * as edit from "@/lib/board/editing";
import {
  DRILL_COURT_LABELS,
  DRILL_KIND_LABELS,
  type AdminDrillRow,
  type DrillTeamOption,
} from "@/lib/board/labels";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

interface DrillEditorProps {
  drill: AdminDrillRow;
  content: DrillContent;
  teams: DrillTeamOption[];
}

type Drag =
  | { kind: "piece"; id: string; pointerId: number; moved: boolean; offset: Point }
  | { kind: "ball"; pointerId: number; moved: boolean };

const draftKey = (id: string) => `karibu-lavagna:${id}`;

/** Bozza non salvata di questo schema sul dispositivo (stringa: stabile per React). */
function useStoredDraft(id: string): string | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => {
      try {
        return window.localStorage.getItem(draftKey(id));
      } catch {
        return null;
      }
    },
    () => null
  );
}

/**
 * Editor di uno schema (UX-72). Si spostano i pezzi col dito passo dopo passo
 * e le frecce si disegnano da sole: sulla lavagna si vede da dove arriva ogni
 * pezzo rispetto al passo prima. Salvataggio esplicito; le modifiche non
 * salvate restano sul dispositivo e si propongono alla riapertura.
 */
export default function DrillEditor({ drill, content: initial, teams }: DrillEditorProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [history, dispatch] = useReducer(drillHistoryReducer, {
    content: initial,
    past: [],
    future: [],
  });
  const [saved, setSaved] = useState(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState(false);
  const [preview, setPreview] = useState(false);
  const [details, setDetails] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const { content } = history;
  const court = drill.court;
  const dirty = content !== saved;
  const step = content.steps[Math.min(stepIndex, content.steps.length - 1)];
  const current = Math.min(stepIndex, content.steps.length - 1);

  // Bozza sul dispositivo: si scrive a ogni modifica, si toglie al salvataggio.
  const storedDraft = useStoredDraft(drill.id);
  const editedHere = history.past.length > 0 || dirty;
  const draft = useMemo(() => {
    // Solo alla riapertura: mentre si modifica la bozza e' quella che si sta scrivendo.
    if (!storedDraft || draftDismissed || editedHere) return null;
    try {
      const parsed = JSON.parse(storedDraft) as { base: string; content: DrillContent };
      return parsed.base === drill.updatedAt &&
        JSON.stringify(parsed.content) !== JSON.stringify(saved)
        ? parsed.content
        : null;
    } catch {
      return null;
    }
  }, [storedDraft, draftDismissed, editedHere, drill.updatedAt, saved]);
  useEffect(() => {
    if (!dirty) return;
    try {
      window.localStorage.setItem(
        draftKey(drill.id),
        JSON.stringify({ base: drill.updatedAt, content })
      );
    } catch {
      // Spazio pieno o navigazione privata: la bozza locale e' solo una comodita'.
    }
  }, [content, dirty, drill.id, drill.updatedAt]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const apply = (fn: (c: DrillContent) => DrillContent) => dispatch({ type: "apply", fn });

  const save = useMutation({
    mutationFn: async (extra: { status?: "DRAFT" | "PUBLISHED" }) => {
      const res = await fetch(`/api/drills/${drill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, ...extra }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return { sent: content, ...extra };
    },
    onSuccess: ({ sent, status }) => {
      setSaved(sent);
      try {
        window.localStorage.removeItem(draftKey(drill.id));
      } catch {
        // niente da fare
      }
      showToast({
        message:
          status === "PUBLISHED"
            ? "Schema pubblicato: lo vedono i tesserati"
            : status === "DRAFT"
              ? "Schema rimesso in bozza"
              : "Schema salvato",
        severity: "success",
      });
      router.refresh();
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

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
  function onKeyDown(e: React.KeyboardEvent) {
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
      showToast({ message: "Al massimo 24 pezzi per schema", severity: "warning" });
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
  const published = drill.status === "PUBLISHED";

  return (
    <>
      <PageHeader
        title={drill.title}
        breadcrumb={[{ label: "Lavagna", href: "/admin/lavagna" }, { label: drill.title }]}
        subtitle={`${DRILL_KIND_LABELS[drill.kind]} · ${DRILL_COURT_LABELS[court]}${dirty ? " · modifiche non salvate" : ""}`}
        action={
          <Button
            variant="contained"
            onClick={() => save.mutate({})}
            disabled={!dirty || save.isPending}
          >
            {dirty ? "Salva" : "Salvato"}
          </Button>
        }
      />

      {draft && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                color="inherit"
                onClick={() => {
                  dispatch({ type: "replace", content: draft });
                  setDraftDismissed(true);
                }}
              >
                Ripristina
              </Button>
              <Button
                color="inherit"
                onClick={() => {
                  try {
                    window.localStorage.removeItem(draftKey(drill.id));
                  } catch {
                    // niente da fare
                  }
                  setDraftDismissed(true);
                }}
              >
                Scarta
              </Button>
            </Box>
          }
        >
          Su questo dispositivo ci sono modifiche a questo schema non ancora salvate.
        </Alert>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
        <DrillStateChip status={drill.status} archived={false} />
        <DrillPieceMenu onAdd={addNew} />
        <Button
          variant="outlined"
          startIcon={<SportsBasketballIcon />}
          onClick={toggleBall}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          {step.ball ? "Togli la palla" : "Palla"}
        </Button>
        <Tooltip title="Annulla (Ctrl+Z)">
          <span>
            <IconButton
              aria-label="Annulla"
              onClick={() => dispatch({ type: "undo" })}
              disabled={!history.past.length}
              sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Ripeti (Ctrl+Y)">
          <span>
            <IconButton
              aria-label="Ripeti"
              onClick={() => dispatch({ type: "redo" })}
              disabled={!history.future.length}
              sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="text"
          startIcon={<PlayCircleOutlineIcon />}
          onClick={() => setPreview(true)}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          Anteprima
        </Button>
        <Button
          variant="text"
          onClick={() => setDetails(true)}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          Dettagli
        </Button>
        <Button
          variant="outlined"
          onClick={() => save.mutate({ status: published ? "DRAFT" : "PUBLISHED" })}
          disabled={save.isPending || (!published && content.pieces.length === 0)}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          {published ? "Rimetti in bozza" : dirty ? "Salva e pubblica" : "Pubblica"}
        </Button>
      </Box>

      <Box
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Lavagna: tocca un pezzo per sceglierlo, frecce per spostarlo, Canc per toglierlo"
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
          title={`${drill.title}, passo ${current + 1}`}
          description={step.text}
          svgRef={svgRef}
          onPiecePointerDown={onPiecePointerDown}
          onBallPointerDown={onBallPointerDown}
          onBoardPointerDown={onBoardPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
          {current > 0
            ? "Le frecce mostrano come si arriva qui dal passo prima."
            : "Primo passo: metti i pezzi dove partono, poi aggiungi un passo e spostali."}
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
              showToast({ message: "Il primo passo non può essere un tiro", severity: "warning" });
              return;
            }
            dispatch({ type: "replace", content: next });
            setStepIndex(current + delta);
          }}
          onText={(text) =>
            dispatch({ type: "live", fn: (c) => edit.setStepText(c, current, text) })
          }
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

      {preview && (
        <ResponsiveDialog open onClose={() => setPreview(false)} maxWidth="md" fullWidth>
          <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Anteprima: {drill.title}</DialogTitle>
          <DialogContent>
            <DrillPlayer title={drill.title} court={court} content={content} initialStep={0} />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button onClick={() => setPreview(false)}>Chiudi</Button>
            </Box>
          </DialogContent>
        </ResponsiveDialog>
      )}
      {details && (
        <DrillFormDialog
          open
          drill={drill}
          teams={teams}
          onClose={() => setDetails(false)}
          onSaved={() => {
            setDetails(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

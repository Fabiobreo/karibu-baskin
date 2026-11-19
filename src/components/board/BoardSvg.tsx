"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { courtShapes, COURT_LENGTH, COURT_WIDTH } from "@/lib/board/court";
import { HALF_COURT_MIN_X, type DrillPiece } from "@/lib/board/content";
import type { BoardArrow } from "@/lib/board/arrows";
import type { BoardFrame } from "@/lib/board/animation";
import { samplePath, trimPath } from "@/lib/board/curves";
import type { Point } from "@/lib/board/court";
import { roleColor } from "@/lib/constants";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import CourtLines from "./CourtLines";

/** Un nome sotto una pedina, con "Tu" per chi guarda. */
export interface PieceName {
  /** Testo sotto la pedina, gia' tradotto ("Marco · Tu"). */
  name: string;
  /** Chi guarda o un suo figlio: anello e grassetto. */
  highlight?: boolean;
}

export type BoardCourt = "FULL" | "HALF";

interface BoardSvgProps {
  court: BoardCourt;
  pieces: DrillPiece[];
  frame: BoardFrame;
  arrows?: BoardArrow[];
  /** Opacita' delle frecce: sfumano mentre i pezzi si muovono. */
  arrowOpacity?: number;
  names?: Record<string, PieceName>;
  selectedId?: string | null;
  /** Descrizione per i lettori di schermo (titolo dello schema e testo del passo). */
  title: string;
  description?: string;
  svgRef?: Ref<SVGSVGElement>;
  onPiecePointerDown?: (id: string, e: ReactPointerEvent<SVGElement>) => void;
  onBallPointerDown?: (e: ReactPointerEvent<SVGElement>) => void;
  onBoardPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  /** Bordo e angoli: la miniatura del pannello non li vuole. */
  framed?: boolean;
  /**
   * Maniglie dei percorsi ad arco nell'editor (UX-73): una per percorso, sul
   * punto da cui passa a meta' strada. Si trascinano per curvarlo.
   */
  handles?: (Point & { id: string; label: string })[];
  onHandlePointerDown?: (id: string, e: ReactPointerEvent<SVGElement>) => void;
}

/** Margine attorno al campo, in metri: le pedine sulla linea non si tagliano. */
const PAD = 0.8;

/** Riquadro in metri: il campo intero o la meta' di destra. */
export function boardViewBox(court: BoardCourt) {
  const x0 = court === "HALF" ? HALF_COURT_MIN_X : 0;
  return { x: x0 - PAD, y: -PAD, w: COURT_LENGTH - x0 + 2 * PAD, h: COURT_WIDTH + 2 * PAD };
}

const SHAPES = courtShapes();

/**
 * Metri per pixel del disegno, misurati sullo schermo: pedine e scritte hanno
 * una misura minima in pixel (testo mai sotto i 12 px), che in metri cambia
 * con la larghezza della lavagna.
 */
function useMetersPerPixel(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [mpp, setMpp] = useState(width / 360);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const px = el.getBoundingClientRect().width;
      if (px > 0) setMpp(width / px);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return { ref, mpp };
}

/**
 * La lavagna (UX-72): campo vero in metri, pezzi, palla e frecce di un
 * fotogramma. Disegna e basta: animazione e trascinamenti stanno in chi la usa
 * (`DrillPlayer`, editor del pannello).
 */
export default function BoardSvg({
  court,
  pieces,
  frame,
  arrows = [],
  arrowOpacity = 1,
  names,
  selectedId,
  title,
  description,
  svgRef,
  onPiecePointerDown,
  onBallPointerDown,
  onBoardPointerDown,
  onPointerMove,
  onPointerUp,
  framed = true,
  handles = [],
  onHandlePointerDown,
}: BoardSvgProps) {
  const theme = useTheme();
  const vb = boardViewBox(court);
  const { ref, mpp } = useMetersPerPixel(vb.w);
  const c = {
    line: theme.palette.text.secondary,
    ink: theme.palette.text.primary,
    paper: theme.palette.background.paper,
    neutral: theme.palette.grey[theme.palette.mode === "dark" ? 400 : 600],
    brand: theme.palette.secondary.main,
    brandText: theme.palette.secondary.contrastText,
    selected: theme.palette.primary.main,
    white: theme.palette.common.white,
  };
  // Misure minime in pixel, portate in metri.
  const r = Math.max(0.55, 11 * mpp);
  const font = Math.max(0.55, 12 * mpp);
  const stroke = Math.max(0.06, 1.5 * mpp);
  const interactive = !!onPiecePointerDown;
  const titleId = useId();
  // Un prefisso per lavagna: con piu' lavagne nella pagina gli id delle punte
  // delle frecce non si ripetono (un id doppio e' HTML non valido, e una
  // freccia prenderebbe la punta di un'altra lavagna, magari nascosta).
  const markerId = `board${titleId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const t = useTranslations("board");

  return (
    <Box
      ref={ref}
      sx={{
        position: "relative",
        aspectRatio: `${vb.w} / ${vb.h}`,
        width: "100%",
        // Su schermi larghi la meta' campo (quasi quadrata) non deve superare
        // l'altezza della finestra: si stringe e resta centrata. Chi la contiene
        // puo' dire quanta altezza c'e' con `--board-max-h` (il visore lo fa).
        maxWidth: `calc(var(--board-max-h, calc(100vh - 160px)) * ${(vb.w / vb.h).toFixed(3)})`,
        mx: "auto",
        bgcolor: "background.paper",
        ...(framed
          ? {
              border: "1px solid",
              borderColor: "divider",
              borderRadius: RADIUS.lg,
              overflow: "hidden",
            }
          : {}),
        touchAction: interactive ? "none" : undefined,
        userSelect: "none",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width="100%"
        height="100%"
        role="img"
        aria-labelledby={titleId}
        style={{ display: "block", fontFamily: "inherit" }}
        onPointerDown={onBoardPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <title id={titleId}>{description ? `${title}. ${description}` : title}</title>
        <defs>
          <marker
            id={`${markerId}-open`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M1,1 L8,5 L1,9" fill="none" stroke={c.ink} strokeWidth="1.6" />
          </marker>
          <marker
            id={`${markerId}-full`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={c.ink} />
          </marker>
        </defs>

        <g style={{ color: c.line }}>
          <CourtLines shapes={SHAPES} thick={stroke * 1.4} thin={stroke} fillOpacity={0.1} />
        </g>

        <g opacity={arrowOpacity} pointerEvents="none">
          {arrows.map((a, i) => (
            <Arrow
              key={i}
              arrow={a}
              r={r}
              stroke={stroke * 1.4}
              color={c.ink}
              markerId={markerId}
            />
          ))}
        </g>

        {pieces.map((piece) => {
          const pos = frame.pieces[piece.id];
          if (!pos) return null;
          return (
            <g
              key={piece.id}
              transform={`translate(${pos.x} ${pos.y})`}
              opacity={pos.opacity}
              onPointerDown={
                onPiecePointerDown ? (e) => onPiecePointerDown(piece.id, e) : undefined
              }
              style={{ cursor: interactive ? "grab" : undefined }}
            >
              {selectedId === piece.id && (
                <circle r={r * 1.45} fill="none" stroke={c.selected} strokeWidth={stroke * 2} />
              )}
              <PieceShape
                piece={piece}
                r={r}
                font={font}
                stroke={stroke}
                colors={c}
                coachLabel={piece.coach === "tutor" ? t("tutorShort") : t("coachShort")}
              />
              {names?.[piece.id] && (
                <PieceLabel name={names[piece.id]} r={r} font={font} colors={c} stroke={stroke} />
              )}
            </g>
          );
        })}

        {handles.map((h) => (
          // Sopra pezzi e palla: e' quello che si sta toccando. Il cerchio
          // trasparente piu' grande e' la zona da toccare col dito (44 px).
          <g
            key={`handle-${h.id}`}
            transform={`translate(${h.x} ${h.y})`}
            onPointerDown={onHandlePointerDown ? (e) => onHandlePointerDown(h.id, e) : undefined}
            style={{ cursor: "grab" }}
          >
            <title>{h.label}</title>
            <circle r={Math.max(r, 22 * mpp)} fill="transparent" />
            <circle r={r * 0.55} fill={c.paper} stroke={c.selected} strokeWidth={stroke * 2} />
            <circle r={r * 0.2} fill={c.selected} />
          </g>
        ))}

        {frame.ball && (
          <g
            transform={`translate(${frame.ball.x + r * frame.ball.hand} ${frame.ball.y - r * frame.ball.hand})`}
            onPointerDown={onBallPointerDown}
            style={{ cursor: interactive ? "grab" : undefined }}
          >
            {selectedId === "ball" && (
              <circle r={r * 0.9} fill="none" stroke={c.selected} strokeWidth={stroke * 2} />
            )}
            <circle r={r * 0.5} fill={c.paper} stroke={c.ink} strokeWidth={stroke * 1.3} />
            <path
              d={`M${-r * 0.5},0 H${r * 0.5} M0,${-r * 0.5} V${r * 0.5}`}
              stroke={c.ink}
              strokeWidth={stroke * 0.8}
            />
          </g>
        )}
      </svg>
    </Box>
  );
}

interface Colors {
  ink: string;
  paper: string;
  neutral: string;
  brand: string;
  brandText: string;
  white: string;
}

function PieceShape({
  piece,
  r,
  font,
  stroke,
  colors: c,
  coachLabel,
}: {
  piece: DrillPiece;
  r: number;
  font: number;
  stroke: number;
  colors: Colors;
  /** "All." o "T", tradotto da chi disegna. */
  coachLabel: string;
}) {
  const text = (label: string, color: string) => (
    <text
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={font}
      fontWeight={FONT_WEIGHT.semibold}
      fill={color}
    >
      {label}
    </text>
  );

  switch (piece.kind) {
    case "role":
    case "free": {
      const tint = piece.kind === "role" ? (roleColor(piece.role) ?? c.neutral) : c.neutral;
      const label = piece.kind === "role" ? String(piece.role) : (piece.label ?? "");
      // Attacco: pedina piena col numero bianco. Difesa: contornata, numero nel
      // colore del testo. La forma e' il secondo segnale oltre al colore.
      return piece.side === "defense" ? (
        <>
          <circle r={r} fill={c.paper} stroke={tint} strokeWidth={stroke * 2.5} />
          {text(label, c.ink)}
        </>
      ) : (
        <>
          <circle r={r} fill={tint} stroke={c.paper} strokeWidth={stroke} />
          {text(label, c.white)}
        </>
      );
    }
    case "coach":
      return (
        <>
          <rect x={-r} y={-r} width={2 * r} height={2 * r} rx={r * 0.25} fill={c.brand} />
          {text(coachLabel, c.brandText)}
        </>
      );
    case "cone":
      return (
        <path
          d={`M0,${-r * 0.8} L${r * 0.75},${r * 0.6} L${-r * 0.75},${r * 0.6} Z`}
          fill={c.neutral}
          stroke={c.paper}
          strokeWidth={stroke}
        />
      );
    case "ring":
      return <circle r={r * 0.7} fill="none" stroke={c.neutral} strokeWidth={stroke * 2.5} />;
    case "chair":
      return (
        <rect
          x={-r * 0.6}
          y={-r * 0.6}
          width={r * 1.2}
          height={r * 1.2}
          fill="none"
          stroke={c.neutral}
          strokeWidth={stroke * 2.5}
        />
      );
    case "note": {
      const label = piece.label ?? "";
      const w = Math.max(r * 2, label.length * font * 0.58 + font);
      return (
        <>
          <rect
            x={-w / 2}
            y={-font * 0.8}
            width={w}
            height={font * 1.6}
            rx={font * 0.3}
            fill={c.paper}
            stroke={c.neutral}
            strokeWidth={stroke}
          />
          <text textAnchor="middle" dominantBaseline="central" fontSize={font} fill={c.ink}>
            {label}
          </text>
        </>
      );
    }
  }
}

function PieceLabel({
  name,
  r,
  font,
  stroke,
  colors: c,
}: {
  name: PieceName;
  r: number;
  font: number;
  stroke: number;
  colors: Colors;
}) {
  return (
    <>
      {name.highlight && (
        <circle r={r * 1.3} fill="none" stroke={c.ink} strokeWidth={stroke * 1.5} />
      )}
      <text
        y={r + font * 0.9}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={font}
        fontWeight={name.highlight ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold}
        fill={c.ink}
        stroke={c.paper}
        strokeWidth={font * 0.3}
        paintOrder="stroke"
      >
        {name.name}
      </text>
    </>
  );
}

/** Freccia accorciata ai due capi, cosi' non copre le pedine. */
function Arrow({
  arrow,
  r,
  stroke,
  color,
  markerId,
}: {
  arrow: BoardArrow;
  r: number;
  stroke: number;
  color: string;
  markerId: string;
}) {
  const { from, to, kind } = arrow;
  if (arrow.via && kind !== "screen") {
    return (
      <CurvedArrow
        arrow={arrow}
        via={arrow.via}
        r={r}
        stroke={stroke}
        color={color}
        markerId={markerId}
      />
    );
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < r * 1.5) return null;
  const ux = dx / len;
  const uy = dy / len;
  const startGap = kind === "screen" ? r * 1.1 : r * 1.15;
  const endGap = kind === "screen" || kind === "shot" ? 0 : r * 1.2;
  const a = { x: from.x + ux * startGap, y: from.y + uy * startGap };
  const b = { x: to.x - ux * endGap, y: to.y - uy * endGap };

  if (kind === "screen") {
    // Linea con la barretta in fondo.
    const bar = r * 0.9;
    return (
      <g stroke={color} strokeWidth={stroke} strokeLinecap="round">
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line x1={b.x - uy * bar} y1={b.y + ux * bar} x2={b.x + uy * bar} y2={b.y - ux * bar} />
      </g>
    );
  }
  if (kind === "dribble") {
    return (
      <path
        d={wavyPath(a, b, r * 0.35, r * 1.4)}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        markerEnd={`url(#${markerId}-open)`}
      />
    );
  }
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={color}
      strokeWidth={kind === "shot" ? stroke * 1.3 : stroke}
      strokeDasharray={kind === "pass" || kind === "shot" ? `${r * 0.6} ${r * 0.45}` : undefined}
      markerEnd={`url(#${markerId}-${kind === "shot" ? "full" : "open"})`}
    />
  );
}

/** Linea ondulata da `a` a `b`: il palleggio. L'ultimo tratto e' dritto, per la punta. */
export function wavyPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  amplitude: number,
  wavelength: number
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const straight = Math.min(len * 0.3, wavelength * 0.6);
  const waveLen = len - straight;
  const n = Math.max(1, Math.round(waveLen / wavelength));
  const steps = n * 12;
  let d = `M${a.x},${a.y}`;
  for (let i = 1; i <= steps; i++) {
    const s = (i / steps) * waveLen;
    const off = Math.sin((i / steps) * n * 2 * Math.PI) * amplitude;
    d += ` L${a.x + ux * s - uy * off},${a.y + uy * s + ux * off}`;
  }
  return `${d} L${b.x},${b.y}`;
}

/** Freccia ad arco (UX-73): la stessa forma della dritta, lungo la curva. */
function CurvedArrow({
  arrow,
  via,
  r,
  stroke,
  color,
  markerId,
}: {
  arrow: BoardArrow;
  via: Point;
  r: number;
  stroke: number;
  color: string;
  markerId: string;
}) {
  const { from, to, kind } = arrow;
  const endGap = kind === "shot" ? 0 : r * 1.2;
  const pts = trimPath(samplePath(from, to, via, 40), r * 1.15, endGap);
  if (!pts) return null;
  const marker = `url(#${markerId}-${kind === "shot" ? "full" : "open"})`;
  if (kind === "dribble") {
    return (
      <path
        d={wavyAlong(pts, r * 0.35, r * 1.4)}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        markerEnd={marker}
      />
    );
  }
  return (
    <path
      d={`M${pts.map((p) => `${p.x},${p.y}`).join(" L")}`}
      fill="none"
      stroke={color}
      strokeWidth={kind === "shot" ? stroke * 1.3 : stroke}
      strokeDasharray={kind === "pass" || kind === "shot" ? `${r * 0.6} ${r * 0.45}` : undefined}
      strokeLinejoin="round"
      markerEnd={marker}
    />
  );
}

/**
 * Linea ondulata lungo una spezzata: il palleggio ad arco. Come `wavyPath`,
 * l'ultimo tratto e' dritto (lungo la curva) per la punta.
 */
export function wavyAlong(points: Point[], amplitude: number, wavelength: number): string {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const len = cum[cum.length - 1];
  const straight = Math.min(len * 0.3, wavelength * 0.6);
  const waveLen = len - straight;
  const n = Math.max(1, Math.round(waveLen / wavelength));
  const samples = n * 12;
  // Punto e direzione alla distanza `s` lungo la spezzata.
  const at = (s: number) => {
    let i = 1;
    while (i < points.length - 1 && cum[i] < s) i++;
    const a = points[i - 1];
    const b = points[i];
    const seg = cum[i] - cum[i - 1] || 1;
    const k = Math.min(1, Math.max(0, (s - cum[i - 1]) / seg));
    return {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      ux: (b.x - a.x) / seg,
      uy: (b.y - a.y) / seg,
    };
  };
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i <= samples; i++) {
    const s = (i / samples) * waveLen;
    const p = at(s);
    const off = Math.sin((i / samples) * n * 2 * Math.PI) * amplitude;
    d += ` L${p.x - p.uy * off},${p.y + p.ux * off}`;
  }
  for (let s = waveLen + straight / 4; s < len; s += straight / 4) {
    const p = at(s);
    d += ` L${p.x},${p.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x},${last.y}`;
}

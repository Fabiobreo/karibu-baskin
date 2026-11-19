import type { CourtShape } from "@/lib/board/court";

interface CourtLinesProps {
  shapes: CourtShape[];
  /** Spessori nelle unita' del disegno (metri, se il gruppo non e' scalato). */
  thick: number;
  thin: number;
  /** Opacita' del riempimento delle zone dei pivot. */
  fillOpacity?: number;
}

/**
 * Le linee del campo (`courtShapes` di `@/lib/board/court`) come elementi SVG,
 * nel colore del testo (`currentColor`). Va dentro un `<svg>` o un `<g>` che ne
 * decide scala e posizione. Niente "use client": serve anche ai Server Component.
 */
export default function CourtLines({ shapes, thick, thin, fillOpacity = 0.14 }: CourtLinesProps) {
  return (
    <g fill="none" stroke="currentColor">
      {shapes.map((s, i) => {
        const strokeWidth = s.stroke === "thick" ? thick : thin;
        switch (s.kind) {
          case "rect":
            return (
              <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} strokeWidth={strokeWidth} />
            );
          case "line":
            return (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={strokeWidth} />
            );
          case "circle":
            return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} strokeWidth={strokeWidth} />;
          case "path":
            return (
              <path
                key={i}
                d={s.d}
                strokeWidth={strokeWidth}
                fill={s.filled ? "currentColor" : "none"}
                fillOpacity={s.filled ? fillOpacity : undefined}
              />
            );
        }
      })}
    </g>
  );
}

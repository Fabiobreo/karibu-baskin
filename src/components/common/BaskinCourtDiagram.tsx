import { Box, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

// Disegno in unita' da 11 per metro: il campo (28 x 15 m) e' largo 308 e sta in
// un riquadro da 360, cosi' su un telefono da 390 px un'unita' vale circa un
// pixel. Fonte: Regolamento di gioco EISI, Rev. 20, "Campo di gioco (adattato)".
const VIEW = { w: 360, h: 216 };
const COURT = { x: 26, y: 24, w: 308, h: 165 };
const MID = { x: COURT.x + COURT.w / 2, y: COURT.y + COURT.h / 2 };
const RIGHT = COURT.x + COURT.w;
const BOTTOM = COURT.y + COURT.h;
/**
 * Zona dei pivot. Da regolamento il raggio e' 3 m (33 unita'): qui e' un po'
 * piu' grande perche' dentro ci devono stare i due numeri dei ruoli: lo schema
 * dice dove stanno le cose, non le misure.
 */
const ZONE_R = 42;
const CIRCLE_R = 19.8;
const HOOP_R = 3.5;
const KEY = { w: 63.8, h: 54 };
const HOOP_OFFSET = 17.3;
const THREE = { r: 74.25, y: 9.9, x: 32.9 };

type Marker = { x: number; y: number };

const BIG_BASKET_MARKERS: Marker[] = [
  { x: 12, y: MID.y },
  { x: VIEW.w - 12, y: MID.y },
];
const SIDE_BASKET_MARKERS: Marker[] = [
  { x: MID.x, y: 11 },
  { x: MID.x, y: VIEW.h - 13 },
];
/** I Ruoli 3, 4 e 5 a triangolo attorno a `x`, davanti a un canestro grande. */
function cluster(x: number): (Marker & { role: number })[] {
  return [
    { role: 3, x, y: MID.y - 14 },
    { role: 4, x: x - 13, y: MID.y + 12 },
    { role: 5, x: x + 13, y: MID.y + 12 },
  ];
}

/** Chi tira dove: i numeri dei ruoli, messi accanto al loro canestro. */
const ROLE_MARKERS: (Marker & { role: number })[] = [
  // Zone dei pivot, in alto e in basso.
  { role: 1, x: MID.x - 13, y: COURT.y + 21.5 },
  { role: 2, x: MID.x + 13, y: COURT.y + 21.5 },
  { role: 1, x: MID.x - 13, y: BOTTOM - 21.5 },
  { role: 2, x: MID.x + 13, y: BOTTOM - 21.5 },
  // Il Ruolo 3 tira nel canestro a lato da fuori dalla zona. Ogni squadra usa
  // il canestro a lato alla propria destra: chi attacca il canestro grande di
  // destra ha quello in basso, chi attacca a sinistra quello in alto.
  { role: 3, x: MID.x - ZONE_R - 16, y: COURT.y + 15 },
  { role: 3, x: MID.x + ZONE_R + 16, y: BOTTOM - 15 },
  // Canestri grandi: i tre numeri a mucchio, non in fila (in campo non stanno
  // in riga davanti al canestro).
  ...cluster(92),
  ...cluster(VIEW.w - 92),
];

const pct = (value: number, total: number) => `${(value / total) * 100}%`;
const at = ({ x, y }: Marker) =>
  ({
    position: "absolute",
    left: pct(x, VIEW.w),
    top: pct(y, VIEW.h),
    transform: "translate(-50%, -50%)",
  }) as const;

/** Lettera che lega un punto dello schema alla sua riga di legenda. */
function LetterMark({ letter }: { letter: string }) {
  return (
    <Box
      component="span"
      sx={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        typography: "caption",
        fontWeight: FONT_WEIGHT.bold,
        lineHeight: 1,
        bgcolor: "text.primary",
        color: "background.paper",
      }}
    >
      {letter}
    </Box>
  );
}

function LegendRow({ mark, children }: { mark: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box component="li" sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ width: 24, display: "flex", justifyContent: "center", pt: 0.25, flexShrink: 0 }}>
        {mark}
      </Box>
      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
        {children}
      </Typography>
    </Box>
  );
}

/**
 * Schema del campo da Baskin visto dall'alto (UX-41): i due canestri grandi, i
 * due canestri a lato con la zona dei pivot, e accanto a ogni canestro i numeri
 * dei ruoli che ci tirano. Le linee sono un SVG nel colore del testo; lettere e
 * numeri sono HTML sopra il disegno, cosi' restano a 12 px anche quando lo
 * schema si rimpicciolisce. Niente "use client": si usa nei Server Component.
 */
export default function BaskinCourtDiagram() {
  const t = useTranslations("pages.ilbaskin");
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

  return (
    <Box
      component="figure"
      sx={{
        m: 0,
        // Da desktop la legenda sta a fianco: lo schema a tutta colonna era alto 456 px.
        display: { md: "grid" },
        gridTemplateColumns: { md: "minmax(0, 3fr) minmax(0, 2fr)" },
        columnGap: 3,
        alignItems: "center",
      }}
    >
      <Box
        role="img"
        aria-label={t("courtAlt")}
        sx={{
          position: "relative",
          aspectRatio: `${VIEW.w} / ${VIEW.h}`,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          // Le linee prendono il colore da qui (`currentColor`): cosi' seguono il tema.
          color: "text.secondary",
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          width="100%"
          height="100%"
          aria-hidden="true"
          focusable="false"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
        >
          {/* Zone dei pivot: semicerchi a meta' campo, sui due lati. */}
          <path
            d={`M${MID.x - ZONE_R},${COURT.y} A${ZONE_R},${ZONE_R} 0 0 0 ${MID.x + ZONE_R},${COURT.y}`}
            fill="currentColor"
            fillOpacity={0.14}
          />
          <path
            d={`M${MID.x - ZONE_R},${BOTTOM} A${ZONE_R},${ZONE_R} 0 0 1 ${MID.x + ZONE_R},${BOTTOM}`}
            fill="currentColor"
            fillOpacity={0.14}
          />

          {/* Campo: perimetro, meta' campo, cerchio centrale. */}
          <rect x={COURT.x} y={COURT.y} width={COURT.w} height={COURT.h} strokeWidth={2} />
          <line x1={MID.x} y1={COURT.y + ZONE_R} x2={MID.x} y2={BOTTOM - ZONE_R} />
          <circle cx={MID.x} cy={MID.y} r={CIRCLE_R} />

          {/* Aree e linee dei tre punti dei due canestri grandi. */}
          <rect x={COURT.x} y={MID.y - KEY.h / 2} width={KEY.w} height={KEY.h} />
          <rect x={RIGHT - KEY.w} y={MID.y - KEY.h / 2} width={KEY.w} height={KEY.h} />
          <path
            d={`M${COURT.x},${COURT.y + THREE.y} h${THREE.x} A${THREE.r},${THREE.r} 0 0 1 ${COURT.x + THREE.x},${BOTTOM - THREE.y} h${-THREE.x}`}
          />
          <path
            d={`M${RIGHT},${COURT.y + THREE.y} h${-THREE.x} A${THREE.r},${THREE.r} 0 0 0 ${RIGHT - THREE.x},${BOTTOM - THREE.y} h${THREE.x}`}
          />

          {/* Canestri: i due grandi e i due a lato. */}
          <g strokeWidth={2}>
            <circle cx={COURT.x + HOOP_OFFSET} cy={MID.y} r={HOOP_R} />
            <circle cx={RIGHT - HOOP_OFFSET} cy={MID.y} r={HOOP_R} />
            <circle cx={MID.x} cy={COURT.y + HOOP_R + 1.5} r={HOOP_R} />
            <circle cx={MID.x} cy={BOTTOM - HOOP_R - 1.5} r={HOOP_R} />
          </g>
        </svg>

        {/* Lettere e numeri: per chi usa un lettore di schermo c'e' la
            descrizione dello schema e la legenda qui sotto. */}
        <Box aria-hidden="true">
          {BIG_BASKET_MARKERS.map((m, i) => (
            <Box key={`a${i}`} sx={at(m)}>
              <LetterMark letter="A" />
            </Box>
          ))}
          {SIDE_BASKET_MARKERS.map((m, i) => (
            <Box key={`b${i}`} sx={at(m)}>
              <LetterMark letter="B" />
            </Box>
          ))}
          {ROLE_MARKERS.map((m, i) => (
            <Box key={`r${i}`} sx={{ ...at(m), lineHeight: 0 }}>
              <RoleBadge role={m.role} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box component="figcaption" sx={{ mt: { xs: 2, md: 0 } }}>
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", rowGap: 1.25 }}>
          <LegendRow mark={<LetterMark letter="A" />}>
            {t.rich("courtLegendBig", { b: strong })}
          </LegendRow>
          <LegendRow mark={<LetterMark letter="B" />}>
            {t.rich("courtLegendSide", { b: strong })}
          </LegendRow>
          <LegendRow
            mark={
              <Box
                sx={{
                  width: 22,
                  height: 12,
                  mt: 0.5,
                  borderRadius: RADIUS.sm,
                  border: "1px solid",
                  borderColor: "text.secondary",
                  bgcolor: "action.selected",
                }}
              />
            }
          >
            {t.rich("courtLegendZone", { b: strong })}
          </LegendRow>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6 }}>
          {t("courtCaption")}
        </Typography>
      </Box>
    </Box>
  );
}

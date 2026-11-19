import { Box, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { COURT_LENGTH, COURT_WIDTH, courtShapes } from "@/lib/board/court";
import CourtLines from "@/components/board/CourtLines";

// Disegno in unita' da 11 per metro: il campo (28 x 15 m) e' largo 308 e sta in
// un riquadro da 360, cosi' su un telefono da 390 px un'unita' vale circa un
// pixel. Le linee vengono da `@/lib/board/court`, in metri, le stesse della lavagna.
const UNIT = 11;
const VIEW = { w: 360, h: 216 };
const COURT = { x: 26, y: 24, w: COURT_LENGTH * UNIT, h: COURT_WIDTH * UNIT };
const MID = { x: COURT.x + COURT.w / 2, y: COURT.y + COURT.h / 2 };
const BOTTOM = COURT.y + COURT.h;
/**
 * Zona dei pivot. Da regolamento il raggio e' 3 m (33 unita'): qui e' un po'
 * piu' grande perche' dentro ci devono stare i due numeri dei ruoli: lo schema
 * dice dove stanno le cose, non le misure.
 */
const ZONE_R = 42;
/** Ferri piu' grandi del vero e appena dentro il perimetro: a questa scala si vedono. */
const HOOP_R = 3.5;
const SHAPES = courtShapes({
  pivotZoneR: ZONE_R / UNIT,
  hoopR: HOOP_R / UNIT,
  sideHoopInset: (HOOP_R + 1.5) / UNIT,
});

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
        >
          <g transform={`translate(${COURT.x} ${COURT.y}) scale(${UNIT})`}>
            <CourtLines shapes={SHAPES} thick={2 / UNIT} thin={1.25 / UNIT} />
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

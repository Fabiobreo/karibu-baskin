"use client";

import { Box, IconButton, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslations } from "next-intl";
import type { SfidaSide } from "@/lib/games/sfidaState";
import type { SfidaOutcome } from "@/components/games/sfida/SfidaGame";
import { sideFill, sideInitial } from "@/components/games/sfida/sideFill";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { HERO_TEXT } from "@/lib/palette";
import { RADIUS } from "@/lib/radius";
import { TYPE_SCALE } from "@/lib/typeScale";

interface SfidaBoardProps {
  sides: readonly [SfidaSide, SfidaSide];
  hint: string;
  outcome: SfidaOutcome | null;
  onRename: (side: 0 | 1) => void;
}

/**
 * Il tabellone della Sfida (UX-69): le due squadre col loro segno e la matita
 * per il nome; dopo "Gioca" il punteggio, chi vince e, nel sei contro sei, la
 * barra delle probabilità (nella partita intera solo i punteggi dei tempi).
 * Sta sulla testata grafite delle card, scura nei due temi.
 */
export default function SfidaBoard({ sides, hint, outcome, onRename }: SfidaBoardProps) {
  const t = useTranslations("simulator");
  const line = { borderColor: HERO_TEXT.line };
  const winnerName =
    outcome && outcome.winner !== "draw" ? sides[outcome.winner === "A" ? 0 : 1].name : null;

  return (
    <Box
      component="section"
      aria-live="polite"
      sx={{
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        color: HERO_TEXT.primary,
        background: (theme) => theme.palette.heroGradient.cardHead,
        border: "1px solid",
        borderColor: "heroGradient.border",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          pt: 2.5,
          pb: 1.5,
        }}
      >
        <Side
          side={sides[0]}
          onRename={() => onRename(0)}
          label={t("editName", { team: sides[0].name })}
        />
        <Box sx={{ textAlign: "center" }}>
          {outcome ? (
            <Typography
              variant="stat"
              component="p"
              sx={{ whiteSpace: "nowrap", fontSize: { xs: TYPE_SCALE.xl5, sm: TYPE_SCALE.xl6 } }}
            >
              {outcome.scoreA}
              <Box component="span" sx={{ color: HERO_TEXT.muted, mx: 0.75 }}>
                –
              </Box>
              {outcome.scoreB}
            </Typography>
          ) : (
            <Typography variant="h6" component="p" sx={{ color: HERO_TEXT.muted }}>
              {t("vs")}
            </Typography>
          )}
        </Box>
        <Side
          side={sides[1]}
          onRename={() => onRename(1)}
          label={t("editName", { team: sides[1].name })}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{ textAlign: "center", px: 2, pb: 1.75, color: HERO_TEXT.secondary }}
      >
        {winnerName ? (
          <Box
            component="strong"
            sx={{ color: HERO_TEXT.primary, fontWeight: FONT_WEIGHT.semibold }}
          >
            {t("winner", { team: winnerName })}
          </Box>
        ) : (
          hint
        )}
      </Typography>

      {outcome?.kind === "six" && (
        <Box sx={{ px: 2, pb: 1.75 }}>
          <Box
            sx={{
              display: "flex",
              gap: 0.25,
              height: 8,
              borderRadius: RADIUS.pill,
              overflow: "hidden",
            }}
          >
            <Box sx={{ flex: outcome.pctA, bgcolor: sideFill(sides[0].color).bg }} />
            <Box sx={{ flex: 100 - outcome.pctA, bgcolor: sideFill(sides[1].color).bg }} />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 0.5,
              typography: "caption",
              color: HERO_TEXT.muted,
            }}
          >
            <span>{outcome.pctA}%</span>
            <span>{100 - outcome.pctA}%</span>
          </Box>
        </Box>
      )}

      {outcome?.kind === "full" && (
        <Box
          component="ol"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            listStyle: "none",
            m: 0,
            p: 0,
            borderTop: "1px solid",
            ...line,
          }}
        >
          {outcome.quarters.map((q, i) => (
            <Box
              component="li"
              key={i}
              sx={{
                textAlign: "center",
                py: 1,
                typography: "caption",
                color: HERO_TEXT.muted,
                "& + &": { borderLeft: "1px solid", ...line },
              }}
            >
              {t("quarter", { n: i + 1 })}
              <Box
                component="span"
                sx={{
                  display: "block",
                  typography: "body2",
                  fontWeight: FONT_WEIGHT.semibold,
                  color: HERO_TEXT.primary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {q.a} – {q.b}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function Side({ side, onRename, label }: { side: SfidaSide; onRename: () => void; label: string }) {
  const fill = sideFill(side.color);
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: fill.bg,
          color: fill.fg,
          border: fill.ring ? `2px solid ${fill.ring}` : "none",
          typography: "h5",
        }}
      >
        {sideInitial(side.name)}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", maxWidth: "100%", minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          component="h2"
          noWrap
          sx={{ fontWeight: FONT_WEIGHT.semibold }}
        >
          {side.name}
        </Typography>
        <IconButton
          onClick={onRename}
          aria-label={label}
          sx={{ color: HERO_TEXT.secondary, width: 44, height: 44, flex: "none", mr: -1.5 }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

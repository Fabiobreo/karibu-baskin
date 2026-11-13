"use client";

import { Box, ButtonBase, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import type { SfidaPlayerView, SfidaSide } from "@/lib/games/sfidaState";
import { sideFill } from "@/components/games/sfida/sideFill";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface SfidaQuartersProps {
  side: SfidaSide;
  /** I convocati, ordinati per ruolo. */
  roster: SfidaPlayerView[];
  onOpenQuarter: (q: number) => void;
  /** Bottone "Convocati: 10 su 11", sotto la tabella. */
  footer: React.ReactNode;
}

/**
 * Chi gioca nei 4 tempi (UX-69): una riga per convocato, un pallino per tempo.
 * Le intestazioni dei tempi si toccano e aprono il sei contro sei di quel tempo.
 */
export default function SfidaQuarters({ side, roster, onOpenQuarter, footer }: SfidaQuartersProps) {
  const t = useTranslations("simulator");
  const fill = sideFill(side.color);
  const inQuarter = side.quarters.map((q) => new Set(q));
  const sums = side.quarters.map((q) =>
    q.reduce((s, k) => s + (roster.find((p) => p.key === k)?.sportRole ?? 0), 0)
  );

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        bgcolor: "background.paper",
        minWidth: 0,
      }}
    >
      <Box
        component="table"
        aria-label={t("quarterTableLabel", { team: side.name })}
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          "& th, & td": { p: 0, textAlign: "center" },
          "& tbody tr, & tfoot tr": { borderTop: "1px solid", borderColor: "divider" },
        }}
      >
        <colgroup>
          <col />
          {side.quarters.map((_, i) => (
            <Box component="col" key={i} sx={{ width: { xs: 44, sm: 56 } }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <Box
              component="th"
              scope="col"
              sx={{ textAlign: "left !important", px: "10px !important" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    flex: "none",
                    bgcolor: fill.bg,
                    border: fill.ring ? "1px solid" : "none",
                    borderColor: "divider",
                  }}
                />
                <Typography
                  variant="subtitle2"
                  component="span"
                  noWrap
                  sx={{ fontWeight: FONT_WEIGHT.semibold }}
                >
                  {side.name}
                </Typography>
              </Box>
            </Box>
            {side.quarters.map((_, i) => (
              <th key={i} scope="col">
                <ButtonBase
                  onClick={() => onOpenQuarter(i)}
                  aria-label={t("openQuarter", { n: i + 1 })}
                  sx={{
                    width: "100%",
                    minHeight: 44,
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
                  {t("quarterShort", { n: i + 1 })}
                </ButtonBase>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((p) => (
            <tr key={p.key}>
              <Box
                component="th"
                scope="row"
                sx={{ textAlign: "left !important", px: "10px !important" }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 36 }}>
                  <RoleBadge role={p.sportRole ?? 0} />
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {p.name}
                  </Typography>
                </Box>
              </Box>
              {inQuarter.map((set, i) => {
                const on = set.has(p.key);
                return (
                  <td key={i}>
                    <Box
                      role="img"
                      aria-label={on ? t("inField") : t("onBench")}
                      sx={{
                        width: 14,
                        height: 14,
                        mx: "auto",
                        borderRadius: "50%",
                        ...(on
                          ? { bgcolor: "text.primary" }
                          : { border: "1.5px solid", borderColor: "divider" }),
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <Box
              component="th"
              scope="row"
              sx={{ textAlign: "left !important", px: "10px !important", py: "8px !important" }}
            >
              <Typography variant="caption" color="text.secondary">
                {t("roleSum")}
              </Typography>
            </Box>
            {sums.map((s, i) => (
              <td key={i}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {s}
                </Typography>
              </td>
            ))}
          </tr>
        </tfoot>
      </Box>
      <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>{footer}</Box>
    </Box>
  );
}

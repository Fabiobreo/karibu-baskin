"use client";

import { Box, ButtonBase, Typography } from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AddIcon from "@mui/icons-material/Add";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import type { SfidaPlayerView, SfidaSide } from "@/lib/games/sfidaState";
import { sideFill } from "@/components/games/sfida/sideFill";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface SfidaLineupProps {
  side: SfidaSide;
  /** I sei in campo, già risolti (ordinati per ruolo). Meno di sei = posti liberi. */
  players: SfidaPlayerView[];
  onPick: (player: SfidaPlayerView | null) => void;
}

/**
 * Una formazione della Sfida (UX-69): il segno e il nome del lato, poi sei
 * righe da 44 px. Toccando una riga si apre l'elenco dei soli cambi possibili;
 * un posto libero apre l'elenco di chi può entrare.
 */
export default function SfidaLineup({ side, players, onPick }: SfidaLineupProps) {
  const t = useTranslations("simulator");
  const fill = sideFill(side.color);
  const empty = Math.max(0, 6 - players.length);

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
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
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
          component="h3"
          noWrap
          sx={{ fontWeight: FONT_WEIGHT.semibold }}
        >
          {side.name}
        </Typography>
      </Box>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {players.map((p) => (
          <Row key={p.key} onClick={() => onPick(p)} label={t("swapTitle", { name: p.name })}>
            <RoleBadge role={p.sportRole ?? 0} />
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {p.name}
            </Typography>
            <SwapHorizIcon fontSize="small" sx={{ color: "text.secondary", flex: "none" }} />
          </Row>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <Row
            key={`empty-${i}`}
            onClick={() => onPick(null)}
            label={t("addTitle", { team: side.name })}
          >
            <Box
              aria-hidden
              sx={{
                width: 24,
                height: 24,
                borderRadius: RADIUS.sm,
                border: "1px dashed",
                borderColor: "text.secondary",
                display: "grid",
                placeItems: "center",
                flex: "none",
              }}
            >
              <AddIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
              {t("emptySlot")}
            </Typography>
          </Row>
        ))}
      </Box>
    </Box>
  );
}

function Row({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <Box component="li" sx={{ "& + &": { borderTop: "1px solid", borderColor: "divider" } }}>
      <ButtonBase
        onClick={onClick}
        aria-label={label}
        sx={{
          width: "100%",
          minHeight: 44,
          px: 1.25,
          gap: 1,
          justifyContent: "flex-start",
          textAlign: "left",
          "&:hover": { bgcolor: "action.hover" },
          "&.Mui-focusVisible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: "-2px",
          },
        }}
      >
        {children}
      </ButtonBase>
    </Box>
  );
}

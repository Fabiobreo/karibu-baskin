"use client";

import { Box, ButtonBase, Drawer, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import type { SfidaPlayerView } from "@/lib/games/sfidaState";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

export interface SwapChoice {
  player: SfidaPlayerView;
  /** "bench" o il nome dell'altra squadra (scambio). */
  from: "bench" | { other: string };
}

interface SfidaSwapSheetProps {
  open: boolean;
  title: string;
  subtitle: string | null;
  choices: SwapChoice[];
  /** Una riga che spiega perché qualcuno non è nell'elenco. */
  note: string | null;
  onChoose: (choice: SwapChoice) => void;
  onClose: () => void;
}

/**
 * I cambi possibili (UX-69): dal basso su telefono e su desktop, solo chi può
 * entrare lasciando valida la formazione. Niente livelli, solo ruolo e nome.
 */
export default function SfidaSwapSheet({
  open,
  title,
  subtitle,
  choices,
  note,
  onChoose,
  onClose,
}: SfidaSwapSheetProps) {
  const t = useTranslations("simulator");
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: RADIUS.lg,
            borderTopRightRadius: RADIUS.lg,
            maxWidth: 560,
            mx: "auto",
            maxHeight: "80vh",
            pb: "max(16px, env(safe-area-inset-bottom, 0px))",
          },
          "aria-labelledby": "sfida-swap-title",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 4,
          borderRadius: RADIUS.pill,
          bgcolor: "divider",
          mx: "auto",
          mt: 1,
          mb: 1.5,
        }}
      />
      <Box sx={{ px: 2, pb: 1 }}>
        <Typography id="sfida-swap-title" variant="h6" component="h2">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {choices.length === 0 ? (
        note ? null : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            {t("noOptions")}
          </Typography>
        )
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, overflowY: "auto" }}>
          {choices.map((c) => (
            <Box component="li" key={c.player.key}>
              <ButtonBase
                onClick={() => onChoose(c)}
                sx={{
                  width: "100%",
                  minHeight: 48,
                  px: 2,
                  gap: 1.25,
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
                <RoleBadge role={c.player.sportRole ?? 0} />
                <Typography variant="body1" noWrap sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                  {c.player.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  · {c.from === "bench" ? t("fromBench") : t("fromOther", { team: c.from.other })}
                </Typography>
              </ButtonBase>
            </Box>
          ))}
        </Box>
      )}
      {note && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pt: 1.5 }}>
          {note}
        </Typography>
      )}
    </Drawer>
  );
}

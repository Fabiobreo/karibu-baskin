"use client";
import { useState } from "react";
import { Box, Button, IconButton, Menu, MenuItem, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useTranslations } from "next-intl";
import { MAX_STEP_TEXT, MAX_STEPS } from "@/lib/board/content";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

interface DrillStepsBarProps {
  total: number;
  current: number;
  text: string;
  onPick: (i: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  onText: (text: string) => void;
  /** Il campo prende il focus: comincia una scrittura da annullare in un colpo. */
  onTextFocus: () => void;
}

/**
 * Striscia dei passi dell'editor (UX-72): un bottone per passo, "+ Passo"
 * (riparte da dove si era rimasti), e nel "⋯" sposta ed elimina. Sotto, la
 * riga che spiega il passo. Condivisa con l'editor delle proposte (UX-73).
 */
export default function DrillStepsBar({
  total,
  current,
  text,
  onPick,
  onAdd,
  onRemove,
  onMove,
  onText,
  onTextFocus,
}: DrillStepsBarProps) {
  const t = useTranslations("board.editor");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const act = (fn: () => void) => () => {
    setAnchor(null);
    fn();
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box
        role="group"
        aria-label={t("steps")}
        sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}
      >
        <Typography variant="subtitle2" component="p" sx={{ mr: 0.5 }}>
          {t("steps")}
        </Typography>
        {Array.from({ length: total }, (_, i) => (
          <Button
            key={i}
            variant={i === current ? "contained" : "outlined"}
            onClick={() => onPick(i)}
            aria-current={i === current ? "step" : undefined}
            aria-label={t("stepN", { n: i + 1 })}
            sx={{
              minWidth: TOUCH_TARGET_SIZE,
              height: TOUCH_TARGET_SIZE,
              px: 0,
              borderRadius: RADIUS.md,
            }}
          >
            {i + 1}
          </Button>
        ))}
        <Button
          variant="text"
          startIcon={<AddIcon />}
          onClick={onAdd}
          disabled={total >= MAX_STEPS}
          sx={{ minHeight: TOUCH_TARGET_SIZE }}
        >
          {t("addStep")}
        </Button>
        <IconButton
          aria-label={t("stepMore", { n: current + 1 })}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
        >
          <MoreHorizIcon />
        </IconButton>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <MenuItem onClick={act(() => onMove(-1))} disabled={current === 0}>
            {t("moveBefore")}
          </MenuItem>
          <MenuItem onClick={act(() => onMove(1))} disabled={current >= total - 1}>
            {t("moveAfter")}
          </MenuItem>
          <MenuItem onClick={act(onRemove)} disabled={total <= 1}>
            {t("removeStep", { n: current + 1 })}
          </MenuItem>
        </Menu>
      </Box>
      <TextField
        label={t("stepText", { n: current + 1 })}
        placeholder={t("stepTextPlaceholder")}
        value={text}
        onChange={(e) => onText(e.target.value)}
        onFocus={onTextFocus}
        helperText={t("stepTextHelp", { count: text.length, max: MAX_STEP_TEXT })}
        slotProps={{ htmlInput: { maxLength: MAX_STEP_TEXT } }}
        fullWidth
      />
    </Box>
  );
}

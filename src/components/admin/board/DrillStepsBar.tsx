"use client";
import { useState } from "react";
import { Box, Button, IconButton, Menu, MenuItem, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
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
}

/**
 * Striscia dei passi dell'editor (UX-72): un bottone per passo, "+ Passo"
 * (riparte da dove si era rimasti), e nel "⋯" sposta ed elimina. Sotto, la
 * riga che spiega il passo.
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
}: DrillStepsBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const act = (fn: () => void) => () => {
    setAnchor(null);
    fn();
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box
        role="group"
        aria-label="Passi"
        sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}
      >
        <Typography variant="subtitle2" component="p" sx={{ mr: 0.5 }}>
          Passi
        </Typography>
        {Array.from({ length: total }, (_, i) => (
          <Button
            key={i}
            variant={i === current ? "contained" : "outlined"}
            onClick={() => onPick(i)}
            aria-current={i === current ? "step" : undefined}
            aria-label={`Passo ${i + 1}`}
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
          Passo
        </Button>
        <IconButton
          aria-label={`Altro sul passo ${current + 1}`}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE }}
        >
          <MoreHorizIcon />
        </IconButton>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <MenuItem onClick={act(() => onMove(-1))} disabled={current === 0}>
            Sposta prima
          </MenuItem>
          <MenuItem onClick={act(() => onMove(1))} disabled={current >= total - 1}>
            Sposta dopo
          </MenuItem>
          <MenuItem onClick={act(onRemove)} disabled={total <= 1}>
            Elimina il passo {current + 1}
          </MenuItem>
        </Menu>
      </Box>
      <TextField
        label={`Cosa succede nel passo ${current + 1}`}
        placeholder="Il 3 riceve e va al settore centrale"
        value={text}
        onChange={(e) => onText(e.target.value)}
        helperText={`${text.length}/${MAX_STEP_TEXT} · si legge sopra la lavagna`}
        slotProps={{ htmlInput: { maxLength: MAX_STEP_TEXT } }}
        fullWidth
      />
    </Box>
  );
}

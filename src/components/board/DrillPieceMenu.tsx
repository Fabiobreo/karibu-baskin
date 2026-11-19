"use client";
import { useState } from "react";
import { Button, ListSubheader, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useTranslations } from "next-intl";
import type { DrillPiece } from "@/lib/board/content";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

/** Un pezzo da aggiungere, senza codice: lo assegna `addPiece`. */
export type NewPiece = Omit<DrillPiece, "id">;

const ROLES = [1, 2, 3, 4, 5] as const;

/**
 * Menu "Aggiungi" dell'editor (UX-72): pedine di ruolo d'attacco e di difesa,
 * pedine senza ruolo, allenatore e tutor, materiali, nota. Il pezzo nuovo
 * compare in un posto libero vicino al centro e si trascina dove serve.
 * Condiviso fra l'editor dello staff e quello delle proposte (UX-73).
 */
export default function DrillPieceMenu({
  onAdd,
  disabled,
}: {
  onAdd: (piece: NewPiece) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("board.editor");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const pick = (piece: NewPiece) => {
    setAnchor(null);
    onAdd(piece);
  };
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        sx={{ minHeight: TOUCH_TARGET_SIZE }}
      >
        {t("add")}
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        <ListSubheader>{t("menuAttack")}</ListSubheader>
        {ROLES.map((role) => (
          <MenuItem key={`a${role}`} onClick={() => pick({ kind: "role", side: "attack", role })}>
            {t("role", { n: role })}
          </MenuItem>
        ))}
        <ListSubheader>{t("menuDefense")}</ListSubheader>
        {ROLES.map((role) => (
          <MenuItem key={`d${role}`} onClick={() => pick({ kind: "role", side: "defense", role })}>
            {t("role", { n: role })}
          </MenuItem>
        ))}
        <ListSubheader>{t("menuNoRole")}</ListSubheader>
        <MenuItem onClick={() => pick({ kind: "free", side: "attack", label: "A" })}>
          {t("freeAttack")}
        </MenuItem>
        <MenuItem onClick={() => pick({ kind: "free", side: "defense", label: "A" })}>
          {t("freeDefense")}
        </MenuItem>
        <ListSubheader>{t("menuStaff")}</ListSubheader>
        <MenuItem onClick={() => pick({ kind: "coach", coach: "coach" })}>{t("coach")}</MenuItem>
        <MenuItem onClick={() => pick({ kind: "coach", coach: "tutor" })}>{t("tutor")}</MenuItem>
        <ListSubheader>{t("menuMaterials")}</ListSubheader>
        <MenuItem onClick={() => pick({ kind: "cone" })}>{t("cone")}</MenuItem>
        <MenuItem onClick={() => pick({ kind: "ring" })}>{t("ring")}</MenuItem>
        <MenuItem onClick={() => pick({ kind: "chair" })}>{t("chair")}</MenuItem>
        <MenuItem onClick={() => pick({ kind: "note", label: t("noteDefault") })}>
          {t("note")}
        </MenuItem>
      </Menu>
    </>
  );
}

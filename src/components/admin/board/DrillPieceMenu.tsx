"use client";
import { useState } from "react";
import { Button, ListSubheader, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { DrillPiece } from "@/lib/board/content";

/** Un pezzo da aggiungere, senza codice: lo assegna `addPiece`. */
export type NewPiece = Omit<DrillPiece, "id">;

const ROLES = [1, 2, 3, 4, 5] as const;

/**
 * Menu "Aggiungi" dell'editor (UX-72): pedine di ruolo d'attacco e di difesa,
 * pedine senza ruolo, allenatore e tutor, materiali, nota. Il pezzo nuovo
 * compare in un posto libero vicino al centro e si trascina dove serve.
 */
export default function DrillPieceMenu({
  onAdd,
  disabled,
}: {
  onAdd: (piece: NewPiece) => void;
  disabled?: boolean;
}) {
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
        sx={{ minHeight: 44 }}
      >
        Aggiungi
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        <ListSubheader>Attacco (pedina piena)</ListSubheader>
        {ROLES.map((role) => (
          <MenuItem key={`a${role}`} onClick={() => pick({ kind: "role", side: "attack", role })}>
            Ruolo {role}
          </MenuItem>
        ))}
        <ListSubheader>Difesa (pedina contornata)</ListSubheader>
        {ROLES.map((role) => (
          <MenuItem key={`d${role}`} onClick={() => pick({ kind: "role", side: "defense", role })}>
            Ruolo {role}
          </MenuItem>
        ))}
        <ListSubheader>Senza ruolo</ListSubheader>
        <MenuItem onClick={() => pick({ kind: "free", side: "attack", label: "A" })}>
          Pedina piena (file, esercizi)
        </MenuItem>
        <MenuItem onClick={() => pick({ kind: "free", side: "defense", label: "A" })}>
          Pedina contornata
        </MenuItem>
        <ListSubheader>Staff</ListSubheader>
        <MenuItem onClick={() => pick({ kind: "coach", coach: "coach" })}>Allenatore</MenuItem>
        <MenuItem onClick={() => pick({ kind: "coach", coach: "tutor" })}>Tutor</MenuItem>
        <ListSubheader>Materiali</ListSubheader>
        <MenuItem onClick={() => pick({ kind: "cone" })}>Cono</MenuItem>
        <MenuItem onClick={() => pick({ kind: "ring" })}>Cerchio</MenuItem>
        <MenuItem onClick={() => pick({ kind: "chair" })}>Sedia</MenuItem>
        <MenuItem onClick={() => pick({ kind: "note", label: "Nota" })}>Nota scritta</MenuItem>
      </Menu>
    </>
  );
}

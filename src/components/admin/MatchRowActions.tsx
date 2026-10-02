"use client";
import { useState } from "react";
import { Box, Button, Divider, IconButton, Menu, MenuItem } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  matchMenuActions,
  matchPrimaryAction,
  type MatchRowActionKey,
  type MatchRowState,
} from "@/lib/matches/adminRowAction";
import { TOUCH_TARGET } from "@/lib/touchTarget";

interface MatchRowActionsProps {
  state: MatchRowState;
  /** "Kapuleti vs Falchi Vicenza": distingue i bottoni di righe diverse per chi non vede. */
  matchLabel: string;
  /** Dove portano le azioni che sono una pagina; le altre passano da `onAction`. */
  hrefs: Partial<Record<MatchRowActionKey, string>>;
  onAction: (key: MatchRowActionKey) => void;
  /** `card`: su telefono, bottone a tutta larghezza da 44 px. */
  layout?: "row" | "card";
}

/**
 * Azioni di una riga di `/admin/partite` (UX-40): un bottone con l'etichetta
 * per quello che manca alla partita, e "⋯" per il resto. Quali, lo decide
 * `@/lib/matches/adminRowAction`.
 */
export default function MatchRowActions({
  state,
  matchLabel,
  hrefs,
  onAction,
  layout = "row",
}: MatchRowActionsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const primary = matchPrimaryAction(state);
  const menu = matchMenuActions(state);
  const card = layout === "card";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 0.5,
        ...(card && { mt: 1 }),
      }}
    >
      <Button
        variant={primary.emphasis}
        size={card ? "medium" : "small"}
        href={hrefs[primary.key]}
        onClick={hrefs[primary.key] ? undefined : () => onAction(primary.key)}
        aria-label={`${primary.label}: ${matchLabel}`}
        sx={{
          whiteSpace: "nowrap",
          ...(card && { flex: 1, minHeight: 44 }),
        }}
      >
        {primary.label}
      </Button>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={`Altre azioni: ${matchLabel}`}
        aria-haspopup="menu"
        aria-expanded={anchor ? "true" : undefined}
        sx={TOUCH_TARGET}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {menu.flatMap((item) => {
          const href = hrefs[item.key];
          const sx = { minHeight: 44, ...(item.key === "delete" && { color: "error.main" }) };
          const entry = href ? (
            <MenuItem
              key={item.key}
              href={href}
              // La pagina pubblica si apre accanto: chi sta lavorando non perde il posto.
              {...(item.key === "public" && { target: "_blank", rel: "noopener" })}
              onClick={() => setAnchor(null)}
              sx={sx}
            >
              {item.label}
            </MenuItem>
          ) : (
            <MenuItem
              key={item.key}
              onClick={() => {
                setAnchor(null);
                onAction(item.key);
              }}
              sx={sx}
            >
              {item.label}
            </MenuItem>
          );
          return item.key === "delete" ? [<Divider key="divider" />, entry] : [entry];
        })}
      </Menu>
    </Box>
  );
}

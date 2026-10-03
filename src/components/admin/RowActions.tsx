"use client";
import { useState, type RefObject } from "react";
import { Box, Button, Divider, IconButton, Menu, MenuItem } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import LinkBehavior from "@/components/common/LinkBehavior";
import { TOUCH_TARGET, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

/** Una voce: porta a una pagina (`href`) o fa qualcosa (`onClick`). */
export interface RowAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Si apre in una scheda nuova (la pagina pubblica): chi lavora non perde il posto. */
  external?: boolean;
}

export interface RowPrimaryAction extends RowAction {
  /** Enfasi del bottone in riga: `outlined` di default, `contained` quando manca qualcosa. */
  emphasis?: "contained" | "outlined" | "text";
}

export interface RowDeleteConfirm {
  title: string;
  message: string;
  confirmLabel?: string;
}

export interface RowActionsProps {
  /** Di cosa si parla ("Torneo di Natale"): entra nei nomi accessibili dei bottoni. */
  subject: string;
  /** L'azione con l'etichetta in riga, quella che si usa di più. */
  primary?: RowPrimaryAction;
  /** Il resto, nel menu "⋯". */
  items?: RowAction[];
  /**
   * Eliminare: sempre l'ultima voce, dopo il divisore, e sempre con una conferma.
   * `false` = non è andata (errore già mostrato): il focus resta dov'è.
   */
  onDelete?: () => void | boolean | Promise<void | boolean>;
  /** Etichetta della voce ("Elimina evento…"). */
  deleteLabel?: string;
  /**
   * Testo della conferma. Senza, una domanda generica sul `subject`. `false`
   * solo se la conferma la chiede già il chiamante (involucri di UX-40).
   */
  deleteConfirm?: RowDeleteConfirm | false;
  /**
   * Dove va il focus dopo l'eliminazione: la riga sparisce, e con lei il bottone
   * che aveva il focus. Un punto fisso (intestazione della lista, "Nuovo").
   */
  focusAfterDelete?: RefObject<HTMLElement | null>;
  /** `card`: su telefono il bottone in riga si allarga (solo per chi lo chiede). */
  layout?: "row" | "card";
  /** Per il "⋯" su un fondo pieno (tessera squadra). */
  menuButtonSx?: SxProps<Theme>;
  /**
   * Il bottone con l'etichetta c'è, ma sta altrove nella card (la tessera
   * squadra ha il "⋯" sulla tinta e "Rosa" sotto): il "⋯" resta "Altre azioni".
   */
  primaryElsewhere?: boolean;
  /** Nome del "⋯" già pronto (pagine pubbliche: tradotto). Prevale su quello calcolato. */
  menuLabel?: string;
}

/** Nome del "⋯": "Altre azioni" quando accanto c'è già un bottone con l'etichetta. */
export function rowMenuLabel(subject: string, hasPrimary: boolean): string {
  return `${hasPrimary ? "Altre azioni" : "Azioni"}: ${subject}`;
}

/**
 * Azioni di una riga di una lista admin (UX-40, UX-47): un bottone con
 * l'etichetta e un menu "⋯" da 44 px con il resto; "Elimina…" in fondo, dopo
 * il divisore, dietro una conferma. Niente file di icone senza nome, niente
 * cestini rossi in riga.
 */
export default function RowActions({
  subject,
  primary,
  items = [],
  onDelete,
  deleteLabel = "Elimina…",
  deleteConfirm,
  focusAfterDelete,
  layout = "row",
  menuButtonSx,
  primaryElsewhere = false,
  menuLabel,
}: RowActionsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const close = () => setAnchor(null);
  const card = layout === "card";

  async function runDelete() {
    if (!onDelete) return;
    if ((await onDelete()) === false) return;
    // Dopo il ripristino del focus del dialog, che punterebbe al "⋯" ormai sparito.
    requestAnimationFrame(() => focusAfterDelete?.current?.focus());
  }

  function askDelete() {
    close();
    if (deleteConfirm === false) {
      void runDelete();
      return;
    }
    const c = deleteConfirm ?? {
      title: "Eliminare?",
      message: `Eliminare "${subject}"? L'azione non si può annullare.`,
    };
    openConfirm(c.title, c.message, () => void runDelete(), {
      confirmLabel: c.confirmLabel ?? "Elimina",
    });
  }

  const hasMenu = items.length > 0 || !!onDelete;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 0.5,
        flexShrink: 0,
        ...(card && { mt: 1 }),
      }}
    >
      {primary && (
        <Button
          variant={primary.emphasis ?? "outlined"}
          size={card ? "medium" : "small"}
          href={primary.href}
          onClick={primary.href ? undefined : primary.onClick}
          {...(primary.external && { target: "_blank", rel: "noopener" })}
          aria-label={`${primary.label}: ${subject}`}
          sx={{
            whiteSpace: "nowrap",
            ...TOUCH_TARGET_ON_PHONE,
            ...(card && { flex: 1, minHeight: 44 }),
          }}
        >
          {primary.label}
        </Button>
      )}
      {hasMenu && (
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={menuLabel ?? rowMenuLabel(subject, !!primary || primaryElsewhere)}
          aria-haspopup="menu"
          aria-expanded={anchor ? "true" : undefined}
          sx={[
            TOUCH_TARGET,
            { flexShrink: 0 },
            ...(Array.isArray(menuButtonSx) ? menuButtonSx : menuButtonSx ? [menuButtonSx] : []),
          ]}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {items.map((item) =>
          item.href ? (
            <MenuItem
              key={item.label}
              // Un MenuItem è un <li>: senza `component` il tema non lo fa
              // diventare un link e `href` non porta da nessuna parte.
              component={LinkBehavior}
              href={item.href}
              {...(item.external && { target: "_blank", rel: "noopener" })}
              onClick={close}
              sx={{ minHeight: 44 }}
            >
              {item.label}
            </MenuItem>
          ) : (
            <MenuItem
              key={item.label}
              onClick={() => {
                close();
                item.onClick?.();
              }}
              sx={{ minHeight: 44 }}
            >
              {item.label}
            </MenuItem>
          )
        )}
        {onDelete && items.length > 0 && <Divider />}
        {onDelete && (
          <MenuItem onClick={askDelete} sx={{ minHeight: 44, color: "error.main" }}>
            {deleteLabel}
          </MenuItem>
        )}
      </Menu>
      {ConfirmDialog}
    </Box>
  );
}

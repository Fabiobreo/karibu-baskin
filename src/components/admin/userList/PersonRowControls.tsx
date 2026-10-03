"use client";
import type { ReactNode } from "react";
import { ButtonBase, Link as MuiLink } from "@mui/material";
import RowActions from "@/components/admin/RowActions";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

/**
 * Il nome nella riga di una tabella utenti: è il bottone che apre la scheda
 * (UX-40). Non la riga intera: con tendine e bottoni dentro, una riga
 * cliccabile non si raggiunge da tastiera e scatta per sbaglio.
 */
export function PersonNameButton({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <MuiLink
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={`Apri la scheda di ${name}`}
      underline="hover"
      color="inherit"
      variant="body2"
      sx={{
        display: "block",
        maxWidth: "100%",
        fontWeight: FONT_WEIGHT.semibold,
        textAlign: "left",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </MuiLink>
  );
}

/**
 * Su telefono è tutta la parte sinistra della card ad aprire la scheda: un
 * bersaglio grande, e dentro non ci sono altri controlli.
 */
export function PersonCardButton({
  name,
  onOpen,
  children,
}: {
  name: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    // `div` con ruolo di bottone: dentro ci sono blocchi, che in un <button> non
    // sono HTML valido. ButtonBase aggiunge ruolo, Tab, Invio e Spazio.
    <ButtonBase
      component="div"
      onClick={onOpen}
      aria-label={`Apri la scheda di ${name}`}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1.5,
        textAlign: "left",
        borderRadius: RADIUS.md,
      }}
    >
      {children}
    </ButtonBase>
  );
}

/**
 * Il menu "⋯" della riga: al posto di matita e cestino rosso su ognuna delle
 * cento e passa righe. Eliminare resta dietro al menu e alla sua conferma, che
 * chiede il chiamante. Il disegno è quello di `RowActions`.
 */
export function PersonRowMenu({
  name,
  canDelete,
  onOpen,
  onDelete,
}: {
  name: string;
  /** Un account lo elimina solo l'admin; un figlio senza account anche l'allenatore. */
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <RowActions
      subject={name}
      items={[{ label: "Apri scheda", onClick: onOpen }]}
      onDelete={canDelete ? onDelete : undefined}
      deleteConfirm={false}
    />
  );
}

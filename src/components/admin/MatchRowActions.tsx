"use client";
import RowActions from "@/components/admin/RowActions";
import {
  matchMenuActions,
  matchPrimaryAction,
  type MatchRowActionKey,
  type MatchRowState,
} from "@/lib/matches/adminRowAction";

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
 * `@/lib/matches/adminRowAction`; il disegno è quello di `RowActions`.
 */
export default function MatchRowActions({
  state,
  matchLabel,
  hrefs,
  onAction,
  layout = "row",
}: MatchRowActionsProps) {
  const primary = matchPrimaryAction(state);
  const menu = matchMenuActions(state);
  const del = menu.find((i) => i.key === "delete");
  const toAction = (key: MatchRowActionKey, label: string) => {
    const href = hrefs[key];
    return href
      ? { label, href, external: key === "public" }
      : { label, onClick: () => onAction(key) };
  };

  return (
    <RowActions
      subject={matchLabel}
      layout={layout}
      primary={{ ...toAction(primary.key, primary.label), emphasis: primary.emphasis }}
      items={menu.filter((i) => i.key !== "delete").map((i) => toAction(i.key, i.label))}
      // La conferma la chiede `AdminPartiteClient`, come prima.
      onDelete={del ? () => onAction("delete") : undefined}
      deleteLabel={del?.label}
      deleteConfirm={false}
    />
  );
}

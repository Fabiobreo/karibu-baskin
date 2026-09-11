"use client";
import { useState } from "react";
import type { TeamCallupContext } from "@/lib/matches/callupContext";

/** Riga candidato con statistiche, come prodotta da buildTeamCallupContext. */
export type ConvocazioneStatRow = TeamCallupContext["stats"][number];

export interface TeamSelectionState {
  userIds: Set<string>;
  childIds: Set<string>;
}

function has(sel: TeamSelectionState | undefined, row: ConvocazioneStatRow): boolean {
  if (!sel) return false;
  return row.candidate.kind === "user"
    ? sel.userIds.has(row.candidate.id)
    : sel.childIds.has(row.candidate.id);
}

/**
 * Stato di selezione dei convocati per squadra (amichevoli interne = 2 squadre).
 * Espone toggle/selectAll/clearAll relativi alla squadra attiva.
 *
 * Un giocatore gioca per un solo lato. Con la Karibu di stagione lo stesso
 * giocatore è candidato su entrambi (es. Montekki vs Karibu): selezionarlo su
 * un lato lo toglie dall'altro, e "Tutti" salta chi è già convocato altrove.
 */
export function useConvocazioniSelection(
  teams: TeamCallupContext[],
  activeTeam: TeamCallupContext
) {
  const [selectionByTeam, setSelectionByTeam] = useState<Map<string, TeamSelectionState>>(() => {
    const m = new Map<string, TeamSelectionState>();
    for (const t of teams) {
      m.set(t.id, {
        userIds: new Set(t.initialSelectedUserIds),
        childIds: new Set(t.initialSelectedChildIds),
      });
    }
    return m;
  });

  const activeSelection = selectionByTeam.get(activeTeam.id) ?? {
    userIds: new Set<string>(),
    childIds: new Set<string>(),
  };

  function isSelected(row: ConvocazioneStatRow): boolean {
    return has(activeSelection, row);
  }

  /** Nome dell'altra squadra per cui il giocatore è già convocato, se c'è. */
  function selectedElsewhere(row: ConvocazioneStatRow): string | null {
    for (const t of teams) {
      if (t.id !== activeTeam.id && has(selectionByTeam.get(t.id), row)) return t.name;
    }
    return null;
  }

  function toggle(row: ConvocazioneStatRow) {
    const { kind, id } = row.candidate;
    setSelectionByTeam((prev) => {
      const adding = !has(prev.get(activeTeam.id), row);
      const next = new Map<string, TeamSelectionState>();
      for (const [teamId, sel] of prev) {
        const userIds = new Set(sel.userIds);
        const childIds = new Set(sel.childIds);
        const ids = kind === "user" ? userIds : childIds;
        if (teamId === activeTeam.id) {
          if (adding) ids.add(id);
          else ids.delete(id);
        } else if (adding) {
          ids.delete(id);
        }
        next.set(teamId, { userIds, childIds });
      }
      if (!next.has(activeTeam.id) && adding) {
        next.set(activeTeam.id, {
          userIds: new Set(kind === "user" ? [id] : []),
          childIds: new Set(kind === "child" ? [id] : []),
        });
      }
      return next;
    });
  }

  function selectAll() {
    // "Tutti" seleziona solo i disponibili (esclude chi ha marcato Non
    // disponibile) e non ruba all'altra squadra chi vi è già convocato.
    const pickable = activeTeam.stats.filter(
      (s) => s.availability !== false && selectedElsewhere(s) === null
    );
    setSelectionByTeam((prev) => {
      const next = new Map(prev);
      next.set(activeTeam.id, {
        userIds: new Set(
          pickable.filter((s) => s.candidate.kind === "user").map((s) => s.candidate.id)
        ),
        childIds: new Set(
          pickable.filter((s) => s.candidate.kind === "child").map((s) => s.candidate.id)
        ),
      });
      return next;
    });
  }

  function clearAll() {
    setSelectionByTeam((prev) => {
      const next = new Map(prev);
      next.set(activeTeam.id, { userIds: new Set(), childIds: new Set() });
      return next;
    });
  }

  const totalSelectedActive = activeSelection.userIds.size + activeSelection.childIds.size;
  const totalSelectedAll = Array.from(selectionByTeam.values()).reduce(
    (acc, s) => acc + s.userIds.size + s.childIds.size,
    0
  );

  return {
    selectionByTeam,
    activeSelection,
    isSelected,
    selectedElsewhere,
    toggle,
    selectAll,
    clearAll,
    totalSelectedActive,
    totalSelectedAll,
  };
}

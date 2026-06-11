"use client";
import { useState } from "react";
import type { TeamCallupContext } from "@/lib/callupContext";

/** Riga candidato con statistiche, come prodotta da buildTeamCallupContext. */
export type ConvocazioneStatRow = TeamCallupContext["stats"][number];

export interface TeamSelectionState {
  userIds: Set<string>;
  childIds: Set<string>;
}

/**
 * Stato di selezione dei convocati per squadra (amichevoli interne = 2 squadre).
 * Espone toggle/selectAll/clearAll relativi alla squadra attiva.
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
    return row.candidate.kind === "user"
      ? activeSelection.userIds.has(row.candidate.id)
      : activeSelection.childIds.has(row.candidate.id);
  }

  function updateActiveSelection(updater: (curr: TeamSelectionState) => TeamSelectionState) {
    setSelectionByTeam((prev) => {
      const next = new Map(prev);
      const curr = next.get(activeTeam.id) ?? {
        userIds: new Set<string>(),
        childIds: new Set<string>(),
      };
      next.set(activeTeam.id, updater(curr));
      return next;
    });
  }

  function toggle(row: ConvocazioneStatRow) {
    if (row.candidate.kind === "user") {
      updateActiveSelection((curr) => {
        const nextUserIds = new Set(curr.userIds);
        if (nextUserIds.has(row.candidate.id)) nextUserIds.delete(row.candidate.id);
        else nextUserIds.add(row.candidate.id);
        return { userIds: nextUserIds, childIds: curr.childIds };
      });
    } else {
      updateActiveSelection((curr) => {
        const nextChildIds = new Set(curr.childIds);
        if (nextChildIds.has(row.candidate.id)) nextChildIds.delete(row.candidate.id);
        else nextChildIds.add(row.candidate.id);
        return { userIds: curr.userIds, childIds: nextChildIds };
      });
    }
  }

  function selectAll() {
    // "Tutti" seleziona solo i disponibili (esclude chi ha marcato Non disponibile)
    updateActiveSelection(() => ({
      userIds: new Set(
        activeTeam.stats
          .filter((s) => s.candidate.kind === "user" && s.availability !== false)
          .map((s) => s.candidate.id)
      ),
      childIds: new Set(
        activeTeam.stats
          .filter((s) => s.candidate.kind === "child" && s.availability !== false)
          .map((s) => s.candidate.id)
      ),
    }));
  }

  function clearAll() {
    updateActiveSelection(() => ({ userIds: new Set(), childIds: new Set() }));
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
    toggle,
    selectAll,
    clearAll,
    totalSelectedActive,
    totalSelectedAll,
  };
}

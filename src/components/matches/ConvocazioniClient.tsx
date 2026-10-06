"use client";

import InlineError from "@/components/common/InlineError";
import { useMemo, useState } from "react";
import { Box, Button } from "@mui/material";
import PageHeader from "@/components/common/PageHeader";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import type { CandidateInput } from "@/lib/matches/callupStats";
import type { TeamCallupContext, LoanCandidate } from "@/lib/matches/callupContext";
import LineupOptimizerSection from "@/components/teams/LineupOptimizerSection";
import {
  useConvocazioniSelection,
  type ConvocazioneStatRow,
} from "@/hooks/useConvocazioniSelection";
import ConvocazioniTeamTabs from "@/components/matches/convocazioni/ConvocazioniTeamTabs";
import ConvocazioniToolbar from "@/components/matches/convocazioni/ConvocazioniToolbar";
import ConvocazioniFilters from "@/components/matches/convocazioni/ConvocazioniFilters";
import ConvocazioniTable, {
  CONVOCAZIONI_FIRST_DIR,
  type ConvocazioniSort,
  type ConvocazioniSortColumn,
} from "@/components/matches/convocazioni/ConvocazioniTable";
import ConvocazioniUnavailable from "@/components/matches/convocazioni/ConvocazioniUnavailable";
import ConvocazioniLoanDialog from "@/components/matches/convocazioni/ConvocazioniLoanDialog";
import { readError } from "@/lib/fetchJson";

interface Props {
  matchId: string;
  matchLabel: string;
  /**
   * Partita già iniziata: si registra chi ha giocato. Le disponibilità non
   * contano più, e chi aveva detto "non disponibile" torna selezionabile.
   */
  matchStarted: boolean;
  windowEligibleSessions: number;
  teams: TeamCallupContext[];
  opponentMu?: number | null;
  loanPool?: LoanCandidate[];
}

/** Costruisce una riga candidato per un prestito (statistiche neutre). */
function loanToRow(lc: LoanCandidate): ConvocazioneStatRow {
  return {
    candidate: lc.candidate,
    presences: 0,
    absences: 0,
    eligibleSessions: 0,
    seasonCallups: 0,
    daysSinceLastCallup: null,
    availability: null,
    loanFrom: lc.teamName,
  };
}

export default function ConvocazioniClient({
  matchId,
  matchLabel,
  matchStarted,
  windowEligibleSessions,
  teams,
  opponentMu = null,
  loanPool = [],
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isMulti = teams.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [sort, setSort] = useState<ConvocazioniSort | null>(null);
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  // Prestiti aggiunti manualmente, per squadra (id squadra → righe candidato).
  const [loanRowsByTeam, setLoanRowsByTeam] = useState<Map<string, ConvocazioneStatRow[]>>(
    new Map()
  );

  const activeTeam = teams[activeIndex] ?? teams[0];
  const {
    selectionByTeam,
    isSelected,
    selectedElsewhere,
    toggle,
    selectAll,
    clearAll,
    totalSelectedActive,
    totalSelectedAll,
  } = useConvocazioniSelection(teams, activeTeam, matchStarted);

  // Rosa + prestiti aggiunti per la squadra attiva. Dedup: se un prestito è
  // già stato persistito (presente in activeTeam.stats dopo un refresh), la
  // riga transitoria viene scartata.
  const activeStats = useMemo<ConvocazioneStatRow[]>(() => {
    const base = activeTeam.stats;
    const baseKeys = new Set(base.map((r) => `${r.candidate.kind}-${r.candidate.id}`));
    const loans = (loanRowsByTeam.get(activeTeam.id) ?? []).filter(
      (r) => !baseKeys.has(`${r.candidate.kind}-${r.candidate.id}`)
    );
    return [...base, ...loans];
  }, [activeTeam.stats, activeTeam.id, loanRowsByTeam]);

  // Chiavi già presenti tra i candidati attivi (per filtrare il pool prestiti)
  const activeExcludeKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of activeStats) s.add(`${r.candidate.kind}-${r.candidate.id}`);
    return s;
  }, [activeStats]);

  function handleAddLoan(lc: LoanCandidate) {
    const row = loanToRow(lc);
    const key = `${lc.candidate.kind}-${lc.candidate.id}`;
    setLoanRowsByTeam((prev) => {
      const arr = prev.get(activeTeam.id) ?? [];
      if (arr.some((r) => `${r.candidate.kind}-${r.candidate.id}` === key)) return prev;
      const next = new Map(prev);
      next.set(activeTeam.id, [...arr, row]);
      return next;
    });
    toggle(row); // seleziona subito il prestito
  }

  const filteredAvailable = useMemo(() => {
    return activeStats.filter(
      (s) =>
        (matchStarted || s.availability !== false) &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
  }, [activeStats, roleFilter, matchStarted]);

  const filteredUnavailable = useMemo(() => {
    if (matchStarted) return [];
    return activeStats.filter(
      (s) =>
        s.availability === false &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
  }, [activeStats, roleFilter, matchStarted]);

  const sorted = useMemo(() => {
    const byName = (a: ConvocazioneStatRow, b: ConvocazioneStatRow) =>
      a.candidate.name.localeCompare(b.candidate.name);
    const copy: ConvocazioneStatRow[] = [...filteredAvailable];
    copy.sort((a, b) => {
      // Nessuna colonna scelta: per ruolo, l'ordine di partenza.
      if (!sort) {
        return (a.candidate.sportRole ?? 99) - (b.candidate.sportRole ?? 99) || byName(a, b);
      }
      let cmp = 0;
      switch (sort.col) {
        case "name":
          cmp = byName(a, b);
          break;
        case "presences":
          cmp = a.presences - b.presences;
          break;
        case "absences":
          cmp = a.absences - b.absences;
          break;
        case "seasonCallups":
          cmp = a.seasonCallups - b.seasonCallups;
          break;
        case "lastCallup": {
          // Mai convocato = fermo da sempre. Due "mai" danno NaN, cioè pari.
          const av = a.daysSinceLastCallup ?? Number.POSITIVE_INFINITY;
          const bv = b.daysSinceLastCallup ?? Number.POSITIVE_INFINITY;
          cmp = av - bv;
          break;
        }
      }
      return (sort.dir === "asc" ? cmp : -cmp) || byName(a, b);
    });
    return copy;
  }, [filteredAvailable, sort]);

  // Tre tocchi sulla stessa intestazione: primo verso, verso opposto, di nuovo
  // per ruolo (che non ha una colonna a cui tornare).
  function handleSort(col: ConvocazioniSortColumn) {
    const first = CONVOCAZIONI_FIRST_DIR[col];
    setSort((prev) => {
      if (prev?.col !== col) return { col, dir: first };
      if (prev.dir === first) return { col, dir: first === "asc" ? "desc" : "asc" };
      return null;
    });
  }

  const coverage = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of activeStats) {
      if (!isSelected(s)) continue;
      const r = s.candidate.sportRole;
      if (r == null) continue;
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStats, selectionByTeam, activeIndex]);

  // Candidati selezionati nella squadra attiva — passati all'optimizer
  const selectedCandidates = useMemo<CandidateInput[]>(() => {
    return activeStats.filter((s) => isSelected(s)).map((s) => s.candidate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStats, selectionByTeam, activeIndex]);

  // Errore del salvataggio: sotto la barra con "Salva", finche' non si
  // riprova o si chiude (UX-25).
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      // Una PUT per ogni squadra (anche se è una sola). Per le interne salviamo
      // entrambe in sequenza; se una fallisce, comunichiamo l'errore ma proviamo
      // comunque la successiva.
      const errors: string[] = [];
      for (const team of teams) {
        const sel = selectionByTeam.get(team.id);
        const userIds = sel ? [...sel.userIds] : [];
        const childIds = sel ? [...sel.childIds] : [];
        const res = await fetch(`/api/matches/${matchId}/callups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: team.id,
            userIds,
            childIds,
          }),
        });
        if (!res.ok) {
          const message = await readError(res);
          errors.push(`${team.name}: ${message}`);
        }
      }
      if (errors.length > 0) {
        setSaveError(errors.join("; "));
        return;
      }
      showToast({ message: `Salvati ${totalSelectedAll} convocati`, severity: "success" });
      router.refresh();
    } catch {
      setSaveError("Errore di rete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <PageHeader
        title={matchLabel}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Partite", href: "/admin/partite" },
          { label: "Convocazioni" },
        ]}
        subtitle={
          <>
            {isMulti
              ? "Amichevole interna: convoca i giocatori per ciascuna squadra"
              : `Stagione ${activeTeam.season}`}
            {matchStarted &&
              ". Partita già iniziata: segna chi ha giocato, le disponibilità non servono"}
            {teams.some((t) => t.isMixed) && ". Karibu gioca con tutti i giocatori della stagione"}
            {windowEligibleSessions > 0
              ? `. Presenze contate sugli allenamenti delle ultime 2 settimane (${windowEligibleSessions} ${windowEligibleSessions === 1 ? "allenamento" : "allenamenti"})`
              : ". Nelle ultime 2 settimane non ci sono allenamenti conclusi: le presenze non sono disponibili"}
          </>
        }
      />

      {/* Tab squadra (solo se interno con 2 squadre) */}
      {isMulti && (
        <ConvocazioniTeamTabs
          teams={teams}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          selectionByTeam={selectionByTeam}
        />
      )}

      <ConvocazioniToolbar
        totalSelectedActive={totalSelectedActive}
        isMulti={isMulti}
        activeTeamName={activeTeam.name}
        coverage={coverage}
        saving={saving}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        onSave={handleSave}
      />
      {saveError && (
        <InlineError
          title="Convocazioni non salvate."
          message={saveError}
          onRetry={handleSave}
          onClose={() => setSaveError(null)}
          retrying={saving}
          sx={{ mb: 2 }}
        />
      )}

      <ConvocazioniFilters roleFilter={roleFilter} onRoleFilterChange={setRoleFilter} />

      {loanPool.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            onClick={() => setLoanDialogOpen(true)}
          >
            Aggiungi prestito
          </Button>
        </Box>
      )}

      <ConvocazioniTable
        rows={sorted}
        roleFilter={roleFilter}
        sort={sort}
        onSort={handleSort}
        isSelected={isSelected}
        selectedElsewhere={isMulti ? selectedElsewhere : undefined}
        onToggle={toggle}
      />

      <ConvocazioniUnavailable rows={filteredUnavailable} />

      <ConvocazioniLoanDialog
        open={loanDialogOpen}
        onClose={() => setLoanDialogOpen(false)}
        pool={loanPool}
        excludeKeys={activeExcludeKeys}
        onAdd={handleAddLoan}
      />

      {/* Analisi formazione */}
      <LineupOptimizerSection selectedCandidates={selectedCandidates} opponentMu={opponentMu} />
    </Box>
  );
}

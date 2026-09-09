"use client";

import { useMemo, useState } from "react";
import { Box, Button, Container, Typography, Breadcrumbs, Link as MuiLink } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Link from "next/link";
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
import ConvocazioniFilters, {
  type ConvocazioniSortKey,
} from "@/components/matches/convocazioni/ConvocazioniFilters";
import ConvocazioniTable from "@/components/matches/convocazioni/ConvocazioniTable";
import ConvocazioniUnavailable from "@/components/matches/convocazioni/ConvocazioniUnavailable";
import ConvocazioniLoanDialog from "@/components/matches/convocazioni/ConvocazioniLoanDialog";

interface Props {
  matchId: string;
  matchLabel: string;
  matchDateISO: string;
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
  windowEligibleSessions,
  teams,
  opponentMu = null,
  loanPool = [],
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isMulti = teams.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [sortKey, setSortKey] = useState<ConvocazioniSortKey>("role");
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
    toggle,
    selectAll,
    clearAll,
    totalSelectedActive,
    totalSelectedAll,
  } = useConvocazioniSelection(teams, activeTeam);

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
        s.availability !== false &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
  }, [activeStats, roleFilter]);

  const filteredUnavailable = useMemo(() => {
    return activeStats.filter(
      (s) =>
        s.availability === false &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
  }, [activeStats, roleFilter]);

  const sorted = useMemo(() => {
    const copy: ConvocazioneStatRow[] = [...filteredAvailable];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "presences":
          return b.presences - a.presences || a.candidate.name.localeCompare(b.candidate.name);
        case "lastCallup": {
          const av = a.daysSinceLastCallup ?? Number.POSITIVE_INFINITY;
          const bv = b.daysSinceLastCallup ?? Number.POSITIVE_INFINITY;
          return bv - av || a.candidate.name.localeCompare(b.candidate.name);
        }
        case "seasonCallups":
          return (
            a.seasonCallups - b.seasonCallups || a.candidate.name.localeCompare(b.candidate.name)
          );
        case "name":
          return a.candidate.name.localeCompare(b.candidate.name);
        case "role":
        default:
          return (
            (a.candidate.sportRole ?? 99) - (b.candidate.sportRole ?? 99) ||
            a.candidate.name.localeCompare(b.candidate.name)
          );
      }
    });
    return copy;
  }, [filteredAvailable, sortKey]);

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

  async function handleSave() {
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
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          errors.push(`${team.name}: ${data.error ?? "errore"}`);
        }
      }
      if (errors.length > 0) {
        showToast({
          message: `Errori nel salvataggio: ${errors.join("; ")}`,
          severity: "error",
        });
        return;
      }
      showToast({ message: `Salvati ${totalSelectedAll} convocati`, severity: "success" });
      router.refresh();
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink
          component={Link}
          href="/admin"
          underline="hover"
          color="text.secondary"
          variant="body2"
        >
          Dashboard
        </MuiLink>
        <MuiLink
          component={Link}
          href="/admin/partite"
          underline="hover"
          color="text.secondary"
          variant="body2"
        >
          Partite
        </MuiLink>
        <Typography variant="body2" color="text.primary">
          Convocazioni
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <GroupsIcon color="primary" />
          <Typography
            variant="overline"
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            Convocazioni
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={800}>
          {matchLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isMulti
            ? "Amichevole interna: convoca i giocatori per ciascuna squadra"
            : `Stagione ${activeTeam.season}`}
          {". Presenze calcolate sulle ultime 2 settimane"}
          {windowEligibleSessions > 0
            ? ` (${windowEligibleSessions} ${windowEligibleSessions === 1 ? "allenamento gestito" : "allenamenti gestiti"})`
            : " (nessun allenamento gestito in finestra)"}
        </Typography>
      </Box>

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

      <ConvocazioniFilters
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
      />

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
        isSelected={isSelected}
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
    </Container>
  );
}

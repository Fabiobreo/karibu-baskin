"use client";

import { useMemo, useState } from "react";
import { Box, Container, Typography, Breadcrumbs, Link as MuiLink } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import type { CandidateInput } from "@/lib/callupStats";
import type { TeamCallupContext } from "@/lib/callupContext";
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

interface Props {
  matchId: string;
  matchLabel: string;
  matchDateISO: string;
  windowEligibleSessions: number;
  teams: TeamCallupContext[];
  opponentMu?: number | null;
}

export default function ConvocazioniClient({
  matchId,
  matchLabel,
  windowEligibleSessions,
  teams,
  opponentMu = null,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isMulti = teams.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [sortKey, setSortKey] = useState<ConvocazioniSortKey>("role");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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

  const filteredAvailable = useMemo(() => {
    return activeTeam.stats.filter(
      (s) =>
        s.availability !== false &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
  }, [activeTeam.stats, roleFilter]);

  const filteredUnavailable = useMemo(() => {
    return activeTeam.stats.filter(
      (s) =>
        s.availability === false &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
  }, [activeTeam.stats, roleFilter]);

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
    for (const s of activeTeam.stats) {
      if (!isSelected(s)) continue;
      const r = s.candidate.sportRole;
      if (r == null) continue;
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam.stats, selectionByTeam, activeIndex]);

  // Candidati selezionati nella squadra attiva — passati all'optimizer
  const selectedCandidates = useMemo<CandidateInput[]>(() => {
    return activeTeam.stats.filter((s) => isSelected(s)).map((s) => s.candidate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam.stats, selectionByTeam, activeIndex]);

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
          message: `Errori salvataggio — ${errors.join("; ")}`,
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
            ? "Amichevole interna — convoca i giocatori per ciascuna squadra"
            : `Stagione ${activeTeam.season}`}
          {" — presenze calcolate sulle ultime 2 settimane"}
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

      <ConvocazioniTable
        rows={sorted}
        roleFilter={roleFilter}
        isSelected={isSelected}
        onToggle={toggle}
      />

      <ConvocazioniUnavailable rows={filteredUnavailable} />

      {/* Analisi formazione */}
      <LineupOptimizerSection selectedCandidates={selectedCandidates} opponentMu={opponentMu} />
    </Container>
  );
}

"use client";

import InlineError from "@/components/common/InlineError";
import { useMemo, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
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
import OpponentBriefing, {
  type OpponentPreviousMatch,
} from "@/components/matches/convocazioni/OpponentBriefing";
import OpponentProfileDialog from "@/components/matches/OpponentProfileDialog";
import { roleHints, type RoleHint } from "@/lib/matches/opponentBriefing";
import type {
  OpponentMatchNote,
  OpponentSheet,
  OpponentSheetMatch,
} from "@/lib/matches/opponentSheet";

import { GENERIC_ERROR_IT, errorText } from "@/lib/networkError";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useNotifyCallups } from "@/hooks/useNotifyCallups";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
/** L'avversaria in anagrafica di questa partita, con la sua scheda (solo staff). */
export interface ConvocazioniOpponent {
  id: string;
  name: string;
  sheet: OpponentSheet;
  /** Note delle partite contro di lei: il diario della scheda. */
  matchNotes: OpponentMatchNote[];
  /** L'ultima partita giocata contro di lei, esclusa questa. */
  previous: OpponentPreviousMatch | null;
  /** Questa partita, per scriverne la nota una volta iniziata. */
  match: Omit<OpponentSheetMatch, "note">;
}

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
  /** Assente nelle amichevoli interne e contro un'avversaria fuori anagrafica. */
  opponent?: ConvocazioniOpponent | null;
  loanPool?: LoanCandidate[];
  /** Convocati già salvati: a loro va "Avvisa i convocati". */
  savedCallupCount?: number;
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
    availabilityByStaff: false,
    loanFrom: lc.teamName,
  };
}

export default function ConvocazioniClient({
  matchId,
  matchLabel,
  matchStarted,
  windowEligibleSessions,
  teams,
  opponent = null,
  loanPool = [],
  savedCallupCount = 0,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isMulti = teams.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [sort, setSort] = useState<ConvocazioniSort | null>(null);
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  // La scheda dell'avversaria si può compilare da qui: lo stato segue il salvataggio.
  const [sheet, setSheet] = useState<OpponentSheet | null>(opponent?.sheet ?? null);
  const [matchNotes, setMatchNotes] = useState<OpponentMatchNote[]>(opponent?.matchNotes ?? []);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  // Ruolo che un suggerimento ha chiesto di vedere in ordine di livello stimato.
  const [levelOrderRole, setLevelOrderRole] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const opponentMu = sheet?.ratingMu ?? null;
  // Prestiti aggiunti manualmente, per squadra (id squadra → righe candidato).
  const [loanRowsByTeam, setLoanRowsByTeam] = useState<Map<string, ConvocazioneStatRow[]>>(
    new Map()
  );

  // Disponibilità segnate dallo staff in questa pagina, finché il refresh non
  // le porta dal server (chiave "kind-id").
  const [staffAnswers, setStaffAnswers] = useState<Map<string, boolean>>(new Map());
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const notify = useNotifyCallups(matchId, savedCallupCount);
  const canNotify = !matchStarted && savedCallupCount > 0;

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
    return [...base, ...loans].map((r) => {
      const answer = staffAnswers.get(`${r.candidate.kind}-${r.candidate.id}`);
      return answer === undefined ? r : { ...r, availability: answer, availabilityByStaff: true };
    });
  }, [activeTeam.stats, activeTeam.id, loanRowsByTeam, staffAnswers]);

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

  // In elenco: chi ha detto di sì, chi non ha risposto, e chi era già
  // convocato prima di dire di no (va visto, per toglierlo). Gli altri "no"
  // stanno sotto, in "Non disponibili".
  const filteredAvailable = useMemo(() => {
    return activeStats.filter(
      (s) =>
        (matchStarted || s.availability !== false || isSelected(s)) &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStats, roleFilter, matchStarted, selectionByTeam, activeIndex]);

  const filteredUnavailable = useMemo(() => {
    if (matchStarted) return [];
    return activeStats.filter(
      (s) =>
        s.availability === false &&
        !isSelected(s) &&
        (roleFilter === null ? true : s.candidate.sportRole === roleFilter)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStats, roleFilter, matchStarted, selectionByTeam, activeIndex]);

  // "Segna disponibile": lo staff risponde al posto del giocatore, poi lo
  // convoca. La famiglia riceve un avviso e può correggere.
  async function markAvailable(row: ConvocazioneStatRow) {
    const key = `${row.candidate.kind}-${row.candidate.id}`;
    try {
      const res = await fetch(`/api/matches/${matchId}/availability/staff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: row.candidate.kind, id: row.candidate.id, available: true }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setStaffAnswers((prev) => new Map(prev).set(key, true));
      if (!isSelected(row) && selectedElsewhere(row) === null) toggle(row);
      showToast({
        message: `Disponibilità di ${row.candidate.name} segnata. Salva per confermare le convocazioni`,
        severity: "success",
      });
      router.refresh();
    } catch (err) {
      showToast({ message: errorText(err, GENERIC_ERROR_IT), severity: "error" });
    }
  }

  function confirmMarkAvailable(row: ConvocazioneStatRow) {
    openConfirm(
      `${row.candidate.name} ha detto che non c'è`,
      "Ti ha detto che invece ci sarà? Segno la sua disponibilità e il nome passa fra i selezionati. La famiglia riceve un avviso e può correggere la risposta.",
      () => void markAvailable(row),
      { confirmLabel: "Segna disponibile", confirmColor: "primary" }
    );
  }

  const sorted = useMemo(() => {
    const byName = (a: ConvocazioneStatRow, b: ConvocazioneStatRow) =>
      a.candidate.name.localeCompare(b.candidate.name);
    const copy: ConvocazioneStatRow[] = [...filteredAvailable];
    copy.sort((a, b) => {
      // Nessuna colonna scelta: per ruolo, l'ordine di partenza. Arrivando da
      // un suggerimento sul livello, il ruolo scelto va dal livello stimato più
      // alto (chi non è ancora valutato in fondo).
      if (!sort) {
        if (levelOrderRole !== null && roleFilter === levelOrderRole) {
          return (
            (b.candidate.ratingMu ?? Number.NEGATIVE_INFINITY) -
              (a.candidate.ratingMu ?? Number.NEGATIVE_INFINITY) || byName(a, b)
          );
        }
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
  }, [filteredAvailable, sort, levelOrderRole, roleFilter]);

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

  // Suggerimenti per ruolo dalla scheda dell'avversaria: solo prima di giocare,
  // quando c'è ancora da scegliere chi convocare.
  const hints = useMemo<RoleHint[]>(() => {
    if (!sheet || matchStarted) return [];
    return roleHints(
      sheet.scoutingProfile,
      // Un prestito non convocato resta fuori: le sue convocazioni contate qui
      // non sono quelle vere, e la disponibilità non gli è stata chiesta.
      activeStats
        .filter((s) => !s.loanFrom || isSelected(s))
        .map((s) => ({
          sportRole: s.candidate.sportRole,
          ratingMu: s.candidate.ratingMu,
          seasonCallups: s.seasonCallups,
          availability: s.availability,
          selected: isSelected(s),
        }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, matchStarted, activeStats, selectionByTeam, activeIndex]);

  // Un suggerimento porta all'elenco di quel ruolo: per livello stimato se
  // l'avversaria è forte, da chi ha giocato meno se è debole.
  function handleHint(hint: RoleHint) {
    setRoleFilter(hint.role);
    if (hint.kind === "rotation") {
      setSort({ col: "seasonCallups", dir: "asc" });
      setLevelOrderRole(null);
    } else {
      setSort(null);
      setLevelOrderRole(hint.role);
    }
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
      showToast({
        message: matchStarted
          ? `Salvati ${totalSelectedAll} convocati`
          : `Salvati ${totalSelectedAll} convocati. Chi entra o esce dalla lista riceve un avviso`,
        severity: "success",
      });
      router.refresh();
    } catch (err) {
      setSaveError(errorText(err, GENERIC_ERROR_IT));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <PageHeader
        title={matchLabel}
        action={
          canNotify ? (
            <Button
              variant="outlined"
              onClick={notify.requestNotify}
              disabled={notify.isPending}
              startIcon={<NotificationsActiveOutlinedIcon />}
            >
              Avvisa i convocati
            </Button>
          ) : undefined
        }
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

      {opponent && sheet && (
        <OpponentBriefing
          opponentName={opponent.name}
          sheet={sheet}
          hints={hints}
          onHint={handleHint}
          onEdit={() => setSheetDialogOpen(true)}
          latestNote={
            [...matchNotes].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0]
          }
          previous={opponent.previous}
        />
      )}

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

      <Box ref={listRef} sx={{ scrollMarginTop: 16 }}>
        <ConvocazioniFilters
          roleFilter={roleFilter}
          onRoleFilterChange={(role) => {
            setRoleFilter(role);
            setLevelOrderRole(null);
          }}
        />
        {!sort && levelOrderRole !== null && roleFilter === levelOrderRole && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Ruolo {levelOrderRole} in ordine di livello stimato, dal più alto. Chi non è ancora
            valutato è in fondo.
          </Typography>
        )}
      </Box>

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
        showNoAnswer={!matchStarted}
      />

      <ConvocazioniUnavailable rows={filteredUnavailable} onPick={confirmMarkAvailable} />
      {ConfirmDialog}
      {notify.ConfirmDialog}

      <ConvocazioniLoanDialog
        open={loanDialogOpen}
        onClose={() => setLoanDialogOpen(false)}
        pool={loanPool}
        excludeKeys={activeExcludeKeys}
        onAdd={handleAddLoan}
      />

      {opponent && sheet && sheetDialogOpen && (
        <OpponentProfileDialog
          open
          onClose={() => setSheetDialogOpen(false)}
          opponentId={opponent.id}
          opponentName={opponent.name}
          sheet={sheet}
          onSaved={(saved) => {
            setSheet(saved);
            // La difficoltà stimata in cima la calcola il server.
            router.refresh();
          }}
          // Prima di giocare c'è solo la scheda: la nota è di una partita iniziata.
          match={
            matchStarted
              ? {
                  ...opponent.match,
                  note: matchNotes.find((n) => n.matchId === matchId)?.note ?? null,
                }
              : null
          }
          matchNotes={matchNotes}
          onMatchNoteSaved={(id, note) =>
            setMatchNotes((prev) => [
              ...prev.filter((n) => n.matchId !== id),
              ...(note ? [{ ...opponent.match, note }] : []),
            ])
          }
        />
      )}

      {/* Analisi formazione */}
      <LineupOptimizerSection selectedCandidates={selectedCandidates} opponentMu={opponentMu} />
    </Box>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import PageHeader from "@/components/common/PageHeader";
import MatchResultDialog, {
  type MatchResultSavedFields,
} from "@/components/matches/MatchResultDialog";
import GroupCsvImportDialog from "@/components/admin/GroupCsvImportDialog";
import GroupSheetImportDialog from "@/components/admin/GroupSheetImportDialog";
import GironeCalendar from "@/components/admin/girone/GironeCalendar";
import GironeStandingsTable from "@/components/admin/girone/GironeStandingsTable";
import GironeTeamsCard from "@/components/admin/girone/GironeTeamsCard";
import GroupMatchDialog from "@/components/admin/girone/GroupMatchDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { computeStandings } from "@/lib/season/standings";
import {
  buildCalendar,
  type GironeOpponent,
  type GironeOtherMatch,
  type GironeOurMatch,
  type GironeTeam,
} from "@/lib/groups/gironeCalendar";

interface AdminGironeWorkspaceClientProps {
  isAdmin: boolean;
  group: {
    id: string;
    name: string;
    season: string;
    championship: string | null;
    ourTeams: GironeTeam[];
  };
  ourMatches: GironeOurMatch[];
  groupMatches: GironeOtherMatch[];
  explicitTeams: GironeOpponent[];
  allOpponents: GironeOpponent[];
  ourTeamsCatalog: GironeTeam[];
}

/**
 * Pagina di un girone: classifica, un solo calendario con tutte le partite
 * (le nostre, che si gestiscono in Partite, e quelle fra avversarie), le
 * squadre e l'import dal foglio EISI.
 */
export default function AdminGironeWorkspaceClient({
  isAdmin,
  group,
  ourMatches: initialOurs,
  groupMatches: initialOthers,
  explicitTeams: initialExplicit,
  allOpponents: initialOpponents,
  ourTeamsCatalog,
}: AdminGironeWorkspaceClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [ourTeams, setOurTeams] = useState(group.ourTeams);
  const [ours, setOurs] = useState(initialOurs);
  const [others, setOthers] = useState(initialOthers);
  const [explicit, setExplicit] = useState(initialExplicit);
  const [opponents, setOpponents] = useState(initialOpponents);
  const [resultMatch, setResultMatch] = useState<GironeOurMatch | null>(null);
  const [otherDialog, setOtherDialog] = useState<{ match: GironeOtherMatch | null } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  // Dopo un import la pagina si ricarica dal server (router.refresh): le
  // props nuove sostituiscono lo stato locale (props cambiate = dati nuovi).
  const [source, setSource] = useState(initialOurs);
  if (source !== initialOurs) {
    setSource(initialOurs);
    setOurs(initialOurs);
    setOthers(initialOthers);
    setExplicit(initialExplicit);
    setOpponents(initialOpponents);
    setOurTeams(group.ourTeams);
  }

  const ourTeamById = useMemo(() => new Map(ourTeams.map((t) => [t.id, t] as const)), [ourTeams]);
  const days = useMemo(() => buildCalendar(ours, others), [ours, others]);
  const standings = useMemo(
    () => computeStandings(ourTeams, ours, others),
    [ourTeams, ours, others]
  );

  const opponentsInUse = useMemo(() => {
    const ids = new Set<string>();
    for (const m of others) ids.add(m.homeTeamId).add(m.awayTeamId);
    for (const m of ours) if (m.opponent) ids.add(m.opponent.id);
    return ids;
  }, [ours, others]);
  const teamsInGroup = useMemo(() => {
    const ids = new Set([...opponentsInUse, ...explicit.map((t) => t.id)]);
    return opponents.filter((o) => ids.has(o.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [opponents, opponentsInUse, explicit]);
  const ourTeamsInUse = useMemo(() => new Set(ours.map((m) => m.teamId)), [ours]);

  function handleResultSaved(matchId: string, fields: MatchResultSavedFields) {
    setOurs((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...fields } : m)));
    setResultMatch(null);
    showToast({ message: "Risultato salvato", severity: "success" });
  }

  function handleOtherSaved(saved: GironeOtherMatch, isEdit: boolean) {
    setOthers((prev) =>
      isEdit ? prev.map((m) => (m.id === saved.id ? saved : m)) : [...prev, saved]
    );
    setOtherDialog(null);
    showToast({
      message: isEdit ? "Risultato aggiornato" : "Risultato aggiunto",
      severity: "success",
    });
  }

  async function handleDeleteOther(m: GironeOtherMatch): Promise<boolean> {
    const res = await fetch(`/api/groups/${group.id}/matches/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast({ message: await readError(res), severity: "error" });
      return false;
    }
    setOthers((prev) => prev.filter((x) => x.id !== m.id));
    showToast({ message: "Partita eliminata", severity: "success" });
    return true;
  }

  const resultOurName = resultMatch ? (ourTeamById.get(resultMatch.teamId)?.name ?? "Noi") : "";
  const resultOpp = resultMatch?.opponent?.name ?? "Avversaria";

  return (
    <Box>
      <PageHeader
        title={group.name}
        subtitle={`Stagione ${group.season}${group.championship ? ` · ${group.championship}` : ""}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Gironi", href: "/admin/gironi" },
          { label: group.name },
        ]}
        action={
          isAdmin ? (
            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={() => setSheetOpen(true)}
            >
              Importa dal foglio EISI
            </Button>
          ) : undefined
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 380px" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Box component="section" aria-labelledby="calendario-girone">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              mb: 1.5,
            }}
          >
            <Typography id="calendario-girone" variant="h6" component="h2">
              Calendario e risultati
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setCsvOpen(true)}>
                Incolla CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setOtherDialog({ match: null })}
              >
                Risultato altre squadre
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Le nostre partite (con la tinta della squadra) si gestiscono in Partite: da qui si apre
            quello che manca. Una nostra partita nuova si aggiunge in Partite scegliendo questo
            girone.
          </Typography>
          <GironeCalendar
            days={days}
            ourTeamById={ourTeamById}
            isAdmin={isAdmin}
            onResult={setResultMatch}
            onEditOther={(m) => setOtherDialog({ match: m })}
            onDeleteOther={handleDeleteOther}
          />
        </Box>

        <Stack spacing={3}>
          <GironeStandingsTable standings={standings} />
          <GironeTeamsCard
            groupId={group.id}
            ourTeams={ourTeams}
            ourTeamsInUse={ourTeamsInUse}
            ourTeamsCatalog={ourTeamsCatalog}
            teamsInGroup={teamsInGroup}
            opponentsInUse={opponentsInUse}
            allOpponents={opponents}
            onOurTeamsChange={setOurTeams}
            onOpponentAdded={(team, created) => {
              if (created) {
                setOpponents((prev) =>
                  [...prev, team].sort((a, b) => a.name.localeCompare(b.name))
                );
              }
              setExplicit((prev) => (prev.some((t) => t.id === team.id) ? prev : [...prev, team]));
            }}
            onOpponentRemoved={(id) => setExplicit((prev) => prev.filter((t) => t.id !== id))}
          />
        </Stack>
      </Box>

      {resultMatch && (
        <MatchResultDialog
          open
          onClose={() => setResultMatch(null)}
          matchId={resultMatch.id}
          matchLabel={`${resultOurName} vs ${resultOpp} del ${format(new Date(resultMatch.date), "d MMM yyyy", { locale: it })}`}
          ourTeamName={resultOurName}
          theirTeamName={resultOpp}
          initialOurScore={resultMatch.ourScore}
          initialTheirScore={resultMatch.theirScore}
          initialResult={resultMatch.result}
          onSaved={handleResultSaved}
        />
      )}

      {otherDialog && (
        <GroupMatchDialog
          key={otherDialog.match?.id ?? "new"}
          open
          groupId={group.id}
          match={otherDialog?.match ?? null}
          teams={teamsInGroup}
          onClose={() => setOtherDialog(null)}
          onSaved={handleOtherSaved}
        />
      )}

      {isAdmin && (
        <GroupSheetImportDialog
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          groupId={group.id}
          groupName={group.name}
          onImported={(message) => {
            setSheetOpen(false);
            showToast({ message, severity: "success" });
            router.refresh();
          }}
        />
      )}

      <GroupCsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        groupId={group.id}
        groupName={group.name}
        opponents={opponents}
        onImported={() => {
          setCsvOpen(false);
          router.refresh();
        }}
      />
    </Box>
  );
}

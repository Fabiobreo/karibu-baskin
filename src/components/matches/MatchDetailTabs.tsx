"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import GroupsIcon from "@mui/icons-material/Groups";
import type { MatchStatRow } from "@/components/matches/MatchStatsTable";
import type { StandingEntry } from "@/lib/season/standings";
import type {
  CallupEntry,
  CallupWithStat,
  PrevMatchPreview,
} from "@/components/matches/matchDetailTypes";
import MatchCallupsTab from "@/components/matches/tabs/MatchCallupsTab";
import MatchStatsTab from "@/components/matches/tabs/MatchStatsTab";
import CallupsActions from "@/components/matches/CallupsActions";
import type { CallupsShareInfo } from "@/components/matches/CallupsShareCard";
import type { CallupViewer } from "@/components/matches/sections/CallupsListSection";
import { TYPE_SCALE } from "@/lib/typeScale";
import { Button } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import MatchSectionTitle from "@/components/matches/sections/MatchSectionTitle";
import TopScorersSection from "@/components/matches/sections/TopScorersSection";
import CallupsListSection from "@/components/matches/sections/CallupsListSection";
import HeadToHeadSection from "@/components/matches/sections/HeadToHeadSection";
import StandingsSection from "@/components/matches/sections/StandingsSection";

interface Props {
  notes: string | null;
  stats: MatchStatRow[];
  callups: CallupEntry[];
  canSeeCallups: boolean;
  hasScore: boolean;
  prevMatches: PrevMatchPreview[];
  groupStandings: StandingEntry[] | null;
  ourTeamId: string;
  /** Colore salvato della nostra squadra: pallino accanto al nome in classifica. */
  ourTeamColor?: string | null;
  /**
   * Colore della squadra di convocati e marcatori, per la tinta degli avatar.
   * Null nelle amichevoli interne: i giocatori stanno su due squadre nostre.
   */
  playersTeamColor?: string | null;
  groupName: string | null;
  opponentName: string;
  matchId: string;
  isStaff: boolean;
  /** Testata dell'immagine dei convocati da condividere (solo staff). */
  shareInfo?: CallupsShareInfo;
  /** "Avvisa i convocati" possibile: partita non iniziata, almeno un convocato. */
  canNotifyCallups?: boolean;
  viewer?: CallupViewer;
}

/** Orchestratore dei tab della pagina partita: Convocati e Statistiche. */
export default function MatchDetailTabs({
  stats,
  callups,
  canSeeCallups,
  hasScore,
  prevMatches,
  groupStandings,
  ourTeamColor = null,
  playersTeamColor = null,
  groupName,
  opponentName,
  matchId,
  isStaff,
  shareInfo,
  canNotifyCallups = false,
  viewer,
}: Props) {
  const t = useTranslations("matches");
  const hasStats = stats.length > 0;
  // Partita non giocata: niente tab "Statistiche", per nessuno (UX-50).
  const showStatsTab = hasScore || hasStats;
  // Chi non vede i convocati non deve atterrare su un lucchetto: se ci sono
  // statistiche, la pagina parte da quelle (UX-06).
  const [tab, setTab] = useState(!canSeeCallups && hasStats ? 1 : 0);

  // Merge callups + stats per partite già giocate. A statistiche inserite, un
  // convocato senza riga salvata ha giocato senza punti né falli: vale una riga
  // a zero, nei convocati e nella tab Statistiche (non "nessun dato"). Solo per
  // chi vede i convocati: agli altri non si aggiungono nomi.
  const statOf = (c: CallupEntry) =>
    stats.find(
      (s) => (c.userId && s.user?.id === c.userId) || (c.childId && s.child?.id === c.childId)
    ) ?? null;
  const zeroRows: MatchStatRow[] =
    hasStats && canSeeCallups
      ? callups
          .filter((c) => (c.user || c.child) && !statOf(c))
          .map((c) => ({
            id: `zero-${c.id}`,
            points: 0,
            twoPointers: 0,
            threePointers: 0,
            freeThrows: 0,
            fouls: 0,
            illegalFouls: 0,
            shotsAttempted: 0,
            user: c.user,
            child: c.child,
          }))
      : [];
  const allStats = [...stats, ...zeroRows];
  const callupsWithStats: CallupWithStat[] = callups.map((c) => ({
    ...c,
    stat: statOf(c) ?? zeroRows.find((z) => z.id === `zero-${c.id}`) ?? null,
  }));

  const callupsLabel = `${t("tabCallups")}${canSeeCallups && callups.length > 0 ? ` (${callups.length})` : ""}`;
  const actions =
    isStaff && shareInfo ? (
      <CallupsActions
        matchId={matchId}
        callups={callups}
        shareInfo={shareInfo}
        canNotify={canNotifyCallups}
      />
    ) : null;
  const callupsContent = (headingComponent?: "h3") => (
    <MatchCallupsTab
      callups={callupsWithStats}
      canSeeCallups={canSeeCallups}
      hasScore={hasScore}
      stats={stats}
      prevMatches={prevMatches}
      groupStandings={groupStandings}
      ourTeamColor={ourTeamColor}
      playersTeamColor={playersTeamColor}
      groupName={groupName}
      opponentName={opponentName}
      actions={headingComponent ? undefined : actions}
      viewer={viewer}
      headingComponent={headingComponent}
    />
  );

  // Una scheda sola (partita non giocata): niente tablist con una tab, che al
  // lettore di schermo annuncia "scheda 1 di 1" e a vista è un'intestazione
  // finta. Solo il contenuto, sotto un titolo vero.
  if (!showStatsTab) {
    return (
      <Box component="section" aria-labelledby="match-callups-title">
        {/* Titolo e azioni dello staff sulla stessa riga. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            id="match-callups-title"
            component="h2"
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <GroupsIcon sx={{ fontSize: 20, color: "primary.main" }} aria-hidden="true" />
            {callupsLabel}
          </Typography>
          {actions}
        </Box>
        {callupsContent("h3")}
      </Box>
    );
  }

  // Partita giocata (UX-58): niente schede, le sezioni una sotto l'altra
  // nell'ordine in cui le cerca chi apre la pagina. Statistiche, poi convocati,
  // poi precedenti e classifica. "Per te", MVP e foto stanno sopra (pagina),
  // "E adesso" sotto.
  if (hasScore) {
    const hasContext =
      prevMatches.length > 0 || (groupStandings !== null && groupStandings.length > 0);
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 4, md: 5 } }}>
        <Box component="section" aria-labelledby="match-stats-title">
          <MatchSectionTitle
            id="match-stats-title"
            icon={<LeaderboardIcon />}
            action={
              isStaff ? (
                <Button
                  href={`/admin/partite/${matchId}/statistiche`}
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                >
                  {hasStats ? t("editStats") : t("addStats")}
                </Button>
              ) : undefined
            }
          >
            {`${t("tabStats")}${hasStats ? ` (${allStats.length})` : ""}`}
          </MatchSectionTitle>
          <TopScorersSection top3={stats.slice(0, 3)} teamColor={playersTeamColor} />
          <MatchStatsTab
            stats={allStats}
            matchId={matchId}
            isStaff={isStaff}
            teamColor={playersTeamColor}
            embedded
          />
        </Box>

        <Box component="section" aria-labelledby="match-callups-title">
          <MatchSectionTitle id="match-callups-title" icon={<GroupsIcon />} action={actions}>
            {callupsLabel}
          </MatchSectionTitle>
          <CallupsListSection
            callups={callupsWithStats}
            canSeeCallups={canSeeCallups}
            hasScore={hasScore}
            teamColor={playersTeamColor}
            viewer={viewer}
          />
        </Box>

        {hasContext && (
          <Box>
            <HeadToHeadSection
              prevMatches={prevMatches}
              opponentName={opponentName}
              headingComponent="h2"
            />
            {groupStandings && (
              <StandingsSection
                standings={groupStandings}
                groupName={groupName}
                ourTeamColor={ourTeamColor}
                headingComponent="h2"
              />
            )}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <>
      {/* Tab bar */}
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: { xs: 1, md: 0 } }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<GroupsIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={callupsLabel}
            sx={{ minHeight: 48, fontSize: TYPE_SCALE.sm }}
          />
          <Tab
            icon={<LeaderboardIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`${t("tabStats")}${hasStats ? ` (${allStats.length})` : ""}`}
            sx={{ minHeight: 48, fontSize: TYPE_SCALE.sm }}
          />
        </Tabs>
      </Box>

      {tab === 0 && callupsContent()}

      {tab === 1 && (
        <MatchStatsTab
          stats={allStats}
          matchId={matchId}
          isStaff={isStaff}
          teamColor={playersTeamColor}
        />
      )}
    </>
  );
}

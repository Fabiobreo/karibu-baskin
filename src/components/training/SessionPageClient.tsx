"use client";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Container, Typography, Box, Paper, Skeleton, Alert, Grid2 as Grid } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import RegistrationForm, {
  type CurrentUser,
  type ChildInfo,
} from "@/components/training/RegistrationForm";
import RosterByRole from "@/components/training/RosterByRole";
import TeamDisplay, { type TeamsData } from "@/components/training/TeamDisplay";
import AllenamentoHero from "@/components/training/AllenamentoHero";
import AllenamentoEndedView from "@/components/training/AllenamentoEndedView";
import OpenRegistrationsAlert from "@/components/training/OpenRegistrationsAlert";
import CloseRegistrationsAlert from "@/components/training/CloseRegistrationsAlert";
import TeamsHeader from "@/components/training/TeamsHeader";
import SectionErrorBoundary from "@/components/common/SectionErrorBoundary";
import { TEAM_META } from "@/lib/constants";
import { sessionEndDate } from "@/lib/dateUtils";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import { useToast } from "@/context/ToastContext";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";

export interface Session {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  dateSlug: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
  restrictTeam: { id: string; name: string; color: string | null } | null;
  registrationOpen: boolean;
  registrationOpenedAt: string | null;
  _count: { registrations: number };
}

interface Registration {
  id: string;
  name: string;
  role: number;
  note: string | null;
  createdAt: string;
  sessionId: string;
  userId: string | null;
  childId: string | null;
  registeredAsCoach: boolean;
  userSlug: string | null;
  attended: boolean | null;
}

interface SessionPageClientProps {
  /** Dati dell'allenamento gia letti lato server: evitano lo skeleton sul titolo. */
  initialSession: Session | null;
}

export default function SessionPageClient({ initialSession }: SessionPageClientProps) {
  const t = useTranslations("trainings");
  const { teamColorLabel } = useEntityLabels();
  const { session: sessionParam } = useParams<{ session: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null | undefined>(undefined);
  const [parentChildren, setParentChildren] = useState<ChildInfo[]>([]);

  const fetcher = useCallback(
    (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())),
    []
  );

  const {
    data: session,
    isLoading: loading,
    refetch: refetchSession,
  } = useQuery<Session>({
    queryKey: ["session", sessionParam],
    queryFn: () => fetcher(`/api/sessions/${encodeURIComponent(sessionParam)}`),
    initialData: initialSession ?? undefined,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const realSessionId = session?.id ?? "";

  // Derive isEnded and isToday early so dynamic refresh intervals can use them
  const sessionDate = session ? new Date(session.date) : null;
  const sessionEnd = session?.endTime ? new Date(session.endTime) : null;
  const isEnded = sessionDate ? new Date() > sessionEndDate(sessionDate, sessionEnd) : false;
  const isToday = sessionDate ? sessionDate.toDateString() === new Date().toDateString() : false;

  // 30s when live today, 0 when ended (no changes expected), 2min for future sessions
  const refreshInterval = !session ? 60_000 : isEnded ? 0 : isToday ? 30_000 : 120_000;

  const queryClient = useQueryClient();
  const regQueryKey = ["registrations", realSessionId] as const;

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: regQueryKey,
    queryFn: () =>
      fetch(`/api/registrations?sessionId=${realSessionId}`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("fetch failed"))
      ),
    enabled: !!realSessionId,
    refetchOnWindowFocus: true,
    refetchInterval: refreshInterval === 0 ? false : refreshInterval,
    staleTime: isEnded ? Infinity : 0,
  });

  function invalidateRegistrations() {
    void queryClient.invalidateQueries({ queryKey: regQueryKey });
  }

  const teamsQueryKey = ["teams", realSessionId] as const;
  const {
    data: teamsRaw,
    isLoading: teamsLoading,
    refetch: refetchTeams,
  } = useQuery<TeamsData>({
    queryKey: teamsQueryKey,
    queryFn: () => fetcher(`/api/teams/${realSessionId}`),
    enabled: !!realSessionId,
    refetchOnWindowFocus: true,
    refetchInterval: refreshInterval === 0 ? false : refreshInterval,
  });
  const teams: TeamsData | null = teamsRaw?.generated ? teamsRaw : null;

  function refreshSecondary() {
    invalidateRegistrations();
    void refetchTeams();
  }

  function handleOptimisticAdd(
    reg: import("@/components/training/RegistrationForm").OptimisticReg
  ) {
    const tempReg: Registration = {
      id: `temp-${Date.now()}`,
      note: null,
      createdAt: new Date().toISOString(),
      userSlug: null,
      attended: null,
      ...reg,
    };
    queryClient.setQueryData<Registration[]>(regQueryKey, (prev) => [...(prev ?? []), tempReg]);
  }

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CurrentUser | null) => {
        setCurrentUser(data);
        if (data?.appRole === "PARENT") {
          fetch("/api/users/me/children")
            .then((r) => (r.ok ? r.json() : []))
            .then((kids: ChildInfo[]) => setParentChildren(kids))
            .catch(() => {});
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  const sessionId = realSessionId || sessionParam;

  // ── Countdown live ──────────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    const dateStr = session?.date ?? null;
    const endStr = session?.endTime ?? null;

    if (!dateStr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(null);
      return;
    }

    const sd = new Date(dateStr);
    const se = sessionEndDate(sd, endStr ? new Date(endStr) : null);

    function update() {
      const now = new Date();
      if (now < sd) {
        const todayCheck = sd.toDateString() === now.toDateString();
        if (!todayCheck) {
          setCountdown(null);
          return;
        }
        const diff = sd.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(
          diff < 2 * 60 * 1000
            ? t("countdownStartsSoon")
            : h > 0
              ? t("countdownStartsHours", { h, m })
              : t("countdownStartsMinutes", { m })
        );
      } else if (now <= se) {
        const diff = se.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(
          diff < 60 * 1000
            ? t("countdownEndsSoon")
            : h > 0
              ? t("countdownEndsHours", { h, m })
              : t("countdownEndsMinutes", { m })
        );
      } else {
        setCountdown(null);
      }
    }

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [session?.date, session?.endTime, t]);

  // Stessa gerarchia usata da checkRegistrationAllowed lato server.
  // `appRole` arriva da /api/users/me tipizzato come string, da qui il cast.
  const isStaff = !!currentUser && hasRole(currentUser.appRole as AppRole, "COACH");

  const [removingTeams, setRemovingTeams] = useState(false);
  const [editingTeams, setEditingTeams] = useState(false);

  async function handleRemoveTeams() {
    if (!realSessionId) return;
    setRemovingTeams(true);
    try {
      const res = await fetch(`/api/teams/${realSessionId}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.setQueryData(teamsQueryKey, undefined);
        setEditingTeams(false);
        showToast({ message: "Squadre rimosse", severity: "success" });
      } else {
        showToast({ message: "Errore nella rimozione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setRemovingTeams(false);
    }
  }

  function handleSessionSaved(newDateSlug: string) {
    if (newDateSlug !== sessionParam) {
      router.replace(`/allenamento/${newDateSlug}`);
    } else {
      void refetchSession();
    }
  }

  const slugMap = Object.fromEntries(
    registrations.filter((r) => r.userSlug).map((r) => [r.id, r.userSlug!])
  );

  const myRegistration = currentUser
    ? registrations.find(
        (r) =>
          r.userId === currentUser.id ||
          (currentUser.linkedChildId && r.childId === currentUser.linkedChildId)
      )
    : null;
  const myTeam =
    myRegistration && teams
      ? (TEAM_META.find((t) => {
          const list = t.key === "teamC" ? teams.teamC : teams[t.key];
          return list?.some((a) => a.id === myRegistration.id);
        }) ?? null)
      : null;
  const hasUnregisteredChildren =
    currentUser?.appRole === "PARENT" &&
    parentChildren.some(
      (c) =>
        !registrations.some((r) => r.childId === c.id || (c.userId ? r.userId === c.userId : false))
    );
  const teamFirstLayout = !!myTeam && !hasUnregisteredChildren;

  const TEAM_KEYS = ["teamA", "teamB", "teamC"] as const;
  const myTeamIndex = myTeam
    ? Math.max(0, TEAM_KEYS.indexOf(myTeam.key as (typeof TEAM_KEYS)[number]))
    : 0;

  const rosterProps = {
    registrations,
    currentUserId: currentUser?.id ?? null,
    linkedChildId: currentUser?.linkedChildId ?? null,
    parentChildIds: parentChildren.map((c) => c.id),
    childUserIds: parentChildren.map((c) => c.userId).filter((id): id is string => !!id),
    isStaff,
    isEnded,
    onUnregistered: refreshSecondary,
    onAttendanceChanged: invalidateRegistrations,
  };

  const teamDisplayProps = {
    sessionId,
    isStaff,
    registrationIds: registrations.filter((r) => !r.registeredAsCoach).map((r) => r.id),
    coaches: registrations
      .filter((r) => r.registeredAsCoach)
      .map((r) => ({ id: r.id, name: r.name })),
    slugMap,
    currentUserTeamIndex: myTeamIndex,
    editMode: editingTeams,
    onExitEditMode: () => setEditingTeams(false),
    teams,
    teamsLoading,
    onTeamsGenerated: (newTeams: TeamsData) => queryClient.setQueryData(teamsQueryKey, newTeams),
  };

  return (
    <>
      {/* ── Hero ── */}
      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 0 }} />
      ) : session && sessionDate ? (
        <AllenamentoHero
          session={session}
          sessionDate={sessionDate}
          sessionEnd={sessionEnd}
          isStaff={isStaff}
          countdown={countdown}
          onSessionSaved={handleSessionSaved}
        />
      ) : null}

      {/* ── Contenuto principale ── */}
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Box>
        ) : session ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Banner "la tua squadra" */}
            {myTeam && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 2,
                  background: `linear-gradient(120deg, ${myTeam.color} 0%, ${myTeam.color}cc 100%)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <GroupsIcon sx={{ fontSize: 36, opacity: 0.85, flexShrink: 0 }} />
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.8,
                      fontWeight: 600,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("myTeam")}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                    {teamColorLabel(myTeam.key as "teamA" | "teamB" | "teamC")}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* ── Stato: terminato ── */}
            {isEnded ? (
              <SectionErrorBoundary label="Vista allenamento">
                <AllenamentoEndedView
                  teams={teams}
                  sessionId={realSessionId}
                  sessionTitle={session?.title}
                  sessionDate={session?.date}
                  sessionEndTime={session?.endTime}
                  isStaff={isStaff}
                  rosterProps={rosterProps}
                  teamDisplayProps={teamDisplayProps}
                  removingTeams={removingTeams}
                  onRemoveTeams={handleRemoveTeams}
                />
              </SectionErrorBoundary>
            ) : teamFirstLayout ? (
              /* ── Stato: iscritto + squadre create ── */
              <>
                <SectionErrorBoundary label="Squadre">
                  <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                    <TeamsHeader
                      teams={teams}
                      coaches={teamDisplayProps.coaches}
                      sessionTitle={session?.title}
                      sessionDate={session?.date}
                      sessionEndTime={session?.endTime}
                      isStaff={isStaff}
                      removingTeams={removingTeams}
                      onRemoveTeams={handleRemoveTeams}
                      onEditTeams={() => setEditingTeams(true)}
                    />
                    <TeamDisplay {...teamDisplayProps} />
                  </Paper>
                </SectionErrorBoundary>
                <SectionErrorBoundary label="Lista iscritti">
                  <RosterByRole {...rosterProps} />
                </SectionErrorBoundary>
              </>
            ) : (
              /* ── Stato: default — layout a due colonne su desktop ── */
              <Grid container spacing={3} alignItems="flex-start">
                {/* Sinistra (desktop): roster + squadre */}
                <Grid size={{ xs: 12, md: 7 }} sx={{ order: { xs: 2, md: 1 } }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <SectionErrorBoundary label="Lista iscritti">
                      <RosterByRole {...rosterProps} />
                    </SectionErrorBoundary>
                    <SectionErrorBoundary label="Squadre">
                      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                        <TeamsHeader
                          teams={teams}
                          coaches={teamDisplayProps.coaches}
                          sessionTitle={session?.title}
                          sessionDate={session?.date}
                          sessionEndTime={session?.endTime}
                          isStaff={isStaff}
                          removingTeams={removingTeams}
                          onRemoveTeams={handleRemoveTeams}
                          onEditTeams={() => setEditingTeams(true)}
                        />
                        <TeamDisplay {...teamDisplayProps} />
                      </Paper>
                    </SectionErrorBoundary>
                  </Box>
                </Grid>

                {/* Destra (desktop): form iscrizione sticky */}
                <Grid size={{ xs: 12, md: 5 }} sx={{ order: { xs: 1, md: 2 } }}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      position: { md: "sticky" },
                      top: { md: 24 },
                    }}
                  >
                    {session.registrationOpen === false && isStaff && !isEnded && (
                      <OpenRegistrationsAlert
                        sessionId={realSessionId}
                        onOpened={() => void refetchSession()}
                      />
                    )}
                    {session.registrationOpen === true && isStaff && !isEnded && (
                      <CloseRegistrationsAlert
                        sessionId={realSessionId}
                        onClosed={() => void refetchSession()}
                      />
                    )}
                    <SectionErrorBoundary label="Modulo iscrizione">
                      {session.registrationOpen === false && !isStaff ? (
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            {session.registrationOpenedAt
                              ? t("registrationsClosed")
                              : t("comingSoon")}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {session.registrationOpenedAt
                              ? t("registrationsClosedDesc")
                              : t("registrationsNotOpenDesc")}
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          {/* Le iscrizioni chiuse non bloccano lo staff
                              (checkRegistrationAllowed ammette sempre COACH e
                              ADMIN): il form resta attivo, e questa riga dice
                              perché. */}
                          {session.registrationOpen === false && isStaff && !isEnded && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              {t("staffCanRegisterAnyway")}
                            </Alert>
                          )}
                          <RegistrationForm
                            sessionId={sessionId}
                            onRegistered={refreshSecondary}
                            onOptimisticAdd={handleOptimisticAdd}
                            onSubmitError={invalidateRegistrations}
                            registeredNames={registrations.map((r) => r.name)}
                            registeredUserIds={registrations.map((r) => r.userId)}
                            registeredChildIds={registrations.map((r) => r.childId)}
                            currentUser={currentUser}
                            parentChildren={parentChildren}
                            restrictions={
                              session
                                ? {
                                    allowedRoles: session.allowedRoles ?? [],
                                    restrictTeamId: session.restrictTeamId ?? null,
                                    openRoles: session.openRoles ?? [],
                                    restrictTeamName: session.restrictTeam?.name ?? null,
                                  }
                                : undefined
                            }
                          />
                        </>
                      )}
                    </SectionErrorBoundary>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        ) : (
          <Typography color="error">{t("notFound")}</Typography>
        )}
      </Container>
    </>
  );
}

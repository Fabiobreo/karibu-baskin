"use client";
import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Container, Typography, Box, Paper, Skeleton, Grid2 as Grid } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import SiteHeader from "@/components/SiteHeader";
import RegistrationForm, { type CurrentUser, type ChildInfo } from "@/components/RegistrationForm";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay, { type TeamsData } from "@/components/TeamDisplay";
import AllenamentoHero from "@/components/AllenamentoHero";
import AllenamentoEndedView from "@/components/AllenamentoEndedView";
import OpenRegistrationsAlert from "@/components/OpenRegistrationsAlert";
import CloseRegistrationsAlert from "@/components/CloseRegistrationsAlert";
import TeamsHeader from "@/components/TeamsHeader";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import { TEAM_META } from "@/lib/constants";
import { sessionEndDate } from "@/lib/dateUtils";
import { useToast } from "@/context/ToastContext";

interface Session {
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

export default function SessionPage() {
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
    mutate: mutateSession,
  } = useSWR<Session>(`/api/sessions/${encodeURIComponent(sessionParam)}`, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
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

  const teamsKey = realSessionId ? `/api/teams/${realSessionId}` : null;
  const {
    data: teamsRaw,
    isLoading: teamsLoading,
    mutate: mutateTeams,
  } = useSWR<TeamsData>(teamsKey, fetcher, { revalidateOnFocus: true, refreshInterval });
  const teams: TeamsData | null = teamsRaw?.generated ? teamsRaw : null;

  function refreshSecondary() {
    invalidateRegistrations();
    mutateTeams();
  }

  function handleOptimisticAdd(reg: import("@/components/RegistrationForm").OptimisticReg) {
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
            ? "Sta per iniziare!"
            : h > 0
              ? `Inizia fra ${h}h ${m}min`
              : `Inizia fra ${m} minuti`
        );
      } else if (now <= se) {
        const diff = se.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(
          diff < 60 * 1000
            ? "Sta per finire"
            : h > 0
              ? `Finisce fra ${h}h ${m}min`
              : `Finisce fra ${m} minuti`
        );
      } else {
        setCountdown(null);
      }
    }

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [session?.date, session?.endTime]);

  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";

  const [removingTeams, setRemovingTeams] = useState(false);
  const [editingTeams, setEditingTeams] = useState(false);

  async function handleRemoveTeams() {
    if (!realSessionId) return;
    setRemovingTeams(true);
    try {
      const res = await fetch(`/api/teams/${realSessionId}`, { method: "DELETE" });
      if (res.ok) {
        mutateTeams(undefined, false);
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
      mutateSession();
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
    onTeamsGenerated: (newTeams: TeamsData) => mutateTeams(newTeams, false),
  };

  return (
    <>
      <SiteHeader />

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
                    La tua squadra
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                    {myTeam.name}
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
                        onOpened={() => mutateSession()}
                      />
                    )}
                    {session.registrationOpen === true && isStaff && !isEnded && (
                      <CloseRegistrationsAlert
                        sessionId={realSessionId}
                        onClosed={() => mutateSession()}
                      />
                    )}
                    <SectionErrorBoundary label="Modulo iscrizione">
                      {session.registrationOpen === false && !isStaff ? (
                        <Box sx={{ textAlign: "center", py: 2 }}>
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            {session.registrationOpenedAt ? "Iscrizioni chiuse" : "In arrivo"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {session.registrationOpenedAt
                              ? "Le iscrizioni per questo allenamento sono state chiuse."
                              : "Le iscrizioni per questo allenamento non sono ancora aperte. Riceverai una notifica appena saranno disponibili."}
                          </Typography>
                        </Box>
                      ) : (
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
                      )}
                    </SectionErrorBoundary>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        ) : (
          <Typography color="error">Allenamento non trovato.</Typography>
        )}
      </Container>
    </>
  );
}

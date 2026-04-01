"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Container, Typography, Box,
  Paper, Chip, Skeleton, Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import RegistrationForm, { type CurrentUser } from "@/components/RegistrationForm";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay, { type TeamsData } from "@/components/TeamDisplay";
import ShareSection from "@/components/ShareSection";

interface Session {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  _count: { registrations: number };
}

interface Registration {
  id: string;
  name: string;
  role: number;
  createdAt: string;
  sessionId: string;
  userId: string | null;
}

interface StatusBadge {
  label: string;
  bgcolor: string;
}

const TEAM_META = [
  { key: "teamA" as const, name: "Arancioni", color: "#E65100" },
  { key: "teamB" as const, name: "Neri", color: "#1A1A1A" },
  { key: "teamC" as const, name: "Bianchi", color: "#757575" },
];

function getSessionStatus(date: Date, endTime: Date | null): StatusBadge {
  const now = new Date();
  const end = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);

  if (now >= date && now <= end) {
    return { label: "In corso", bgcolor: "#2E7D32" };
  }
  if (now > end) {
    return { label: "Terminato", bgcolor: "rgba(255,255,255,0.18)" };
  }

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) return { label: "Oggi!", bgcolor: "#E65100" };
  if (diffDays === 1) return { label: "Domani", bgcolor: "#1565C0" };
  return { label: `Tra ${diffDays} giorni`, bgcolor: "#1565C0" };
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [teams, setTeams] = useState<TeamsData | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CurrentUser | null) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, []);

  const loadData = useCallback(async () => {
    const [sessionRes, regRes, teamsRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}`),
      fetch(`/api/registrations?sessionId=${sessionId}`),
      fetch(`/api/teams/${sessionId}`),
    ]);
    if (sessionRes.ok) setSession(await sessionRes.json());
    if (regRes.ok) setRegistrations(await regRes.json());
    if (teamsRes.ok) {
      const data: TeamsData = await teamsRes.json();
      setTeams(data.generated ? data : null);
    }
    setLoading(false);
    setTeamsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const sessionDate = session ? new Date(session.date) : null;
  const sessionEnd = session?.endTime ? new Date(session.endTime) : null;
  const status = sessionDate ? getSessionStatus(sessionDate, sessionEnd) : null;

  const sessionUrl = typeof window !== "undefined"
    ? window.location.href
    : `https://karibu-baskin.vercel.app/allenamento/${sessionId}`;

  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";

  // Trova la squadra dell'utente corrente confrontando l'ID iscrizione
  const myRegistration = currentUser ? registrations.find((r) => r.userId === currentUser.id) : null;
  // Layout "squadre prima" quando l'utente è iscritto e le squadre sono già generate
  const teamFirstLayout = !!myRegistration && teams !== null;
  const myTeam = myRegistration && teams
    ? TEAM_META.find((t) => {
      const list = t.key === "teamC" ? teams.teamC : teams[t.key];
      return list?.some((a) => a.id === myRegistration.id);
    }) ?? null
    : null;

  return (
    <>
      <SiteHeader />

      {/* ── Hero "Match Day Card" ── */}
      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 0 }} />
      ) : session && sessionDate ? (
        <Box
          sx={{
            background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
            color: "#fff",
            px: { xs: 2.5, sm: 4, md: 8 },
            py: { xs: 3, sm: 4 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.06)", pointerEvents: "none" }} />

          <Box sx={{ maxWidth: "md", mx: "auto", position: "relative" }}>
            {/* Torna indietro */}
            <Box sx={{ mb: 2 }}>
              <Button
                component={Link}
                href="/"
                startIcon={<ArrowBackIcon sx={{ fontSize: "0.95rem !important" }} />}
                size="small"
                sx={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  px: 0,
                  minWidth: 0,
                  "&:hover": { color: "#fff", backgroundColor: "transparent" },
                }}
              >
                Allenamenti
              </Button>
            </Box>

            {/* Titolo */}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.15,
                mb: 1.5,
                fontSize: { xs: "1.7rem", sm: "2.2rem", md: "2.6rem" },
              }}
            >
              {session.title}
            </Typography>

            {/* Badge stato */}
            {status && (
              <Chip
                label={status.label}
                size="small"
                sx={{
                  bgcolor: status.bgcolor,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  mb: 2,
                  letterSpacing: 0.5,
                }}
              />
            )}

            {/* Data e orario */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: { xs: 1, sm: 2.5 },
                mb: 2.5,
                opacity: 0.82,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <CalendarTodayIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {format(sessionDate, "EEEE d MMMM yyyy", { locale: it })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {format(sessionDate, "HH:mm")}
                  {sessionEnd && `–${format(sessionEnd, "HH:mm")}`}
                </Typography>
              </Box>
            </Box>

            {/* Condivisione */}
            <ShareSection
              sessionTitle={session.title}
              sessionUrl={sessionUrl}
              dark
            />
          </Box>
        </Box>
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

            {/* Banner "la tua squadra" — visibile solo se iscritto e squadre generate */}
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
                  <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    La tua squadra
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                    {myTeam.name}
                  </Typography>
                </Box>
              </Paper>
            )}

            {teamFirstLayout ? (
              // ── Layout iscritto + squadre generate ──────────────────────────
              // banner "la tua squadra" già mostrato sopra; qui squadre → iscritti
              <>
                <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Squadre
                  </Typography>
                  <TeamDisplay
                    sessionId={sessionId}
                    isStaff={isStaff}
                    registrationIds={registrations.map((r) => r.id)}
                    teams={teams}
                    teamsLoading={teamsLoading}
                    onTeamsGenerated={(newTeams) => setTeams(newTeams)}
                  />
                </Paper>

                <RosterByRole
                  registrations={registrations}
                  currentUserId={currentUser?.id ?? null}
                  isStaff={isStaff}
                  onUnregistered={loadData}
                />
              </>
            ) : (
              // ── Layout default ───────────────────────────────────────────────
              <>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                    alignItems: "flex-start",
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{ p: { xs: 2, sm: 3 }, flex: "0 0 auto", width: { xs: "100%", md: 340 } }}
                  >
                    <RegistrationForm
                      sessionId={sessionId}
                      onRegistered={loadData}
                      registeredNames={registrations.map((r) => r.name)}
                      registeredUserIds={registrations.map((r) => r.userId)}
                      currentUser={currentUser}
                    />
                  </Paper>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <RosterByRole
                      registrations={registrations}
                      currentUserId={currentUser?.id ?? null}
                      isStaff={isStaff}
                      onUnregistered={loadData}
                    />
                  </Box>
                </Box>

                <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Squadre
                  </Typography>
                  <TeamDisplay
                    sessionId={sessionId}
                    isStaff={isStaff}
                    registrationIds={registrations.map((r) => r.id)}
                    teams={teams}
                    teamsLoading={teamsLoading}
                    onTeamsGenerated={(newTeams) => setTeams(newTeams)}
                  />
                </Paper>
              </>
            )}

          </Box>
        ) : (
          <Typography color="error">Allenamento non trovato.</Typography>
        )}
      </Container>
    </>
  );
}

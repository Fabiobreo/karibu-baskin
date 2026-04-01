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
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import RegistrationForm, { type CurrentUser } from "@/components/RegistrationForm";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay from "@/components/TeamDisplay";
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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CurrentUser | null) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, []);

  const loadData = useCallback(async () => {
    const [sessionRes, regRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}`),
      fetch(`/api/registrations?sessionId=${sessionId}`),
    ]);
    if (sessionRes.ok) setSession(await sessionRes.json());
    if (regRes.ok) setRegistrations(await regRes.json());
    setLoading(false);
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

  return (
    <>
      <SiteHeader />

      {/* ── Hero "Match Day Card" ── */}
      {loading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 0 }} />
      ) : session && sessionDate ? (
        <Box
          sx={{
            background: "linear-gradient(135deg, #1a1a1a 0%, #242424 65%, rgba(230,81,0,0.18) 100%)",
            color: "#fff",
            px: { xs: 2.5, sm: 4, md: 8 },
            py: { xs: 3, sm: 4 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Alone arancio decorativo */}
          <Box sx={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(230,81,0,0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

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
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Box>
        ) : session ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            {/* Iscrizione + roster */}
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
                sx={{
                  p: { xs: 2, sm: 3 },
                  flex: "0 0 auto",
                  width: { xs: "100%", md: 340 },
                }}
              >
                <RegistrationForm
                  sessionId={sessionId}
                  onRegistered={loadData}
                  registeredNames={registrations.map((r) => r.name)}
                  registeredUserIds={registrations.map((r) => r.userId)}
                  currentUser={currentUser}
                />
              </Paper>

              <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, flex: 1, minWidth: 0 }}>
                <RosterByRole
                  registrations={registrations}
                  currentUserId={currentUser?.id ?? null}
                  isStaff={
                    currentUser?.appRole === "COACH" ||
                    currentUser?.appRole === "ADMIN"
                  }
                  onUnregistered={loadData}
                />
              </Paper>
            </Box>

            {/* Squadre */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Squadre
              </Typography>
              <TeamDisplay sessionId={sessionId} />
            </Paper>

          </Box>
        ) : (
          <Typography color="error">Allenamento non trovato.</Typography>
        )}
      </Container>
    </>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Paper,
  Skeleton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import RegistrationForm from "@/components/RegistrationForm";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay from "@/components/TeamDisplay";

interface Session {
  id: string;
  title: string;
  date: string;
  _count: { registrations: number };
}

interface Registration {
  id: string;
  name: string;
  role: number;
  createdAt: string;
  sessionId: string;
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      {/* ── AppBar ── */}
      <AppBar position="sticky" color="secondary">
        <Toolbar sx={{ gap: 1 }}>
          <IconButton color="inherit" component={Link} href="/" edge="start">
            <ArrowBackIcon />
          </IconButton>
          <Box
            component="img"
            src="/logo.png"
            alt="Karibu"
            sx={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
          />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              fontSize: { xs: "0.95rem", sm: "1.1rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Caricamento..." : session?.title ?? "Allenamento"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4 } }}>
        {loading ? (
          <Box>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={120} sx={{ mt: 2, borderRadius: 2 }} />
          </Box>
        ) : session ? (
          <>
            {/* Header sessione */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>
                {session.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {format(new Date(session.date), "EEEE d MMMM yyyy", { locale: it })}
                {" · ore "}
                {format(new Date(session.date), "HH:mm")}
              </Typography>
            </Box>

            {/* ── Squadre ── */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Squadre
              </Typography>
              <TeamDisplay sessionId={sessionId} />
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* ── Iscrizione + lista iscritti ── */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  flex: "0 0 auto",
                  width: { xs: "100%", md: 340 },
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <RegistrationForm
                  sessionId={sessionId}
                  onRegistered={loadData}
                  registeredNames={registrations.map((r) => r.name)}
                />
              </Paper>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <RosterByRole registrations={registrations} />
              </Box>
            </Box>
          </>
        ) : (
          <Typography color="error">Allenamento non trovato.</Typography>
        )}
      </Container>
    </>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Paper,
  Divider,
  IconButton,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSessionForm from "@/components/AdminSessionForm";
import AdminSessionList from "@/components/AdminSessionList";

interface SessionWithCount {
  id: string;
  title: string;
  date: string;
  _count: { registrations: number };
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const router = useRouter();

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton color="inherit" component={Link} href="/" edge="start" sx={{ mr: 1 }}>
            <HomeIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Admin — Karibu Baskin
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Esci
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4 }}>
          {/* Create form */}
          <Paper elevation={2} sx={{ p: 3, flex: 1 }}>
            <AdminSessionForm onCreated={loadSessions} />
          </Paper>

          {/* Sessions list */}
          <Box sx={{ flex: 2 }}>
            <Typography variant="h6" gutterBottom>
              Allenamenti programmati
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <AdminSessionList sessions={sessions} onDeleted={loadSessions} />
          </Box>
        </Box>
      </Container>
    </>
  );
}

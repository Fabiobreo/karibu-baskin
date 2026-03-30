"use client";
import { useEffect, useState, useCallback } from "react";
import { Typography, Box, Paper, Divider } from "@mui/material";
import AdminSessionForm from "@/components/AdminSessionForm";
import AdminSessionList from "@/components/AdminSessionList";

interface SessionWithCount {
  id: string;
  title: string;
  date: string;
  teams: object | null;
  _count: { registrations: number };
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4 }}>
      {/* Form creazione */}
      <Paper elevation={2} sx={{ p: 3, flex: 1 }}>
        <AdminSessionForm onCreated={loadSessions} />
      </Paper>

      {/* Lista allenamenti */}
      <Box sx={{ flex: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Allenamenti programmati
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <AdminSessionList sessions={sessions} onDeleted={loadSessions} onTeamsGenerated={loadSessions} />
      </Box>
    </Box>
  );
}

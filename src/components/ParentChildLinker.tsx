"use client";
import { useState } from "react";
import {
  Box, TextField, Button, Avatar, Typography, List, ListItem,
  ListItemAvatar, ListItemText, IconButton, Paper, CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useToast } from "@/context/ToastContext";

interface Child {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  appRole: string;
}

export default function ParentChildLinker({ initialChildren }: { initialChildren: Child[] }) {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleAdd() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ message: data.error ?? "Errore nel collegamento", severity: "error" });
        return;
      }
      setChildren((prev) => [...prev, data]);
      setEmail("");
      showToast({ message: `${data.name ?? data.email} collegato/a!`, severity: "success" });
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(childId: string) {
    await fetch(`/api/users/me/children/${childId}`, { method: "DELETE" });
    setChildren((prev) => prev.filter((c) => c.id !== childId));
    showToast({ message: "Collegamento rimosso", severity: "info" });
  }

  return (
    <Box>
      {/* Lista figli collegati */}
      {children.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <List disablePadding>
            {children.map((child, idx) => (
              <ListItem
                key={child.id}
                divider={idx < children.length - 1}
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleRemove(child.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar src={child.image ?? undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {child.name?.[0] ?? child.email[0].toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={child.name ?? "—"}
                  secondary={child.email}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {children.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Nessun figlio collegato.
        </Typography>
      )}

      {/* Aggiunta nuovo figlio */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          placeholder="Email del figlio/a..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          size="small"
          fullWidth
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={loading || !email.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
          sx={{ whiteSpace: "nowrap" }}
        >
          Collega
        </Button>
      </Box>
    </Box>
  );
}

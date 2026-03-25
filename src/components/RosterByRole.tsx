"use client";
import { Box, Typography, Chip } from "@mui/material";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";

interface Registration {
  id: string;
  name: string;
  role: number;
  createdAt: string | Date;
  sessionId: string;
}

interface Props {
  registrations: Registration[];
}

export default function RosterByRole({ registrations }: Props) {
  if (registrations.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Nessun atleta iscritto ancora.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Iscritti —{" "}
        <Typography component="span" variant="h6" color="primary">
          {registrations.length} atleti
        </Typography>
      </Typography>

      {ROLES.map((role) => {
        const group = registrations.filter((r) => r.role === role);
        if (group.length === 0) return null;
        return (
          <Box key={role} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Chip
                label={`${ROLE_LABELS[role]} (${group.length})`}
                size="small"
                sx={{ backgroundColor: ROLE_COLORS[role], color: "#fff", fontWeight: 700 }}
              />
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, pl: 0.5 }}>
              {group.map((reg) => (
                <Chip key={reg.id} label={reg.name} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

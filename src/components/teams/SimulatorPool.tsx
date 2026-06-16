"use client";

import { useState } from "react";
import { Box, Paper, Typography, Avatar, Button, Stack, Tabs, Tab, Chip } from "@mui/material";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import { useTranslations } from "next-intl";
import { ROLE_COLORS } from "@/lib/constants";
import type { SimPlayer } from "@/components/teams/MatchSimulator";

const pkey = (p: SimPlayer) => `${p.kind}-${p.id}`;

type RoleKey = number | "none";

interface SimulatorPoolProps {
  players: SimPlayer[];
  canAssign: (p: SimPlayer, side: "A" | "B") => boolean;
  onAssign: (p: SimPlayer, side: "A" | "B") => void;
}

/**
 * Pool dei giocatori disponibili, suddiviso per ruolo in tab (1→5, poi senza
 * ruolo). I pulsanti A/B si disabilitano quando la scelta renderebbe la
 * formazione non valida (vedi canAssign nel componente padre).
 */
export default function SimulatorPool({ players, canAssign, onAssign }: SimulatorPoolProps) {
  const t = useTranslations("simulator");

  const groups = new Map<RoleKey, SimPlayer[]>();
  for (const p of players) {
    const key: RoleKey = p.sportRole ?? "none";
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  const order: RoleKey[] = [1, 2, 3, 4, 5, "none"].filter((k) =>
    groups.has(k as RoleKey)
  ) as RoleKey[];

  const [activeRole, setActiveRole] = useState<RoleKey>(order[0] ?? 1);
  // Se il ruolo attivo non ha più giocatori disponibili, ripiega sul primo.
  const active = order.includes(activeRole) ? activeRole : order[0];
  const list = active != null ? (groups.get(active) ?? []) : [];

  const roleLabel = (k: RoleKey) => (typeof k === "number" ? `R${k}` : t("noRole"));

  return (
    <Box sx={{ mt: 1.5 }}>
      <Tabs
        value={active}
        onChange={(_, v: RoleKey) => setActiveRole(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 1.5, minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0 } }}
      >
        {order.map((k) => (
          <Tab
            key={String(k)}
            value={k}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: typeof k === "number" ? ROLE_COLORS[k] : "text.disabled",
                  }}
                />
                <span>{roleLabel(k)}</span>
                <Chip
                  label={groups.get(k)?.length ?? 0}
                  size="small"
                  sx={{ height: 18, fontSize: 11, fontWeight: 700 }}
                />
              </Box>
            }
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
        ))}
      </Tabs>

      <Stack spacing={1}>
        {list.map((p) => (
          <Paper
            key={pkey(p)}
            variant="outlined"
            sx={{ p: 1, display: "flex", alignItems: "center", gap: 1.5, borderRadius: 2 }}
          >
            <Avatar src={p.image ?? undefined} sx={{ width: 36, height: 36, fontSize: 15 }}>
              {p.name[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {p.name}
                </Typography>
                <GenderMark gender={p.gender} />
              </Box>
              <Chip
                label={p.teamName}
                size="small"
                variant="outlined"
                sx={{ height: 17, fontSize: 10, fontWeight: 600, mt: 0.25 }}
              />
            </Box>
            <Button
              size="small"
              variant="outlined"
              disabled={!canAssign(p, "A")}
              onClick={() => onAssign(p, "A")}
              sx={{
                minWidth: 40,
                fontWeight: 800,
                color: "primary.main",
                borderColor: "primary.main",
              }}
            >
              A
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={!canAssign(p, "B")}
              onClick={() => onAssign(p, "B")}
              sx={{
                minWidth: 40,
                fontWeight: 800,
                color: "secondary.main",
                borderColor: "secondary.main",
              }}
            >
              B
            </Button>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

/** Icona di genere: donna evidenziata (utile per il vincolo R4/R5). */
function GenderMark({ gender }: { gender: "MALE" | "FEMALE" | null }) {
  if (gender === "FEMALE") return <FemaleIcon sx={{ fontSize: 16, color: "secondary.main" }} />;
  if (gender === "MALE") return <MaleIcon sx={{ fontSize: 16, color: "text.disabled" }} />;
  return null;
}

"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, Chip, Button,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import TeamsModal from "@/components/TeamsModal";

interface Athlete { id: string; name: string; role: number }
interface TeamsData { teamA: Athlete[]; teamB: Athlete[]; teamC?: Athlete[] }

export interface SessionWithCount {
  id: string;
  title: string;
  date: string | Date;
  endTime: string | Date | null;
  dateSlug: string | null;
  teams: TeamsData | null;
  allowedRoles?: number[];
  restrictTeamId?: string | null;
  openRoles?: number[];
  restrictTeam?: { id: string; name: string; color: string | null } | null;
  _count: { registrations: number };
}

const TEAM_META = [
  { key: "teamA" as const, name: "Arancioni", color: "#E65100" },
  { key: "teamB" as const, name: "Neri",      color: "#1A1A1A" },
  { key: "teamC" as const, name: "Bianchi",   color: "#757575" },
];

function getStatusLabel(date: Date, endTime: Date | null): { label: string; color: string } {
  const now = new Date();
  const end = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);
  if (now >= date && now <= end) return { label: "In corso", color: "#2E7D32" };
  if (now > end) return { label: "Terminato", color: "#9E9E9E" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: "Oggi!", color: "#E65100" };
  if (diffDays === 1) return { label: "Domani", color: "#1565C0" };
  return { label: `Tra ${diffDays} giorni`, color: "#1565C0" };
}

export default function SessionCard({
  session: s,
  hero = false,
  muted = false,
  live = false,
  isRegistered = false,
  myRegistrationId = null,
  isStaff = false,
  onEdit,
  onDelete,
  onGenerateTeams,
  onRemoveTeams,
  generating = false,
  removingTeams = false,
}: {
  session: SessionWithCount;
  hero?: boolean;
  muted?: boolean;
  live?: boolean;
  isRegistered?: boolean;
  myRegistrationId?: string | null;
  isStaff?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateTeams?: () => void;
  onRemoveTeams?: () => void;
  generating?: boolean;
  removingTeams?: boolean;
}) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const hasTeams = !!s.teams;
  const myTeam = myRegistrationId && s.teams
    ? TEAM_META.find((t) => s.teams![t.key]?.some((a) => a.id === myRegistrationId)) ?? null
    : null;
  const status = getStatusLabel(date, endTime);

  const px = 2;
  const iconSize = 13;
  const textVariant = "caption" as const;
  const dateFormat = "EEE d MMM";
  const chipFontSize = "0.68rem";

  return (
    <>
      <Paper
        elevation={muted ? 0 : live ? 4 : hero ? 4 : 2}
        variant={muted ? "outlined" : "elevation"}
        sx={{
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity: muted ? 0.72 : 1,
          position: "relative",
          cursor: "pointer",
         "&:hover": { boxShadow: muted ? undefined : live ? 6 : hero ? 6 : 4 },
          ...(live && {
            outline: "2px solid #2E7D32",
            "@keyframes pulse-border": {
              "0%":   { boxShadow: "0 0 0 0 rgba(46,125,50,0.6), 0 2px 8px rgba(0,0,0,0.15)" },
              "50%":  { boxShadow: "0 0 0 10px rgba(46,125,50,0), 0 2px 8px rgba(0,0,0,0.15)" },
              "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.6), 0 2px 8px rgba(0,0,0,0.15)" },
            },
            animation: "pulse-border 2s ease-out infinite",
          }),
        }}
      >

        {/* Stretched link */}
        <Box
          component={Link}
          href={href}
          aria-label={s.title}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: "-2px",
            },
          }}
        />

        {/* Header */}
        <Box
          sx={{
            px,
            py: hero ? { xs: 2, sm: 2.5 } : 1.5,
            background: muted
              ? "rgba(0,0,0,0.04)"
              : myTeam
                ? `linear-gradient(135deg, ${myTeam.color} 0%, #686868 100%)`
                : "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
            display: "flex",
            alignItems: hero ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 1,
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
            {myTeam && (
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1,
                }}
              >
                Squadra {myTeam.name}
              </Typography>
            )}
            <Typography
              variant={hero ? "h4" : "subtitle1"}
              fontWeight={hero ? 800 : 700}
              noWrap={!hero}
              sx={{
                color: muted ? "text.primary" : "#fff",
                lineHeight: 1.2,
                ...(hero && { fontSize: { xs: "1.3rem", sm: "1.5rem" } }),
              }}
            >
              {s.title}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, mt: hero ? 0.25 : 0 }}>
            <Chip
              label={status.label}
              size="small"
              sx={{
                bgcolor: muted ? "action.selected" : status.color,
                color: muted ? "text.secondary" : "#fff",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
            {isStaff && (
              <IconButton
                size="small"
                aria-label="Azioni allenamento"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuAnchor(e.currentTarget); }}
                sx={{ color: muted ? "text.disabled" : "rgba(255,255,255,0.7)", pointerEvents: "auto" }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {isStaff && (
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem onClick={() => { setMenuAnchor(null); onEdit?.(); }}>
                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Modifica</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); onDelete?.(); }} sx={{ color: "error.main" }}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Elimina</ListItemText>
              </MenuItem>
            </Menu>
          )}
        </Box>

        {/* Meta — 3 righe, cresce per spingere CTA in fondo */}
        <Box
          sx={{
            px,
            py: 1.5,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          {/* Riga 1: data + orario */}
          <Box sx={{ display: "flex", alignItems: "center", gap: hero ? 2 : 1.5, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CalendarTodayIcon sx={{ fontSize: iconSize, color: "text.disabled" }} />
              <Typography variant={textVariant} color="text.secondary" fontWeight={500}>
                {format(date, dateFormat, { locale: it })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccessTimeIcon sx={{ fontSize: iconSize, color: "text.disabled" }} />
              <Typography variant={textVariant} color="text.secondary" fontWeight={500}>
                {format(date, "HH:mm")}{endTime && `–${format(endTime, "HH:mm")}`}
              </Typography>
            </Box>
          </Box>

          {/* Riga 2: iscritti + [iscritto chip per non-hero] + squadra */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <GroupsIcon sx={{ fontSize: iconSize, color: "text.disabled" }} />
              <Typography variant={textVariant} color="text.secondary" fontWeight={500}>
                {s._count.registrations}{" "}{s._count.registrations === 1 ? "iscritto" : "iscritti"}
              </Typography>
            </Box>
            {isRegistered && !myTeam && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important" }} />}
                label="Iscritto"
                size="small"
                color="success"
                sx={{ fontWeight: 600, fontSize: chipFontSize }}
              />
            )}
          </Box>

          {/* Riga 3: restrizioni (solo se presenti) */}
          {(s.restrictTeamId || (s.allowedRoles && s.allowedRoles.length > 0)) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.9rem !important" }} />}
                label={s.restrictTeam
                  ? `Solo ${s.restrictTeam.name}${s.allowedRoles?.length ? ` · ${s.allowedRoles.map((r) => `Ruolo ${r}`).join(", ")}` : ""}`
                  : s.allowedRoles!.map((r) => `Ruolo ${r}`).join(", ")}
                size="small"
                sx={{ fontSize: chipFontSize, fontWeight: 700, bgcolor: "warning.light", color: "warning.contrastText" }}
              />
              {s.restrictTeamId && s.openRoles && s.openRoles.length > 0 && (
                <Chip
                  icon={<LockOpenIcon sx={{ fontSize: "0.9rem !important" }} />}
                  label={`Aperto a tutti i ${s.openRoles.map((r) => `${r}`).join(", ")}`}
                  size="small"
                  sx={{ fontSize: chipFontSize, fontWeight: 700, bgcolor: "success.light", color: "success.contrastText" }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* CTA */}
        <Box
          sx={{
            px,
            pb: 2,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            position: "relative",
            zIndex: 2,
          }}
        >
          {!isRegistered && !muted && (
            <Button
              component={Link}
              href={href}
              variant="contained"
              size="small"
              sx={{ fontWeight: 700, fontSize: "0.72rem", py: 0.4, pointerEvents: "auto" }}
            >
              Iscriviti →
            </Button>
          )}
          {hasTeams && (
            <Button
              variant={myTeam ? "outlined" : "contained"}
              size="small"
              startIcon={<SportsBasketballIcon sx={{ fontSize: "0.85rem !important" }} />}
              onClick={() => setTeamsOpen(true)}
              sx={{ fontWeight: 600, fontSize: "0.72rem", py: 0.4, pointerEvents: "auto" }}
            >
              Vedi squadre
            </Button>
          )}
          {isStaff && hasTeams && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemoveTeams?.(); }}
              disabled={removingTeams}
              sx={{ fontWeight: 600, fontSize: "0.72rem", py: 0.4, pointerEvents: "auto" }}
            >
              {removingTeams ? <CircularProgress size={13} color="inherit" /> : "Rimuovi squadre"}
            </Button>
          )}
          {isStaff && !hasTeams && (
            <Button
              variant="contained"
              size="small"
              startIcon={generating ? <CircularProgress size={13} color="inherit" /> : <SportsBasketballIcon sx={{ fontSize: "0.85rem !important" }} />}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGenerateTeams?.(); }}
              disabled={generating || s._count.registrations === 0}
              sx={{ fontWeight: 600, fontSize: "0.72rem", py: 0.4, pointerEvents: "auto" }}
            >
              {generating ? "Generazione..." : "Genera squadre"}
            </Button>
          )}
        </Box>
      </Paper>

      {hasTeams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={s.title}
          teamA={s.teams!.teamA}
          teamB={s.teams!.teamB}
          teamC={s.teams!.teamC}
        />
      )}
    </>
  );
}

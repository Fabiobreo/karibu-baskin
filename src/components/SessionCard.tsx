"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, Chip, Button,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress, Tooltip,
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

type StatusInfo = { label: string; color: string };

function getStatus(date: Date, endTime: Date | null): StatusInfo {
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

const TEAM_META = [
  { key: "teamA" as const, name: "Arancioni", color: "#E65100" },
  { key: "teamB" as const, name: "Neri",      color: "#1A1A1A" },
  { key: "teamC" as const, name: "Bianchi",   color: "#757575" },
];

export default function SessionCard({
  session: s,
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
  const status = getStatus(date, endTime);
  const hasTeams = !!s.teams;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const myTeam = myRegistrationId && s.teams
    ? TEAM_META.find((t) => s.teams![t.key]?.some((a) => a.id === myRegistrationId)) ?? null
    : null;

  return (
    <>
      <Paper
        elevation={muted ? 0 : live ? 4 : 2}
        variant={muted ? "outlined" : "elevation"}
        sx={{
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity: muted ? 0.72 : 1,
          position: "relative",
          // Cursore pointer sull'intera card
          cursor: "pointer",
          // Hover leggero sull'intera card (non interferisce col bottone)
          "&:hover": { boxShadow: muted ? undefined : live ? 6 : 4 },
          ...(live && {
            outline: "2px solid #2E7D32",
            "@keyframes glow": {
              "0%": { boxShadow: "0 0 6px 0 rgba(46,125,50,0.4)" },
              "50%": { boxShadow: "0 0 18px 4px rgba(46,125,50,0.25)" },
              "100%": { boxShadow: "0 0 6px 0 rgba(46,125,50,0.4)" },
            },
            animation: "glow 2.5s ease-in-out infinite",
          }),
        }}
      >
        {/* Stretched link — copre tutta la card, bucato dal bottone tramite z-index */}
        <Box
          component={Link}
          href={href}
          aria-label={s.title}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            // Nasconde l'outline default del link (la card stessa fa da focus ring)
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: "-2px",
            },
          }}
        />

        {/* Intestazione */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: muted
              ? "rgba(0,0,0,0.04)"
              : live
                ? "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)"
                : "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            position: "relative",
            zIndex: 1,
            pointerEvents: "none", // il click passa al link sottostante
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: muted ? "text.primary" : "#fff" }}>
              {s.title}
            </Typography>
          </Box>
          <Chip
            label={status.label}
            size="small"
            sx={{
              bgcolor: muted ? "action.selected" : status.color,
              color: muted ? "text.secondary" : "#fff",
              fontWeight: 700,
              fontSize: "0.68rem",
              flexShrink: 0,
            }}
          />
          {isStaff && (
            <IconButton
              size="small"
              aria-label="Azioni allenamento"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuAnchor(e.currentTarget); }}
              sx={{ color: muted ? "text.disabled" : "rgba(255,255,255,0.7)", ml: 0.25, flexShrink: 0, pointerEvents: "auto" }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
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

        {/* Corpo */}
        <Box sx={{ flex: 1, display: "flex", position: "relative", zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
          {/* Info colonna sinistra */}
          <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {format(date, "EEEE d MMMM yyyy", { locale: it })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {format(date, "HH:mm")}
                {endTime && `–${format(endTime, "HH:mm")}`}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <GroupsIcon sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {s._count.registrations} {s._count.registrations === 1 ? "iscritto" : "iscritti"}
              </Typography>
            </Box>
            {(s.allowedRoles && s.allowedRoles.length > 0 || s.restrictTeamId) && (
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.8rem !important" }} />}
                label={s.restrictTeam
                  ? `Solo ${s.restrictTeam.name}${s.allowedRoles?.length ? ` · ${s.allowedRoles.map((r) => `Ruolo ${r}`).join(", ")}` : ""}`
                  : s.allowedRoles!.map((r) => `Ruolo ${r}`).join(", ")}
                size="small"
                sx={{ fontSize: "0.68rem", height: 20, bgcolor: "warning.light", color: "warning.contrastText", alignSelf: "flex-start" }}
              />
            )}
            {s.restrictTeamId && s.openRoles && s.openRoles.length > 0 && (
              <Chip
                icon={<LockOpenIcon sx={{ fontSize: "0.8rem !important" }} />}
                label={`${s.openRoles.map((r) => `Ruolo ${r}`).join(", ")}`}
                size="small"
                sx={{ fontSize: "0.68rem", height: 20, bgcolor: "success.light", color: "success.contrastText", alignSelf: "flex-start" }}
              />
            )}

            <Box sx={{ mt: "auto", pt: 0.5, display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
              {!myTeam && isRegistered && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Sei iscritto"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                />
              )}
              {hasTeams && !myTeam && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Squadre pronte!"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                />
              )}
              {hasTeams && isStaff && (
                <Tooltip title="Rimuovi squadre">
                  <span style={{ pointerEvents: "auto" }}>
                    <Button
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemoveTeams?.(); }}
                      disabled={removingTeams}
                      sx={{ fontSize: "0.72rem", minWidth: 0, px: 1 }}
                    >
                      {removingTeams ? <CircularProgress size={12} color="error" /> : "Rimuovi"}
                    </Button>
                  </span>
                </Tooltip>
              )}
              {!hasTeams && isStaff && (
                <span style={{ pointerEvents: "auto" }}>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <SportsBasketballIcon />}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onGenerateTeams?.(); }}
                    disabled={generating || s._count.registrations === 0}
                    sx={{ fontSize: "0.78rem" }}
                  >
                    {generating ? "Generazione..." : "Genera squadre"}
                  </Button>
                </span>
              )}
            </Box>
          </Box>

          {/* Pannello squadra destra */}
          {myTeam && (
            <Box
              sx={{
                width: { xs: 64, sm: 76 },
                borderLeft: `3px solid ${myTeam.color}`,
                bgcolor: `${myTeam.color}18`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                flexShrink: 0,
                px: 0.5,
              }}
            >
              <GroupsIcon sx={{ color: myTeam.color, fontSize: 22 }} />
              <Typography
                sx={{
                  color: myTeam.color,
                  fontWeight: 800,
                  fontSize: "0.65rem",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {myTeam.name}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Bottone vedi squadre — z-index sopra il link, intercetta il click */}
        {hasTeams && (
          <Box sx={{ px: 2, pb: 2, pt: 0, position: "relative", zIndex: 1 }}>
            <Button
              size="small"
              variant={myTeam ? "outlined" : "contained"}
              fullWidth
              startIcon={<SportsBasketballIcon sx={{ fontSize: "0.9rem !important" }} />}
              onClick={() => setTeamsOpen(true)}
              sx={{ fontSize: "0.78rem" }}
            >
              {myTeam ? "Vedi tutte le squadre" : "Vedi squadre"}
            </Button>
          </Box>
        )}
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

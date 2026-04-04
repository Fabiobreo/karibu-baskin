"use client";
import { useState } from "react";
import {
  Box, Typography, Paper, Chip, Button,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LaunchIcon from "@mui/icons-material/Launch";
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

export default function SessionCard({
  session: s,
  muted = false,
  live = false,
}: {
  session: SessionWithCount;
  muted?: boolean;
  live?: boolean;
}) {
  const [teamsOpen, setTeamsOpen] = useState(false);

  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const status = getStatus(date, endTime);
  const hasTeams = !!s.teams;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const iconColor = (muted && !live) ? "text.disabled" : "rgba(255,255,255,0.7)";

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
          ...(live && {
            outline: "2px solid #2E7D32",
            "@keyframes glow": {
              "0%":   { boxShadow: "0 0 6px 0 rgba(46,125,50,0.4)" },
              "50%":  { boxShadow: "0 0 18px 4px rgba(46,125,50,0.25)" },
              "100%": { boxShadow: "0 0 6px 0 rgba(46,125,50,0.4)" },
            },
            animation: "glow 2.5s ease-in-out infinite",
          }),
        }}
      >
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
          }}
        >
          <Box
            component={Link}
            href={href}
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              textDecoration: "none",
              "& .launch-icon": { opacity: 0, transition: "opacity 0.15s" },
              "&:hover .launch-icon": { opacity: 1 },
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: muted ? "text.primary" : "#fff" }}>
              {s.title}
            </Typography>
            <LaunchIcon className="launch-icon" sx={{ fontSize: 13, color: iconColor, flexShrink: 0 }} />
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
        </Box>

        {/* Corpo */}
        <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
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

          {hasTeams && (
            <Box sx={{ mt: "auto", pt: 1.5 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label="Squadre pronte!"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: "0.72rem" }}
              />
            </Box>
          )}
        </Box>

        {/* Bottone vedi squadre */}
        {hasTeams && (
          <Box sx={{ px: 2, pb: 2, pt: 0 }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={<SportsBasketballIcon sx={{ fontSize: "0.9rem !important" }} />}
              onClick={() => setTeamsOpen(true)}
              sx={{ fontSize: "0.78rem" }}
            >
              Vedi squadre
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

"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Divider,
  LinearProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import SessionCard, { type SessionWithCount } from "@/components/SessionCard";
import TeamsModal from "@/components/TeamsModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByMonth(
  sessions: SessionWithCount[],
): [string, SessionWithCount[]][] {
  const map = new Map<string, SessionWithCount[]>();
  for (const s of sessions) {
    const key = format(new Date(s.date), "MMMM yyyy", { locale: it });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}

// ── Hero card (prossimo allenamento) ──────────────────────────────────────────

function HeroCard({
  session: s,
  isRegistered,
}: {
  session: SessionWithCount;
  isRegistered: boolean;
}) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const hasTeams = !!s.teams;

  const now = new Date();
  const diffDays = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const whenLabel =
    diffDays === 0 ? "Oggi!" : diffDays === 1 ? "Domani" : `Tra ${diffDays} giorni`;
  const whenColor = diffDays === 0 ? "#E65100" : "#1565C0";

  return (
    <>
      <Paper elevation={4} sx={{ overflow: "hidden", mb: 3, position: "relative" }}>
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
            background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
            px: { xs: 2.5, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "rgba(255,255,255,0.45)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              display: "block",
              mb: 0.5,
            }}
          >
            Prossimo allenamento
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                color: "#fff",
                lineHeight: 1.2,
                fontSize: { xs: "1.3rem", sm: "1.6rem" },
              }}
            >
              {s.title}
            </Typography>
            <Chip
              label={whenLabel}
              size="small"
              sx={{
                bgcolor: whenColor,
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.68rem",
                flexShrink: 0,
                mt: 0.25,
              }}
            />
          </Box>
        </Box>

        {/* Meta */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: 1.75,
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: 1.5, sm: 2.5 },
            alignItems: "center",
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarTodayIcon sx={{ fontSize: 15, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {format(date, "EEEE d MMMM", { locale: it })}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <AccessTimeIcon sx={{ fontSize: 15, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {format(date, "HH:mm")}
              {endTime && `–${format(endTime, "HH:mm")}`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <GroupsIcon sx={{ fontSize: 15, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {s._count.registrations}{" "}
              {s._count.registrations === 1 ? "iscritto" : "iscritti"}
            </Typography>
          </Box>
        </Box>

        {/* CTA */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            pb: 2.5,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            position: "relative",
            zIndex: 2,
          }}
        >
          {isRegistered ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="Sei iscritto"
              color="success"
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <Button
              component={Link}
              href={href}
              variant="contained"
              size="small"
              sx={{ fontWeight: 700, zIndex: 2 }}
            >
              Iscriviti →
            </Button>
          )}
          {hasTeams && (
            <Button
              variant="outlined"
              size="small"
              startIcon={
                <SportsBasketballIcon sx={{ fontSize: "0.9rem !important" }} />
              }
              onClick={() => setTeamsOpen(true)}
              sx={{ fontWeight: 600, zIndex: 2 }}
            >
              Vedi squadre
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

// ── Session row (lista compatta) ──────────────────────────────────────────────

function SessionRow({
  session: s,
  isRegistered = false,
  muted = false,
}: {
  session: SessionWithCount;
  isRegistered?: boolean;
  muted?: boolean;
}) {
  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, sm: 2 },
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderRadius: 0,
        textDecoration: "none",
        color: "inherit",
        opacity: muted ? 0.62 : 1,
        "&:hover": { bgcolor: "action.hover" },
        transition: "background-color 0.15s",
      }}
    >
      {/* Giorno numero + abbreviazione */}
      <Box
        sx={{
          width: { xs: 36, sm: 44 },
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "text.disabled",
            fontWeight: 700,
            lineHeight: 1,
            textTransform: "uppercase",
            fontSize: "0.62rem",
            letterSpacing: "0.05em",
          }}
        >
          {format(date, "EEE", { locale: it })}
        </Typography>
        <Typography
          fontWeight={800}
          sx={{ lineHeight: 1.3, fontSize: { xs: "1.1rem", sm: "1.2rem" } }}
        >
          {format(date, "d")}
        </Typography>
      </Box>

      {/* Titolo + orario */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {s.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.disabled">
            {format(date, "HH:mm")}
            {endTime && `–${format(endTime, "HH:mm")}`}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <GroupsIcon sx={{ fontSize: 11, color: "text.disabled" }} />
            <Typography variant="caption" color="text.disabled">
              {s._count.registrations}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Icone di stato */}
      {isRegistered && (
        <CheckCircleIcon
          sx={{ color: "success.main", fontSize: 18, flexShrink: 0 }}
        />
      )}
      {s.teams && !isRegistered && (
        <SportsBasketballIcon
          sx={{
            color: "primary.main",
            fontSize: 15,
            flexShrink: 0,
            opacity: 0.6,
          }}
        />
      )}

      <ChevronRightIcon
        sx={{ color: "text.disabled", fontSize: 18, flexShrink: 0 }}
      />
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PAST_PAGE_SIZE = 6;

export default function AllenamentiClient({
  inCorso,
  upcoming,
  past,
  registeredSessionIds,
  seasonAttended,
  seasonTotal,
  isLoggedIn,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  past: SessionWithCount[];
  registeredSessionIds: string[];
  seasonAttended: number;
  seasonTotal: number;
  isLoggedIn: boolean;
}) {
  const [showPast, setShowPast] = useState(false);
  const [pastPage, setPastPage] = useState(1);

  const registeredSet = new Set(registeredSessionIds);
  const [nextSession, ...restUpcoming] = upcoming;
  const monthGroups = groupByMonth(restUpcoming);
  const pastVisible = past.slice(0, pastPage * PAST_PAGE_SIZE);
  const hasMorePast = pastVisible.length < past.length;

  const attendancePct =
    seasonTotal > 0 ? Math.round((seasonAttended / seasonTotal) * 100) : 0;

  return (
    <Box>
      {/* ── Presenze stagione ── */}
      {isLoggedIn && seasonTotal > 0 && (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ px: 2.5, py: 1.75, mb: 3, borderRadius: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <SportsBasketballIcon
                sx={{ fontSize: 15, color: "primary.main", opacity: 0.8 }}
              />
              <Typography variant="body2" fontWeight={600}>
                Presenze stagione
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>
              {seasonAttended}/{seasonTotal}
              <Typography
                component="span"
                variant="caption"
                color="text.disabled"
                sx={{ ml: 0.5 }}
              >
                ({attendancePct}%)
              </Typography>
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={attendancePct}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": {
                borderRadius: 3,
                bgcolor:
                  attendancePct >= 75
                    ? "success.main"
                    : attendancePct >= 50
                      ? "primary.main"
                      : "warning.main",
              },
            }}
          />
        </Paper>
      )}

      {/* ── In corso ── */}
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#2E7D32",
                flexShrink: 0,
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                  "70%": { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
                },
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <Typography
              variant="overline"
              fontWeight={700}
              sx={{ letterSpacing: "0.1em", color: "#2E7D32" }}
            >
              In corso
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {inCorso.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                live
                isRegistered={registeredSet.has(s.id)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Prossimi ── */}
      {upcoming.length === 0 ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 4, textAlign: "center", mb: 3, borderStyle: "dashed" }}
        >
          <Typography color="text.secondary">
            Nessun allenamento programmato.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Hero — prossimo */}
          <HeroCard
            session={nextSession}
            isRegistered={registeredSet.has(nextSession.id)}
          />

          {/* Gruppi per mese */}
          {monthGroups.map(([month, sessions]) => (
            <Box key={month} sx={{ mb: 2.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 1,
                }}
              >
                <Typography
                  variant="overline"
                  fontWeight={700}
                  sx={{
                    color: "text.disabled",
                    letterSpacing: "0.1em",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {month}
                </Typography>
                <Divider sx={{ flex: 1 }} />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {sessions.length}{" "}
                  {sessions.length === 1 ? "allenamento" : "allenamenti"}
                </Typography>
              </Box>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: 2, overflow: "hidden" }}
              >
                {sessions.map((s, i) => (
                  <Box key={s.id}>
                    {i > 0 && <Divider />}
                    <SessionRow
                      session={s}
                      isRegistered={registeredSet.has(s.id)}
                    />
                  </Box>
                ))}
              </Paper>
            </Box>
          ))}
        </>
      )}

      {/* ── Passati ── */}
      {past.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            endIcon={showPast ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => {
              setShowPast((v) => !v);
              setPastPage(1);
            }}
            sx={{ color: "text.secondary", fontWeight: 600, mb: showPast ? 1.5 : 0 }}
          >
            Allenamenti passati ({past.length})
          </Button>

          {showPast && (
            <>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: 2, overflow: "hidden" }}
              >
                {pastVisible.map((s, i) => (
                  <Box key={s.id}>
                    {i > 0 && <Divider />}
                    <SessionRow session={s} muted />
                  </Box>
                ))}
              </Paper>

              {hasMorePast && (
                <Box sx={{ textAlign: "center", mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setPastPage((p) => p + 1)}
                    sx={{ color: "text.secondary" }}
                  >
                    Carica altri{" "}
                    {Math.min(PAST_PAGE_SIZE, past.length - pastVisible.length)}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import HistoryIcon from "@mui/icons-material/History";
import EmptyState from "@/components/common/EmptyState";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import type { Locale } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import SessionCard, { type SessionWithCount } from "@/components/training/SessionCard";
import SessionHeroCard from "@/components/training/SessionHeroCard";
import TeamsModal from "@/components/training/TeamsModal";

import { sessionEndDate } from "@/lib/dateUtils";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { TEAM_META } from "@/lib/constants";
import { TYPE_SCALE } from "@/lib/typeScale";

function findMyTeam(teams: SessionWithCount["teams"], registrationId: string | null) {
  if (!teams || !registrationId) return null;
  return (
    TEAM_META.find((t) => {
      const list = teams[t.key];
      return list?.some((a) => a.id === registrationId);
    }) ?? null
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByMonth(
  sessions: SessionWithCount[],
  dateLocale: Locale
): [string, SessionWithCount[]][] {
  const map = new Map<string, SessionWithCount[]>();
  for (const s of sessions) {
    const key = format(new Date(s.date), "MMMM yyyy", { locale: dateLocale });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}

function groupByYear(sessions: SessionWithCount[]): [string, SessionWithCount[]][] {
  const map = new Map<string, SessionWithCount[]>();
  for (const s of sessions) {
    const key = format(new Date(s.date), "yyyy");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}

// ── Session row (lista compatta) ──────────────────────────────────────────────

function SessionRow({
  session: s,
  isRegistered = false,
  myRegistrationId = null,
  muted = false,
  isStaff = false,
}: {
  session: SessionWithCount;
  isRegistered?: boolean;
  myRegistrationId?: string | null;
  muted?: boolean;
  isStaff?: boolean;
}) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  const { teamColorLabel } = useEntityLabels();
  const [teamsOpen, setTeamsOpen] = useState(false);
  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const myTeam = findMyTeam(s.teams, myRegistrationId);
  const sessEnd = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const isPast = new Date() > sessEnd;
  const isRegOpen = s.registrationOpen === true;
  const wasOpened = !!s.registrationOpenedAt;
  const showInArrivo = !isRegOpen && !wasOpened && !isPast && !muted;
  const showChiuse = !isRegOpen && (wasOpened || isPast) && !muted;

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2 },
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          opacity: muted ? 0.62 : 1,
          "&:hover": { bgcolor: "action.hover" },
          transition: "background-color 0.15s",
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

        {/* Giorno numero + abbreviazione */}
        <Box
          sx={{
            width: { xs: 36, sm: 44 },
            textAlign: "center",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "text.secondary",
              fontWeight: 700,
              lineHeight: 1,
              textTransform: "uppercase",
              fontSize: TYPE_SCALE.xs,
              letterSpacing: "0.05em",
            }}
          >
            {format(date, "EEE", { locale: dateLocale })}
          </Typography>
          <Typography
            fontWeight={800}
            sx={{ lineHeight: 1.1, fontSize: { xs: TYPE_SCALE.lg, sm: TYPE_SCALE.xl } }}
          >
            {format(date, "d")}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "text.secondary",
              fontWeight: 700,
              lineHeight: 1,
              textTransform: "uppercase",
              fontSize: TYPE_SCALE.xs,
              letterSpacing: "0.05em",
            }}
          >
            {format(date, "MMM", { locale: dateLocale })}
          </Typography>
        </Box>

        {/* Titolo + orario */}
        <Box sx={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1, pointerEvents: "none" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {s.title}
            </Typography>
            {showInArrivo && (
              <Chip
                icon={
                  <HourglassEmptyIcon
                    sx={{ fontSize: "0.75rem !important", color: "common.white" }}
                  />
                }
                label={t("comingSoon")}
                size="small"
                sx={{
                  bgcolor: "status.pending",
                  color: "common.white",
                  fontWeight: 700,
                  fontSize: TYPE_SCALE.xs,
                  height: 20,
                  "& .MuiChip-icon": { ml: 0.5 },
                }}
              />
            )}
            {showChiuse && (
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.7rem !important", color: "common.white" }} />}
                label={t("registrationsClosed")}
                size="small"
                sx={{
                  bgcolor: "status.closed",
                  color: "common.white",
                  fontWeight: 700,
                  fontSize: TYPE_SCALE.xs,
                  height: 20,
                  "& .MuiChip-icon": { ml: 0.5 },
                }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              {format(date, "HH:mm")}
              {endTime && `–${format(endTime, "HH:mm")}`}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
              <GroupsIcon sx={{ fontSize: 11, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {s._count.registrations}
              </Typography>
            </Box>
            {((s.allowedRoles && s.allowedRoles.length > 0) || s.restrictTeamId) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <LockIcon sx={{ fontSize: 10, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {s.restrictTeam
                    ? `${t("onlyTeam", { team: s.restrictTeam.name })}${s.allowedRoles?.length ? ` · ${s.allowedRoles.map((r) => `R${r}`).join(", ")}` : ""}`
                    : s.allowedRoles!.map((r) => `R${r}`).join(", ")}
                </Typography>
              </Box>
            )}
            {s.restrictTeamId && s.openRoles && s.openRoles.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <LockOpenIcon sx={{ fontSize: 10, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  {t("rolesOpenShort", { roles: s.openRoles.map((r) => `R${r}`).join(", ") })}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Icone di stato + controlli — sopra il link */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          {isRegistered && myTeam ? (
            <Chip
              label={teamColorLabel(myTeam.key)}
              size="small"
              sx={{
                bgcolor: myTeam.color,
                color: "common.white",
                fontWeight: 700,
                fontSize: TYPE_SCALE.xs,
                height: 20,
              }}
            />
          ) : isRegistered ? (
            <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
          ) : null}

          {/* Basketball icon: cliccabile se ci sono squadre, altrimenti icona creazione per staff */}
          {s.teams ? (
            <IconButton
              size="small"
              aria-label="Vedi squadre"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setTeamsOpen(true);
              }}
              sx={{ color: "primary.main", opacity: 0.7, p: 0.25, "&:hover": { opacity: 1 } }}
            >
              <SportsBasketballIcon sx={{ fontSize: 16 }} />
            </IconButton>
          ) : null}

          {/* Lo staff gestisce iscrizioni, squadre e modifiche dall'admin (UX-14). */}
          {isStaff ? (
            <Tooltip title="Gestisci in admin">
              <IconButton
                href={`/admin/allenamenti?apri=${s.id}`}
                aria-label={`Gestisci ${s.title} in admin`}
                sx={{ color: "text.secondary", mr: -0.5, position: "relative", zIndex: 1 }}
              >
                <SettingsIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <ChevronRightIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          )}
        </Box>
      </Box>

      {s.teams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={s.title}
          sessionDate={s.date}
          sessionEndTime={s.endTime}
          teamA={s.teams.teamA}
          teamB={s.teams.teamB}
          teamC={s.teams.teamC}
          coaches={s.teams.coaches}
        />
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function deriveSections(sessions: SessionWithCount[], now: Date) {
  const asc = (a: SessionWithCount, b: SessionWithCount) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();
  const desc = (a: SessionWithCount, b: SessionWithCount) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();

  const inCorso = sessions
    .filter((s) => {
      const start = new Date(s.date);
      const end = sessionEndDate(start, s.endTime ? new Date(s.endTime) : null);
      return now >= start && now <= end;
    })
    .sort(asc);

  const upcoming = sessions.filter((s) => new Date(s.date) > now).sort(asc);

  const past = sessions
    .filter((s) => {
      const end = sessionEndDate(new Date(s.date), s.endTime ? new Date(s.endTime) : null);
      return end < now;
    })
    .sort(desc);

  return { inCorso, upcoming, past };
}

export default function AllenamentiClient({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  past: initPast,
  registeredSessionIds,
  registrationIdBySession = {},
  seasonAttended,
  seasonTotal,
  isLoggedIn,
  isStaff = false,
  previousSeasonsCount = 0,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  past: SessionWithCount[];
  registeredSessionIds: string[];
  registrationIdBySession?: Record<string, string>;
  seasonAttended: number;
  seasonTotal: number;
  isLoggedIn: boolean;
  isStaff?: boolean;
  previousSeasonsCount?: number;
}) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openYears, setOpenYears] = useState<Set<string>>(
    () => new Set([format(new Date(), "yyyy")])
  );

  function toggleYear(year: string) {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  const [openMonths, setOpenMonths] = useState<Set<string>>(
    () => new Set([format(new Date(), "MMMM yyyy", { locale: dateLocale })])
  );

  function toggleMonth(month: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  const [activeTab, setActiveTab] = useState(0);

  // Local sessions state so we can optimistically update after mutations
  const initialSessions = useMemo(
    () => [...initInCorso, ...initUpcoming, ...initPast],
    [initInCorso, initUpcoming, initPast]
  );
  const [sessions, setSessions] = useState<SessionWithCount[]>(initialSessions);

  // I dati dal server cambiano quando cambia la query (?all=1) o dopo un
  // router.refresh(): risincronizziamo lo stato locale, altrimenti la lista
  // resterebbe quella del primo render (serviva un refresh manuale).
  const initialIds = initialSessions.map((s) => s.id).join(",");
  const [syncedIds, setSyncedIds] = useState(initialIds);
  if (initialIds !== syncedIds) {
    setSyncedIds(initialIds);
    setSessions(initialSessions);
  }

  const now = new Date();
  const { inCorso, upcoming, past } = deriveSections(sessions, now);

  // Vecchi link ?edit=[id] (calendario, segnalibri): la modifica ora sta in
  // admin (UX-14).
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) router.replace(`/admin/allenamenti?modifica=${editId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registeredSet = new Set(registeredSessionIds);
  const [firstSession, secondSession, ...remainingUpcoming] = upcoming;

  const showSecondHero =
    !!secondSession && isSameDay(new Date(firstSession.date), new Date(secondSession.date));

  const heroSessions = showSecondHero ? [firstSession, secondSession] : [firstSession];
  const restUpcoming = showSecondHero
    ? remainingUpcoming
    : secondSession
      ? [secondSession, ...remainingUpcoming]
      : remainingUpcoming;
  const futureYearGroups = groupByYear(restUpcoming);
  const pastYearGroups = groupByYear(past);

  return (
    <Box>
      {/* ── Toolbar staff ── */}
      {isStaff && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            href="/admin/allenamenti"
            variant="outlined"
            startIcon={<SettingsIcon />}
            sx={{ minHeight: 44 }}
          >
            Gestisci allenamenti
          </Button>
        </Box>
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
                bgcolor: "status.live",
                flexShrink: 0,
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                  "70%": { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
                },
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <Typography variant="overline" sx={{ color: "status.liveText" }}>
              {t("live")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {inCorso.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                live
                isRegistered={registeredSet.has(s.id)}
                myRegistrationId={registrationIdBySession[s.id] ?? null}
                isStaff={isStaff}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Hero prossimi ── */}
      {upcoming.length > 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              {t("next")}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: showSecondHero ? { xs: "1fr", sm: "1fr 1fr" } : "1fr",
              gap: 2,
              mb: 3,
            }}
          >
            {heroSessions.map((s) => (
              <SessionHeroCard
                key={s.id}
                session={s}
                isRegistered={registeredSet.has(s.id)}
                myRegistrationId={registrationIdBySession[s.id] ?? null}
                isStaff={isStaff}
              />
            ))}
          </Box>
        </>
      )}

      {/* ── Schede Futuri / Passati ── */}
      <Box>
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}
        >
          <Tab
            label={
              restUpcoming.length > 0
                ? t("upcomingCount", { count: restUpcoming.length })
                : t("upcoming")
            }
            sx={{ fontWeight: 700, textTransform: "none", fontSize: TYPE_SCALE.sm }}
          />
          <Tab
            label={past.length > 0 ? t("pastCount", { count: past.length }) : t("past")}
            sx={{ fontWeight: 700, textTransform: "none", fontSize: TYPE_SCALE.sm }}
          />
        </Tabs>

        {/* Tab Futuri */}
        {activeTab === 0 && (
          <Box>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<EventBusyIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
                title={t("none")}
                message={t("noneDesc")}
              />
            ) : restUpcoming.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {t("noneMore")}
              </Typography>
            ) : (
              futureYearGroups.map(([year, yearSessions]) => {
                const isYearOpen = openYears.has(year);
                return (
                  <Box key={year} sx={{ mb: 2 }}>
                    <Box
                      onClick={() => toggleYear(year)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: isYearOpen ? 1.5 : 0,
                        cursor: "pointer",
                        py: 0.5,
                        "&:hover .year-label": { color: "text.primary" },
                      }}
                    >
                      <Typography
                        className="year-label"
                        fontWeight={800}
                        sx={{
                          fontSize: TYPE_SCALE.lg,
                          lineHeight: 1,
                          color: isYearOpen ? "text.primary" : "text.secondary",
                          transition: "color 0.15s",
                        }}
                      >
                        {year}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {t("sessionCount", { count: yearSessions.length })}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={isYearOpen ? t("collapseYear") : t("expandYear")}
                        sx={{ color: "text.secondary", p: 0.25 }}
                      >
                        {isYearOpen ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>

                    <Collapse in={isYearOpen}>
                      <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                        {groupByMonth(yearSessions, dateLocale).map(([month, monthSessions]) => {
                          const isOpen = openMonths.has(month);
                          return (
                            <Box key={month} sx={{ mb: 1.5 }}>
                              <Box
                                onClick={() => toggleMonth(month)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  mb: isOpen ? 1 : 0,
                                  cursor: "pointer",
                                  py: 0.25,
                                  "&:hover .month-label": { color: "text.primary" },
                                }}
                              >
                                <Typography
                                  className="month-label"
                                  variant="overline"
                                  sx={{
                                    color: isOpen ? "text.primary" : "text.secondary",
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    transition: "color 0.15s",
                                  }}
                                >
                                  {month}
                                </Typography>
                                <Divider sx={{ flex: 1 }} />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {t("sessionCount", { count: monthSessions.length })}
                                </Typography>
                                <IconButton
                                  size="small"
                                  aria-label={isOpen ? t("collapseMonth") : t("expandMonth")}
                                  sx={{ color: "text.secondary", p: 0.25 }}
                                >
                                  {isOpen ? (
                                    <ExpandLessIcon fontSize="small" />
                                  ) : (
                                    <ExpandMoreIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Box>
                              <Collapse in={isOpen}>
                                <Paper
                                  elevation={0}
                                  variant="outlined"
                                  sx={{ borderRadius: 2, overflow: "hidden" }}
                                >
                                  {monthSessions.map((s, i) => (
                                    <Box key={s.id}>
                                      {i > 0 && <Divider />}
                                      <SessionRow
                                        session={s}
                                        isRegistered={registeredSet.has(s.id)}
                                        myRegistrationId={registrationIdBySession[s.id] ?? null}
                                        isStaff={isStaff}
                                      />
                                    </Box>
                                  ))}
                                </Paper>
                              </Collapse>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })
            )}
          </Box>
        )}

        {/* Tab Passati */}
        {activeTab === 1 && (
          <Box>
            {pastYearGroups.length === 0 ? (
              <EmptyState
                icon={<HistoryIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
                title={t("nonePast")}
                message={t("nonePastDesc")}
              />
            ) : (
              pastYearGroups.map(([year, yearSessions]) => {
                const isYearOpen = openYears.has(year);
                return (
                  <Box key={year} sx={{ mb: 2 }}>
                    {/* Anno — accordion */}
                    <Box
                      onClick={() => toggleYear(year)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: isYearOpen ? 1.5 : 0,
                        cursor: "pointer",
                        py: 0.5,
                        "&:hover .year-label": { color: "text.primary" },
                      }}
                    >
                      <Typography
                        className="year-label"
                        fontWeight={800}
                        sx={{
                          fontSize: TYPE_SCALE.lg,
                          lineHeight: 1,
                          color: isYearOpen ? "text.primary" : "text.secondary",
                          transition: "color 0.15s",
                        }}
                      >
                        {year}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {t("sessionCount", { count: yearSessions.length })}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={isYearOpen ? t("collapseYear") : t("expandYear")}
                        sx={{ color: "text.secondary", p: 0.25 }}
                      >
                        {isYearOpen ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>

                    <Collapse in={isYearOpen}>
                      <Box sx={{ pl: { xs: 0, sm: 2 } }}>
                        {groupByMonth(yearSessions, dateLocale).map(([month, monthSessions]) => {
                          const isOpen = openMonths.has(month);
                          return (
                            <Box key={month} sx={{ mb: 1.5 }}>
                              <Box
                                onClick={() => toggleMonth(month)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  mb: isOpen ? 1 : 0,
                                  cursor: "pointer",
                                  py: 0.25,
                                  "&:hover .month-label": { color: "text.primary" },
                                }}
                              >
                                <Typography
                                  className="month-label"
                                  variant="overline"
                                  sx={{
                                    color: isOpen ? "text.primary" : "text.secondary",
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    transition: "color 0.15s",
                                  }}
                                >
                                  {month}
                                </Typography>
                                <Divider sx={{ flex: 1 }} />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {t("sessionCount", { count: monthSessions.length })}
                                </Typography>
                                <IconButton
                                  size="small"
                                  aria-label={isOpen ? t("collapseMonth") : t("expandMonth")}
                                  sx={{ color: "text.secondary", p: 0.25 }}
                                >
                                  {isOpen ? (
                                    <ExpandLessIcon fontSize="small" />
                                  ) : (
                                    <ExpandMoreIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Box>
                              <Collapse in={isOpen}>
                                <Paper
                                  elevation={0}
                                  variant="outlined"
                                  sx={{ borderRadius: 2, overflow: "hidden" }}
                                >
                                  {monthSessions.map((s, i) => (
                                    <Box key={s.id}>
                                      {i > 0 && <Divider />}
                                      <SessionRow session={s} muted isStaff={isStaff} />
                                    </Box>
                                  ))}
                                </Paper>
                              </Collapse>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })
            )}
            {/* Le stagioni precedenti non vengono caricate di default */}
            {previousSeasonsCount > 0 && (
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Button
                  href="/allenamenti?all=1"
                  size="small"
                  variant="text"
                  sx={{ fontWeight: 600 }}
                >
                  {t("showPreviousSeasons", { count: previousSeasonsCount })}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

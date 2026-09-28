"use client";
import type { ReactNode } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import TrainingListRow from "@/components/training/TrainingListRow";
import TeamColorDot from "@/components/teams/TeamColorDot";
import type { SessionWithCount } from "@/components/training/SessionCard";
import { groupUpcoming, type UpcomingGroup } from "@/lib/trainingList";
import { TEAM_META } from "@/lib/constants";

interface UpcomingTrainingsListProps {
  sessions: SessionWithCount[];
  registeredSessionIds: Set<string>;
  registrationIdBySession: Record<string, string>;
  isStaff: boolean;
}

function findMyTeam(teams: SessionWithCount["teams"], registrationId: string | undefined) {
  if (!teams || !registrationId) return null;
  return TEAM_META.find((t) => teams[t.key]?.some((a) => a.id === registrationId)) ?? null;
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** Stato dell'iscrizione a destra della riga: la cosa che chi guarda deve sapere. */
function RegistrationStatus({
  session: s,
  registered,
  registrationId,
}: {
  session: SessionWithCount;
  registered: boolean;
  registrationId: string | undefined;
}) {
  const t = useTranslations("trainings");
  const { teamColorLabel } = useEntityLabels();
  const myTeam = registered ? findMyTeam(s.teams, registrationId) : null;

  if (myTeam) {
    return (
      <Chip
        label={teamColorLabel(myTeam.key)}
        size="small"
        sx={{ bgcolor: myTeam.color, color: "common.white", fontWeight: 700 }}
      />
    );
  }
  if (registered) {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label={t("rowRegistered")}
        size="small"
        color="success"
        sx={{ fontWeight: 700 }}
      />
    );
  }
  if (s.registrationOpen) {
    return (
      <Chip
        label={t("rowRegister")}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700, color: "primary.onLight", borderColor: "primary.main" }}
      />
    );
  }
  return (
    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
      {s.registrationOpenedAt ? t("rowClosed") : t("rowOpensSoon")}
    </Typography>
  );
}

/** Metadati comuni: orario, iscritti, restrizione con il pallino squadra. */
export function useTrainingMeta() {
  const t = useTranslations("trainings");
  const tRoles = useTranslations("roles");

  return function meta(s: SessionWithCount, count: ReactNode): ReactNode[] {
    const date = new Date(s.date);
    const end = s.endTime ? new Date(s.endTime) : null;
    const parts: ReactNode[] = [
      `${format(date, "HH:mm")}${end ? `–${format(end, "HH:mm")}` : ""}`,
      count,
    ];
    const roles = s.allowedRoles?.length
      ? s.allowedRoles.map((r) => tRoles("role", { n: r })).join(", ")
      : null;
    if (s.restrictTeam) {
      parts.push(
        <>
          {t.rich("onlyTeam", {
            team: s.restrictTeam.name,
            name: (chunks) => (
              <>
                <TeamColorDot color={s.restrictTeam?.color} size={7} />
                {chunks}
              </>
            ),
          })}
          {roles ? `, ${roles}` : ""}
        </>
      );
      if (s.openRoles?.length) {
        parts.push(t("rolesOpenShort", { roles: s.openRoles.map((r) => `R${r}`).join(", ") }));
      }
    } else if (roles) {
      parts.push(roles);
    }
    return parts;
  };
}

export default function UpcomingTrainingsList({
  sessions,
  registeredSessionIds,
  registrationIdBySession,
  isStaff,
}: UpcomingTrainingsListProps) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  const meta = useTrainingMeta();

  function groupLabel(group: UpcomingGroup): string {
    if (group.kind === "thisWeek") return t("thisWeek");
    if (group.kind === "nextWeek") return t("nextWeek");
    return capitalize(
      format(group.month, group.showYear ? "LLLL yyyy" : "LLLL", { locale: dateLocale })
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {groupUpcoming(sessions).map(({ group, items }) => (
        <Box key={items[0].id} component="section">
          <Typography component="h3" variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {groupLabel(group)}
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            {items.map((s, i) => (
              <Box key={s.id} sx={{ borderTop: i > 0 ? 1 : 0, borderColor: "divider" }}>
                <TrainingListRow
                  session={s}
                  isStaff={isStaff}
                  meta={meta(s, t("registeredCount", { count: s._count.registrations }))}
                  trailing={
                    <RegistrationStatus
                      session={s}
                      registered={registeredSessionIds.has(s.id)}
                      registrationId={registrationIdBySession[s.id]}
                    />
                  }
                />
              </Box>
            ))}
          </Paper>
        </Box>
      ))}
    </Box>
  );
}

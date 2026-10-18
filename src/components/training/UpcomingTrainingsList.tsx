"use client";
import type { ReactNode } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import TrainingListRow from "@/components/training/TrainingListRow";
import TeamColorDot from "@/components/teams/TeamColorDot";
import type { SessionWithCount } from "@/components/training/SessionCard";
import { groupUpcoming, type UpcomingGroup } from "@/lib/trainingList";
import { familyTeams, type FamilyRegistration } from "@/lib/trainingTeams";
import type { FamilyRegsBySession } from "@/lib/familyRegistrations";
import FamilyTeamChips from "@/components/training/FamilyTeamChips";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface UpcomingTrainingsListProps {
  sessions: SessionWithCount[];
  registeredSessionIds: Set<string>;
  /** Iscrizioni proprie e dei figli per allenamento (squadra di ciascuno). */
  familyRegsBySession: FamilyRegsBySession;
  isStaff: boolean;
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** Stato dell'iscrizione a destra della riga: la cosa che chi guarda deve sapere. */
function RegistrationStatus({
  session: s,
  registered,
  familyRegistrations = [],
}: {
  session: SessionWithCount;
  registered: boolean;
  familyRegistrations?: FamilyRegistration[];
}) {
  const t = useTranslations("trainings");
  // La squadra di chi guarda e dei figli ("Neri", "Luca · Neri").
  const myTeams = familyTeams(familyRegistrations, s.teams);

  if (myTeams.length > 0) return <FamilyTeamChips teams={myTeams} />;
  if (registered) {
    return (
      <Chip icon={<CheckCircleIcon />} label={t("rowRegistered")} size="small" color="success" />
    );
  }
  if (s.registrationOpen) {
    // Testo, non un chip arancione (UX-43): sembrava un bottone, ma il link e'
    // la riga intera. Stato neutro (UX-29); l'inchiostro pieno lo distingue
    // da "in arrivo" e "chiuse".
    return (
      <Typography
        variant="caption"
        color="text.primary"
        fontWeight={FONT_WEIGHT.semibold}
        sx={{ whiteSpace: "nowrap" }}
      >
        {t("rowOpen")}
      </Typography>
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
  familyRegsBySession,
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
          <Paper variant="outlined" sx={{ borderRadius: RADIUS.lg, overflow: "hidden" }}>
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
                      familyRegistrations={familyRegsBySession[s.id]}
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

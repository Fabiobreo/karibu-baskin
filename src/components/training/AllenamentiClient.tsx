"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography } from "@mui/material";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { isSameDay } from "date-fns";
import { useTranslations } from "next-intl";
import EmptyState from "@/components/common/EmptyState";
import StatusPill from "@/components/common/StatusPill";
import SessionCard, { type SessionWithCount } from "@/components/training/SessionCard";
import SessionHeroCard from "@/components/training/SessionHeroCard";
import UpcomingTrainingsList from "@/components/training/UpcomingTrainingsList";
import PastTrainingsSection, {
  type PastTraining,
} from "@/components/training/PastTrainingsSection";

interface AllenamentiClientProps {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  past: PastTraining[];
  /** Stagioni con allenamenti, dalla piu' recente; `season` e' quella mostrata. */
  seasons: string[];
  season: string;
  /** Allenamenti della stagione a cui chi guarda c'era; null senza accesso. */
  attendedCount: number | null;
  registeredSessionIds: string[];
  registrationIdBySession?: Record<string, string>;
  isStaff?: boolean;
}

export default function AllenamentiClient({
  inCorso,
  upcoming,
  past,
  seasons,
  season,
  attendedCount,
  registeredSessionIds,
  registrationIdBySession = {},
  isStaff = false,
}: AllenamentiClientProps) {
  const t = useTranslations("trainings");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Vecchi link ?edit=[id] (calendario, segnalibri): la modifica ora sta in
  // admin (UX-14).
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) router.replace(`/admin/allenamenti?modifica=${editId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registeredSet = new Set(registeredSessionIds);
  const [firstSession, secondSession, ...remainingUpcoming] = upcoming;

  // Due allenamenti nello stesso giorno stanno affiancati in testa.
  const showSecondHero =
    !!secondSession && isSameDay(new Date(firstSession.date), new Date(secondSession.date));
  const heroSessions = firstSession
    ? showSecondHero
      ? [firstSession, secondSession]
      : [firstSession]
    : [];
  const restUpcoming = showSecondHero
    ? remainingUpcoming
    : secondSession
      ? [secondSession, ...remainingUpcoming]
      : remainingUpcoming;

  return (
    <Box>
      {/* ── In corso ── */}
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {/* In corso: pastiglia invertita con pallino pulsante, niente verde (UX-29). */}
          <Box sx={{ mb: 1.5 }}>
            <StatusPill label={t("live")} pulse />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {inCorso.map((s) => (
              <SessionCard
                headingComponent="h2"
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

      {/* ── Prossimi ── */}
      <Box component="section" aria-labelledby="prossimi-title">
        <Typography id="prossimi-title" component="h2" variant="h5" sx={{ mb: 1.5 }}>
          {t("next")}
        </Typography>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<EventBusyIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("none")}
            message={t("noneDesc")}
          />
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: showSecondHero ? { xs: "1fr", sm: "1fr 1fr" } : "1fr",
                gap: 2,
                mb: restUpcoming.length > 0 ? 3 : 0,
              }}
            >
              {heroSessions.map((s) => (
                <SessionHeroCard
                  headingComponent="h3"
                  key={s.id}
                  session={s}
                  isRegistered={registeredSet.has(s.id)}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                />
              ))}
            </Box>
            {restUpcoming.length > 0 && (
              <UpcomingTrainingsList
                sessions={restUpcoming}
                registeredSessionIds={registeredSet}
                registrationIdBySession={registrationIdBySession}
                isStaff={isStaff}
              />
            )}
          </>
        )}
      </Box>

      {/* ── Passati ── */}
      <PastTrainingsSection
        sessions={past}
        seasons={seasons}
        season={season}
        attendedCount={attendedCount}
        isStaff={isStaff}
      />
    </Box>
  );
}

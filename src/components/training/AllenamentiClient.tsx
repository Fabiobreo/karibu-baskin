"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { isSameDay } from "date-fns";
import { useTranslations } from "next-intl";
import EmptyState from "@/components/common/EmptyState";
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

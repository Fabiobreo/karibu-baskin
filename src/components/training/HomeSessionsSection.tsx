"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Grid2 as Grid, Typography, Button } from "@mui/material";
import { useTranslations } from "next-intl";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import SessionCard, { type SessionWithCount } from "@/components/training/SessionCard";
import SessionHeroCard from "@/components/training/SessionHeroCard";
import { useToast } from "@/context/ToastContext";
import PickTeamsDialog from "@/components/training/PickTeamsDialog";

export default function HomeSessionsSection({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  registrationIdBySession,
  isStaff,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  registrationIdBySession: Record<string, string>;
  isStaff: boolean;
}) {
  const t = useTranslations("trainings");
  const router = useRouter();
  const { showToast } = useToast();

  const [inCorso, setInCorso] = useState(initInCorso);
  const [upcoming, setUpcoming] = useState(initUpcoming);

  const [generating, setGenerating] = useState<string | null>(null);
  const [removingTeams, setRemovingTeams] = useState<string | null>(null);
  const [teamPickSession, setTeamPickSession] = useState<SessionWithCount | null>(null);

  function updateSession(id: string, patch: Partial<SessionWithCount>) {
    const apply = (list: SessionWithCount[]) =>
      list.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setInCorso(apply);
    setUpcoming(apply);
  }

  async function handleGenerateTeams(s: SessionWithCount, numTeams: 2 | 3) {
    setTeamPickSession(null);
    setGenerating(s.id);
    try {
      const res = await fetch(`/api/teams/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      });
      if (res.ok) {
        const newTeams = await res.json();
        updateSession(s.id, { teams: newTeams });
        showToast({ message: `${numTeams} squadre create`, severity: "success" });
        router.refresh();
      } else {
        showToast({ message: "Errore nella creazione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setGenerating(null);
    }
  }

  async function handleRemoveTeams(s: SessionWithCount) {
    setRemovingTeams(s.id);
    try {
      const res = await fetch(`/api/teams/${s.id}`, { method: "DELETE" });
      if (res.ok) {
        updateSession(s.id, { teams: null });
        showToast({ message: "Squadre rimosse", severity: "success" });
        router.refresh();
      } else {
        showToast({ message: "Errore nella rimozione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setRemovingTeams(null);
    }
  }

  // Nessun `return null` quando entrambe le liste sono vuote: quel caso ha il
  // suo stato dedicato qui sotto. Uscire in anticipo lasciava vuoto il
  // contenitore #allenamenti, e la CTA della hero ci scorreva sopra.
  return (
    <>
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
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
            <Typography
              variant="overline"
              fontWeight={700}
              sx={{ letterSpacing: "0.1em", color: "status.liveText" }}
            >
              {t("live")}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {inCorso.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: inCorso.length > 1 ? 6 : 12 }}>
                <SessionCard
                  session={s}
                  live
                  isRegistered={!!registrationIdBySession[s.id]}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                  onEdit={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onDelete={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onGenerateTeams={() => setTeamPickSession(s)}
                  onRemoveTeams={() => handleRemoveTeams(s)}
                  generating={generating === s.id}
                  removingTeams={removingTeams === s.id}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Nessun allenamento nella finestra della home (vedi page.tsx). Senza
          questo blocco la sezione spariva del tutto e la CTA "Prossimi
          allenamenti" della hero scorreva verso un contenitore vuoto. */}
      {inCorso.length === 0 && upcoming.length === 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <SportsBasketballIcon sx={{ color: "primary.main", fontSize: 32 }} />
            <Box>
              <Typography
                variant="overline"
                color="primary.onLight"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em", lineHeight: 1 }}
              >
                {t("gym")}
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={800}
                sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
              >
                {t("next")}
              </Typography>
            </Box>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 560 }}>
            {t("homeNoneSoon")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Link href="/contatti">
              <Button variant="contained">{t("homeNoneSoonCta")}</Button>
            </Link>
            <Link href="/calendario">
              <Button variant="outlined">{t("homeSeeCalendar")}</Button>
            </Link>
          </Box>
        </Box>
      )}

      {upcoming.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <SportsBasketballIcon sx={{ color: "primary.main", fontSize: 32 }} />
            <Box>
              <Typography
                variant="overline"
                color="primary.onLight"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em", lineHeight: 1 }}
              >
                {t("gym")}
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={800}
                sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
              >
                {t("next")}
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={2}>
            {upcoming.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: upcoming.length > 1 ? 6 : 12 }}>
                <SessionHeroCard
                  session={s}
                  isRegistered={!!registrationIdBySession[s.id]}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                  onEdit={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onDelete={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onGenerateTeams={() => setTeamPickSession(s)}
                  onRemoveTeams={() => handleRemoveTeams(s)}
                  generating={generating === s.id}
                  removingTeams={removingTeams === s.id}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <PickTeamsDialog
        open={!!teamPickSession}
        sessionTitle={teamPickSession?.title}
        onClose={() => setTeamPickSession(null)}
        onConfirm={(n) => handleGenerateTeams(teamPickSession!, n)}
      />
    </>
  );
}

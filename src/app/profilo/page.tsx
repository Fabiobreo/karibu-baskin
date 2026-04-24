import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Container, Typography, Box, Paper, Avatar, Chip,
  Divider, Stack, Button,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { ROLE_LABELS_IT } from "@/lib/authRoles";
import { ROLE_LABELS, ROLE_COLORS, GENDER_LABELS } from "@/lib/constants";
import type { AppRole } from "@prisma/client";
import ParentChildLinker, { type ChildData } from "@/components/ParentChildLinker";
import NotificationPrefsPanel from "@/components/NotificationPrefsPanel";
import { mergePrefs } from "@/lib/notifPrefs";
import LinkRequestsSection from "@/components/LinkRequestsSection";
import ClaimAnonymousCard from "@/components/ClaimAnonymousCard";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const revalidate = 0;

const APP_ROLE_CHIP_COLOR: Record<AppRole, "default" | "primary" | "success" | "warning" | "error"> = {
  GUEST: "default",
  ATHLETE: "primary",
  PARENT: "success",
  COACH: "warning",
  ADMIN: "error",
};

export default async function ProfiloPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      children: {
        orderBy: { createdAt: "asc" as const },
        select: { id: true, name: true, sportRole: true, sportRoleVariant: true, gender: true, birthDate: true, userId: true, user: { select: { email: true, image: true } }, teamMemberships: { include: { team: { select: { name: true, color: true, season: true } } } } },
      },
      childAccount: {
        select: { _count: { select: { registrations: true } } },
      },
      sportRoleHistory: {
        orderBy: { changedAt: "desc" },
        take: 5,
        select: { sportRole: true, changedAt: true },
      },
      teamMemberships: {
        include: { team: { select: { name: true, color: true, season: true } } },
      },
      registrations: {
        select: { session: { select: { date: true } } },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!user) redirect("/login");

  const effectiveRole = session.user.appRole as AppRole;
  const isParent = effectiveRole === "PARENT" || effectiveRole === "ADMIN";
  const isAthlete = effectiveRole === "ATHLETE" || effectiveRole === "COACH" || effectiveRole === "ADMIN";
  const hasAthleteData = user.sportRole || user.gender || user.birthDate;

  const now = new Date();
  const seasonStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const currentSeason = `${seasonStart}-${String(seasonStart + 1).slice(-2)}`;
  const currentTeams = user.teamMemberships.filter((m) => m.team.season === currentSeason);

  // Presenze per stagione
  const attendanceBySeason = user.registrations.reduce<Record<string, number>>((acc, reg) => {
    const d = new Date(reg.session.date);
    const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
    const season = `${y}-${String(y + 1).slice(-2)}`;
    acc[season] = (acc[season] ?? 0) + 1;
    return acc;
  }, {});
  const attendanceSeasons = Object.entries(attendanceBySeason).sort(([a], [b]) => b.localeCompare(a));

  // Iscrizioni anonime con stesso nome (per proposta di collegamento)
  const anonymousMatches = user.name
    ? await prisma.registration.findMany({
        where: { userId: null, childId: null, name: { equals: user.name.trim(), mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          session: { select: { id: true, date: true, dateSlug: true } },
        },
      })
    : [];

  return (
    <>
      <SiteHeader />
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Il mio profilo
        </Typography>

        {anonymousMatches.length > 0 && (
          <ClaimAnonymousCard
            registrations={anonymousMatches.map((r) => ({
              id: r.id,
              date: r.session.date,
              dateSlug: r.session.dateSlug,
            }))}
          />
        )}

        {/* Card principale */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
            <Avatar src={user.image ?? undefined} sx={{ width: 64, height: 64, fontSize: 22 }}>
              {user.name?.[0] ?? user.email[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>{user.name ?? "—"}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={ROLE_LABELS_IT[user.appRole as AppRole]}
              color={APP_ROLE_CHIP_COLOR[user.appRole as AppRole]}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`${user._count.registrations + (user.childAccount?._count?.registrations ?? 0)} allenamenti`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            {currentTeams.map((m) => (
              <Chip
                key={m.id}
                label={m.team.name}
                size="small"
                sx={{ fontWeight: 700, bgcolor: m.team.color ?? "primary.main", color: "#fff" }}
              />
            ))}
          </Box>

          {user.slug && (
            <Link href={`/giocatori/${user.slug}`} style={{ textDecoration: "none" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ mt: 2, fontSize: "0.78rem", fontWeight: 600 }}
              >
                Vedi il tuo profilo pubblico
              </Button>
            </Link>
          )}

          {user.appRole === "GUEST" && (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1.5 }}>
              Il tuo account è in attesa di approvazione da parte dell&apos;admin.
            </Typography>
          )}
        </Paper>

        {/* Dati atleta */}
        {isAthlete && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Dati atleta
            </Typography>

            {hasAthleteData ? (
              <Stack spacing={2}>
                {user.sportRole && (
                  <Row label="Ruolo Baskin">
                    <Chip
                      label={ROLE_LABELS[user.sportRole as keyof typeof ROLE_LABELS]}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[user.sportRole],
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    />
                  </Row>
                )}
                {user.gender && (
                  <Row label="Genere">
                    <Typography variant="body2">{GENDER_LABELS[user.gender]}</Typography>
                  </Row>
                )}
                {user.birthDate && (
                  <Row label="Data di nascita">
                    <Typography variant="body2">
                      {format(new Date(user.birthDate), "d MMMM yyyy", { locale: it })}
                    </Typography>
                  </Row>
                )}

                {/* Storico ruolo */}
                {user.sportRoleHistory.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                        Storico ruolo sportivo
                      </Typography>
                      <Stack spacing={0.5}>
                        {user.sportRoleHistory.map((h, i) => (
                          <Typography key={i} variant="caption" color="text.secondary">
                            <Box component="span" sx={{ color: ROLE_COLORS[h.sportRole], fontWeight: 700 }}>
                              {ROLE_LABELS[h.sportRole as keyof typeof ROLE_LABELS]}
                            </Box>
                            {" · "}
                            {format(new Date(h.changedAt), "d MMM yyyy", { locale: it })}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  </>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Nessun dato atleta disponibile. L&apos;admin può impostare ruolo, genere e data di nascita.
              </Typography>
            )}
          </Paper>
        )}

        {/* Presenze per stagione */}
        {attendanceSeasons.length > 1 && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Presenze agli allenamenti
            </Typography>
            <Stack spacing={1}>
              {attendanceSeasons.map(([season, count]) => (
                <Row key={season} label={`Stagione ${season}`}>
                  <Chip
                    label={`${count} allenament${count !== 1 ? "i" : "o"}`}
                    size="small"
                    variant={season === currentSeason ? "filled" : "outlined"}
                    color={season === currentSeason ? "primary" : "default"}
                    sx={{ fontWeight: 600 }}
                  />
                </Row>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Richieste di collegamento in attesa */}
        <LinkRequestsSection />

        {/* Notifiche */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Notifiche
          </Typography>
          <NotificationPrefsPanel initialPrefs={mergePrefs(user.notifPrefs)} />
        </Paper>

        {/* Sezione figli (solo PARENT e ADMIN) */}
        {isParent && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              I miei figli
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Collega il profilo di tuo figlio/a per iscriverlo agli allenamenti.
            </Typography>
            <ParentChildLinker
              initialChildren={user.children as ChildData[]}
            />
          </Paper>
        )}
      </Container>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

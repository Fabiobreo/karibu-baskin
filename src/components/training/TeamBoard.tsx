"use client";
import { Box, Typography, Paper, Chip, useMediaQuery, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import { ROLES, TEAM_META, roleColorSx } from "@/lib/constants";
import { bibSurfaceSx } from "@/lib/bib";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import type { TeamAthlete, TeamsData } from "@/components/training/TeamDisplay";
import { BandMark } from "@/components/training/TeamBalanceBar";
import type { LevelBand } from "@/lib/rating/levelBands";

/** Chi guarda ("self") o un suo figlio ("family"), per id dell'iscrizione. */
export type ViewerMarks = Record<string, "self" | "family">;

interface TeamsViewProps {
  teams: TeamsData;
  slugMap?: Record<string, string>;
  viewerMarks?: ViewerMarks;
  /** Fascia di livello per iscrizione: solo per allenatori e admin (UX-54). */
  bands?: Record<string, LevelBand>;
}

type Meta = (typeof TEAM_META)[number];

function teamList(teams: TeamsData): TeamAthlete[][] {
  // Tre squadre se lo dice `numTeams` (anche con la terza ancora vuota, mentre
  // si compongono a mano); dati legacy senza numTeams: solo se teamC ha qualcuno.
  const all: TeamAthlete[][] = [teams.teamA ?? [], teams.teamB ?? []];
  const three = teams.numTeams ? teams.numTeams === 3 : !!teams.teamC?.length;
  if (three) all.push(teams.teamC ?? []);
  return all;
}

/**
 * Le squadre di un allenamento (UX-53). Due squadre: tabellone a specchio a
 * ogni larghezza. Tre: card impilate su telefono, griglia allineata da `md`.
 * Niente tab: le squadre si confrontano solo se si vedono insieme.
 */
export default function TeamsView({
  teams,
  slugMap = {},
  viewerMarks = {},
  bands = {},
}: TeamsViewProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const all = teamList(teams);
  if (all.length === 2) {
    return (
      <MirrorTeamBoard teams={all} slugMap={slugMap} viewerMarks={viewerMarks} bands={bands} />
    );
  }
  return isDesktop ? (
    <AlignedTeamGrid teams={all} slugMap={slugMap} viewerMarks={viewerMarks} bands={bands} />
  ) : (
    <StackedTeamCards teams={all} slugMap={slugMap} viewerMarks={viewerMarks} bands={bands} />
  );
}

// ── Pezzi comuni ──────────────────────────────────────────────────────────────

/** Nome di un atleta: link al profilo se c'è, "Tu"/"Famiglia" per chi guarda. */
function AthleteName({
  athlete,
  slug,
  mark,
  band,
  align = "left",
}: {
  athlete: TeamAthlete;
  slug?: string;
  mark?: "self" | "family";
  band?: LevelBand;
  align?: "left" | "right";
}) {
  const t = useTranslations("trainings");
  return (
    <Box
      sx={{
        minHeight: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        flexWrap: "wrap",
        columnGap: 0.75,
        textAlign: align,
        ...(mark && {
          bgcolor: "action.hover",
          borderRadius: RADIUS.sm,
          px: 0.75,
          mx: -0.75,
        }),
      }}
    >
      {/* Nome e fascia sulla stessa riga: va a capo il nome, il segno resta accanto. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
        <Typography
          variant="body2"
          component="span"
          // Nomi interi che vanno a capo: mai troncati (per i genitori il cognome conta).
          sx={{
            minWidth: 0,
            wordBreak: "break-word",
            fontWeight: slug ? FONT_WEIGHT.semibold : undefined,
          }}
        >
          {slug ? (
            <Link href={`/giocatori/${slug}`} style={{ color: "inherit", textDecoration: "none" }}>
              {athlete.name}
            </Link>
          ) : (
            athlete.name
          )}
        </Typography>
        {band && <BandMark band={band} />}
      </Box>
      {mark && (
        <Typography
          variant="caption"
          component="span"
          sx={{
            px: 0.75,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: RADIUS.sm,
            color: "text.secondary",
            lineHeight: 1.5,
          }}
        >
          {mark === "self" ? t("viewerSelf") : t("viewerFamily")}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Nome della squadra e, sotto, il numero di atleti, sulla fascia della
 * casacca. Su due righe: a 360 px "Arancioni · 7" su una sola andava a capo
 * a metà.
 */
function TeamHeading({ meta, count }: { meta: Meta; count: number }) {
  const t = useTranslations("trainings");
  const { teamColorLabel } = useEntityLabels();
  return (
    <Typography component="h3" variant="h6" sx={{ color: "inherit", lineHeight: 1.25 }}>
      {teamColorLabel(meta.key)}
      <Box component="span" sx={{ display: "block", typography: "caption", color: "inherit" }}>
        {t("athletes", { count })}
      </Box>
    </Typography>
  );
}

// ── 2 squadre: tabellone a specchio ───────────────────────────────────────────

/**
 * Prima squadra a sinistra, ruolo al centro, seconda a destra: una riga per
 * ruolo, così il bilanciamento si legge senza etichette. Nel DOM c'è una
 * squadra intera e poi l'altra (i lettori di schermo non leggono "Luca, 5,
 * Marco"); la posizione nella griglia è esplicita e la colonna del ruolo è
 * solo visiva.
 */
function MirrorTeamBoard({
  teams,
  slugMap,
  viewerMarks,
  bands,
}: {
  teams: TeamAthlete[][];
  slugMap: Record<string, string>;
  viewerMarks: ViewerMarks;
  bands: Record<string, LevelBand>;
}) {
  const t = useTranslations("trainings");
  const tRoles = useTranslations("roles");
  const meta = TEAM_META.slice(0, 2);
  const roles = ROLES.filter((role) => teams.some((team) => team.some((a) => a.role === role)));
  const sides = [
    { column: 1, align: "left" as const },
    { column: 3, align: "right" as const },
  ];
  const cellSx = { px: { xs: 1.5, sm: 2 }, py: 0.75, borderTop: 1, borderColor: "divider" };

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 40px minmax(0, 1fr)",
      }}
    >
      {sides.map(({ column, align }, i) => (
        <Box key={meta[i].key} sx={{ display: "contents" }}>
          <Box
            sx={[
              {
                gridColumn: column,
                gridRow: 1,
                px: { xs: 1.5, sm: 2 },
                py: 1.25,
                textAlign: align,
              },
              bibSurfaceSx(meta[i].key),
            ]}
          >
            <TeamHeading meta={meta[i]} count={teams[i].length} />
          </Box>
          {roles.map((role, r) => {
            const group = teams[i].filter((a) => a.role === role);
            return (
              <Box key={role} sx={{ ...cellSx, gridColumn: column, gridRow: r + 2 }}>
                {group.length > 0 && (
                  <>
                    <Box component="span" sx={visuallyHidden}>
                      {tRoles("sportRole", { n: role, v: "" })}
                    </Box>
                    {group.map((a) => (
                      <AthleteName
                        key={a.id}
                        athlete={a}
                        slug={slugMap[a.id]}
                        mark={viewerMarks[a.id]}
                        band={bands[a.id]}
                        align={align}
                      />
                    ))}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      ))}

      {/* Colonna centrale: solo visiva, il ruolo è già detto in ogni squadra. */}
      <Box
        aria-hidden="true"
        sx={{
          gridColumn: 2,
          gridRow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.selected",
          typography: "caption",
          color: "text.secondary",
        }}
      >
        {t("teamsVersus")}
      </Box>
      {roles.map((role, r) => (
        <Box
          key={role}
          aria-hidden="true"
          sx={{
            ...cellSx,
            px: 0,
            gridColumn: 2,
            gridRow: r + 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            // Centrato sulla prima riga di nomi (alta 32).
            pt: "10px",
          }}
        >
          <RoleBadge role={role} />
        </Box>
      ))}
    </Paper>
  );
}

// ── 3 squadre su telefono: card impilate ──────────────────────────────────────

function StackedTeamCards({
  teams,
  slugMap,
  viewerMarks,
  bands,
}: {
  teams: TeamAthlete[][];
  slugMap: Record<string, string>;
  viewerMarks: ViewerMarks;
  bands: Record<string, LevelBand>;
}) {
  const meta = TEAM_META.slice(0, teams.length);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {teams.map((team, i) => (
        <Paper key={meta[i].key} variant="outlined" sx={{ overflow: "hidden" }}>
          <Box sx={[{ px: 1.5, py: 1.25 }, bibSurfaceSx(meta[i].key)]}>
            <TeamHeading meta={meta[i]} count={team.length} />
          </Box>
          {ROLES.map((role) => {
            const group = team.filter((a) => a.role === role);
            if (group.length === 0) return null;
            return (
              <Box
                key={role}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  px: 1.5,
                  py: 0.75,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Box sx={{ pt: "4px", flexShrink: 0 }}>
                  <RoleBadge role={role} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {group.map((a) => (
                    <AthleteName
                      key={a.id}
                      athlete={a}
                      slug={slugMap[a.id]}
                      mark={viewerMarks[a.id]}
                      band={bands[a.id]}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Paper>
      ))}
    </Box>
  );
}

// ── 3 squadre da md: griglia allineata ────────────────────────────────────────

function RolePill({
  role,
  count,
  playerLabel,
  label,
}: {
  role: number;
  count: number;
  playerLabel: string;
  label: string;
}) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: RADIUS.pill,
        overflow: "hidden",
        ...roleColorSx(role),
        fontSize: TYPE_SCALE.xs,
        lineHeight: 1,
        opacity: count === 0 ? 0.28 : 1,
      }}
    >
      <Box sx={{ px: 1.25, py: "5px", fontWeight: FONT_WEIGHT.semibold }}>{label}</Box>
      <Box
        sx={{
          px: 1.25,
          py: "5px",
          fontWeight: FONT_WEIGHT.regular,
          bgcolor: (theme) => alpha(theme.palette.common.black, 0.22),
        }}
      >
        {playerLabel}
      </Box>
    </Box>
  );
}

function AlignedTeamGrid({
  teams,
  slugMap,
  viewerMarks,
  bands,
}: {
  teams: TeamAthlete[][];
  slugMap: Record<string, string>;
  viewerMarks: ViewerMarks;
  bands: Record<string, LevelBand>;
}) {
  const t = useTranslations("trainings");
  const { roleLabel, teamColorLabel } = useEntityLabels();
  const meta = TEAM_META.slice(0, teams.length);
  const cells: React.ReactNode[] = [];

  meta.forEach((m, i) => {
    cells.push(
      <Box
        key={`header-${i}`}
        sx={[
          { px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 },
          bibSurfaceSx(m.key),
        ]}
      >
        <Typography component="h3" variant="h6" sx={{ color: "common.white" }}>
          {teamColorLabel(m.key)}
        </Typography>
        <Chip
          label={t("athletes", { count: teams[i].length })}
          size="small"
          variant="outlined"
          sx={{ color: "common.white", borderColor: "common.white" }}
        />
      </Box>
    );
  });

  for (const role of ROLES) {
    const groups = teams.map((team) => team.filter((a) => a.role === role));
    const maxCount = Math.max(...groups.map((g) => g.length));
    if (maxCount === 0) continue;

    groups.forEach((group, i) => {
      cells.push(
        <Box key={`badge-${role}-${i}`} sx={{ px: 2, pt: 1, pb: 0.5 }}>
          <RolePill
            role={role}
            count={group.length}
            playerLabel={t("playerCount", { count: group.length })}
            label={roleLabel(role)}
          />
        </Box>
      );
    });

    // Righe atleti, con celle vuote fino a maxCount per tenere i ruoli allineati.
    for (let idx = 0; idx < maxCount; idx++) {
      groups.forEach((group, i) => {
        const athlete = group[idx];
        cells.push(
          <Box key={`player-${role}-${idx}-${i}`} sx={{ px: 3 }}>
            {athlete && (
              <AthleteName
                athlete={athlete}
                slug={slugMap[athlete.id]}
                mark={viewerMarks[athlete.id]}
                band={bands[athlete.id]}
              />
            )}
          </Box>
        );
      });
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))`,
      }}
    >
      {cells}
    </Paper>
  );
}

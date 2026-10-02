import { teamColor } from "@/lib/teamColors";
import { Box, Button, Paper, Typography, Chip, Stack, Link as MuiLink } from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { MIN_CALLUPS } from "@/lib/constants";
import { formatRome, romeCalendarDaysBetween } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

const DAYS_AHEAD = 7;

function relativeShort(date: Date, now: Date): string {
  const diffDays = romeCalendarDaysBetween(now, date);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays > 1 && diffDays <= 6) {
    return formatRome(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  return formatRome(date, "d MMM", { locale: it });
}

export default async function AdminProssimePartite() {
  const now = new Date();
  const limit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: { date: { gte: now, lte: limit } },
    orderBy: { date: "asc" },
    take: 5,
    select: {
      id: true,
      slug: true,
      date: true,
      team: { select: { name: true, color: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
      _count: { select: { callups: true } },
    },
  });

  if (matches.length === 0) return null;

  const incomplete = matches.filter((m) => m._count.callups < MIN_CALLUPS).length;

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 2.5 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <GroupAddIcon sx={{ color: "primary.main" }} />
        <Box sx={{ flex: 1 }}>
          <Typography component="h2" variant="subtitle1">
            Partite imminenti
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1}>
        {matches.map((m) => {
          const count = m._count.callups;
          const isMissing = count === 0;
          const isLow = count > 0 && count < MIN_CALLUPS;
          const isOk = count >= MIN_CALLUPS;
          const chipColor: "error" | "warning" | "success" = isMissing
            ? "error"
            : isLow
              ? "warning"
              : "success";
          const chipLabel = isMissing
            ? "Nessun convocato"
            : isLow
              ? `${count}/${MIN_CALLUPS} convocati`
              : `${count} convocati`;
          return (
            // Su telefono tre piani: nome a tutta larghezza (su due righe, mai
            // troncato a "Kari…"), sotto la data, sotto ancora stato e azione.
            // Da `sm` tutto su una riga (UX-40).
            <Box
              key={m.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "4px 1fr auto", sm: "4px 1fr auto auto" },
                gridTemplateAreas: {
                  xs: '"mark name name" "mark status action"',
                  sm: '"mark name status action"',
                },
                alignItems: "center",
                columnGap: 1.5,
                rowGap: 1,
                p: 1.25,
                borderRadius: RADIUS.md,
                border: "1px solid",
                // Nessun convocato: bordo rosso (valenza negativa), oltre al chip con icona.
                borderColor: isMissing ? "error.main" : "divider",
              }}
            >
              <Box
                sx={{
                  gridArea: "mark",
                  alignSelf: "stretch",
                  borderRadius: RADIUS.sm,
                  // Tinta della squadra; senza tinta la fascia resta vuota (nessun segno).
                  bgcolor: teamColor(m.team.color) ?? "transparent",
                }}
              />
              <Box sx={{ gridArea: "name", minWidth: 0 }}>
                <MuiLink
                  href={m.slug ? `/partite/${m.slug}` : `/admin/partite?edit=${m.id}`}
                  underline="hover"
                  color="inherit"
                  variant="body2"
                  sx={{
                    fontWeight: FONT_WEIGHT.semibold,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: { xs: 2, sm: 1 },
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                  }}
                >
                  {m.team.name} vs {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                </MuiLink>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {relativeShort(m.date, now)} · {formatRome(m.date, "HH:mm")}
                </Typography>
              </Box>
              <Chip
                size="small"
                color={chipColor}
                // L'icona sta dentro l'etichetta, non nella prop `icon`: da un
                // Server Component l'elemento può arrivare al Chip ancora non
                // risolto, il Chip lo scarta sul server e lo disegna nel
                // browser, e l'idratazione fallisce (a volte: dipende dai tempi).
                label={
                  <Box
                    component="span"
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
                  >
                    {isOk ? (
                      <CheckCircleIcon style={{ fontSize: 14 }} />
                    ) : (
                      <WarningAmberIcon style={{ fontSize: 14 }} />
                    )}
                    {chipLabel}
                  </Box>
                }
                sx={{ gridArea: "status", justifySelf: "start" }}
              />
              <Button
                href={`/admin/partite/${m.id}/convocazioni`}
                variant="outlined"
                size="small"
                aria-label={`Convoca per ${m.team.name} vs ${
                  m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"
                }`}
                sx={{ gridArea: "action", minHeight: { xs: 44, sm: 32 }, whiteSpace: "nowrap" }}
              >
                Convoca
              </Button>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

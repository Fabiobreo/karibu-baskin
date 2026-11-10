"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import RowActions, { type RowAction, type RowPrimaryAction } from "@/components/admin/RowActions";
import TeamChip from "@/components/teams/TeamChip";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import type {
  CalendarDay,
  GironeOtherMatch,
  GironeOurMatch,
  GironeTeam,
} from "@/lib/groups/gironeCalendar";

interface GironeCalendarProps {
  days: CalendarDay[];
  ourTeamById: ReadonlyMap<string, GironeTeam>;
  isAdmin: boolean;
  onResult: (m: GironeOurMatch) => void;
  onEditOther: (m: GironeOtherMatch) => void;
  onDeleteOther: (m: GironeOtherMatch) => Promise<boolean>;
}

const fmtDate = (iso: string | null) =>
  iso ? format(new Date(iso), "EEE d MMM yy · HH:mm", { locale: it }) : "Data da definire";

function dayRange(day: CalendarDay): string | null {
  const dates = day.entries.flatMap((e) => (e.date ? [new Date(e.date)] : []));
  if (dates.length === 0) return null;
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const a = format(min, "d MMM", { locale: it });
  const b = format(max, "d MMM yy", { locale: it });
  return format(min, "yyyy-MM-dd") === format(max, "yyyy-MM-dd")
    ? format(min, "d MMM yy", { locale: it })
    : `${a} – ${b}`;
}

/**
 * Le azioni di una nostra partita: si lavora in Partite, qui c'è la scorciatoia
 * a quello che manca (risultato, poi statistiche; prima della gara le
 * convocazioni). Risultato e statistiche sono dell'admin, come dicono le API.
 */
function ourActions(
  m: GironeOurMatch,
  isAdmin: boolean,
  onResult: (m: GironeOurMatch) => void
): { primary: RowPrimaryAction; items: RowAction[] } {
  const upcoming = new Date(m.date).getTime() > Date.now();
  const hasResult = m.ourScore !== null && m.theirScore !== null;
  const callups: RowAction = { label: "Convocazioni", href: `/admin/partite/${m.id}/convocazioni` };
  const stats: RowAction = { label: "Statistiche", href: `/admin/partite/${m.id}/statistiche` };
  const result: RowAction = {
    label: hasResult ? "Cambia risultato" : "Risultato",
    onClick: () => onResult(m),
  };
  const edit: RowAction = { label: "Modifica in Partite", href: `/admin/partite?edit=${m.id}` };
  const publicPage: RowAction = { label: "Pagina pubblica", href: `/partite/${m.slug ?? m.id}` };

  let primary: RowPrimaryAction;
  if (upcoming) primary = { ...callups, emphasis: "outlined" };
  else if (isAdmin && !hasResult) primary = { ...result, emphasis: "outlined" };
  else if (isAdmin && m._count.playerStats === 0) primary = { ...stats, emphasis: "outlined" };
  else primary = { ...publicPage, emphasis: "text" };

  const all = isAdmin ? [result, callups, stats, edit, publicPage] : [callups, publicPage];
  return { primary, items: all.filter((a) => a.label !== primary.label) };
}

function Score({ a, b }: { a: number | null; b: number | null }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: FONT_WEIGHT.semibold,
        fontVariantNumeric: "tabular-nums",
        minWidth: 64,
        textAlign: "center",
      }}
    >
      {a !== null && b !== null ? `${a} – ${b}` : "–"}
    </Typography>
  );
}

const ROW_SX = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr auto", md: "170px 1fr auto 1fr auto" },
  columnGap: 2,
  rowGap: 0.5,
  alignItems: "center",
  py: 1.25,
  borderTop: 1,
  borderColor: "divider",
} as const;

export default function GironeCalendar({
  days,
  ourTeamById,
  isAdmin,
  onResult,
  onEditOther,
  onDeleteOther,
}: GironeCalendarProps) {
  if (days.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nessuna partita nel girone. Importa il foglio EISI o aggiungi i risultati a mano.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {days.map((day) => {
        const range = dayRange(day);
        return (
          <Paper
            key={day.matchday ?? "none"}
            variant="outlined"
            sx={{ px: { xs: 1.5, sm: 2 }, pt: 1.5, pb: 0.5 }}
          >
            <Typography
              variant="subtitle1"
              component="h3"
              sx={{ fontWeight: FONT_WEIGHT.semibold, mb: 0.5 }}
            >
              {day.matchday !== null ? `Giornata ${day.matchday}` : "Senza giornata"}
              {range && (
                <Typography component="span" variant="body2" color="text.secondary">
                  {" "}
                  · {range}
                </Typography>
              )}
            </Typography>
            {day.entries.map((e) => {
              if (e.kind === "ours") {
                const m = e.match;
                const team = ourTeamById.get(m.teamId);
                const ourName = team?.name ?? "Noi";
                const opp = m.opponent?.name ?? "Avversaria";
                const home = m.isHome ? ourName : opp;
                const away = m.isHome ? opp : ourName;
                const { primary, items } = ourActions(m, isAdmin, onResult);
                const usLabel = <TeamChip name={ourName} color={team?.color} size="small" />;
                return (
                  <Box key={m.id} sx={ROW_SX}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
                    >
                      {fmtDate(m.date)}
                    </Typography>
                    <Box
                      sx={{
                        display: { xs: "flex", md: "contents" },
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ textAlign: { md: "right" } }}>
                        {m.isHome ? usLabel : <Typography variant="body2">{home}</Typography>}
                      </Box>
                      <Score
                        a={m.isHome ? m.ourScore : m.theirScore}
                        b={m.isHome ? m.theirScore : m.ourScore}
                      />
                      <Box>
                        {m.isHome ? <Typography variant="body2">{away}</Typography> : usLabel}
                      </Box>
                    </Box>
                    <RowActions subject={`${home} – ${away}`} primary={primary} items={items} />
                  </Box>
                );
              }
              const m = e.match;
              const subject = `${m.homeTeam.name} – ${m.awayTeam.name}`;
              return (
                <Box key={m.id} sx={ROW_SX}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
                  >
                    {fmtDate(m.date)}
                  </Typography>
                  <Box
                    sx={{
                      display: { xs: "flex", md: "contents" },
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="body2" sx={{ textAlign: { md: "right" } }}>
                      {m.homeTeam.name}
                    </Typography>
                    <Score a={m.homeScore} b={m.awayScore} />
                    <Typography variant="body2">{m.awayTeam.name}</Typography>
                  </Box>
                  <RowActions
                    subject={subject}
                    primary={{
                      label: m.homeScore === null ? "Risultato" : "Modifica",
                      onClick: () => onEditOther(m),
                      emphasis:
                        m.homeScore === null &&
                        m.date !== null &&
                        new Date(m.date).getTime() < Date.now()
                          ? "outlined"
                          : "text",
                    }}
                    onDelete={() => onDeleteOther(m)}
                    deleteConfirm={{
                      title: "Elimina partita",
                      message: `Eliminare ${subject} dal girone?`,
                    }}
                  />
                </Box>
              );
            })}
          </Paper>
        );
      })}
    </Stack>
  );
}

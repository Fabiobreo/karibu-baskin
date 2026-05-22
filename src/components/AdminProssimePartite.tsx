import Link from "next/link";
import { Box, Paper, Typography, Chip, Stack } from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { MIN_CALLUPS } from "@/lib/constants";

const DAYS_AHEAD = 7;

function relativeShort(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  return format(date, "d MMM", { locale: it });
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
          <Typography variant="subtitle1" fontWeight={700}>
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
            <Box
              key={m.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.25,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "rgba(0,0,0,0.07)",
                bgcolor: isMissing ? "rgba(211,47,47,0.04)" : "transparent",
              }}
            >
              <Link
                href={m.slug ? `/partite/${m.slug}` : "#"}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    width: 4,
                    alignSelf: "stretch",
                    borderRadius: 1,
                    backgroundColor: m.team.color,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {m.team.name} vs {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {relativeShort(m.date, now)} · {format(m.date, "HH:mm")}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={chipColor}
                  icon={
                    isOk ? (
                      <CheckCircleIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <WarningAmberIcon sx={{ fontSize: 14 }} />
                    )
                  }
                  label={chipLabel}
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                />
              </Link>
              <Link
                href={`/admin/partite/${m.id}/convocazioni`}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
                >
                  Convoca →
                </Typography>
              </Link>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

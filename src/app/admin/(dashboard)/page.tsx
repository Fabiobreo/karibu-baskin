import { prisma } from "@/lib/db";
import {
  Box, Typography, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, Avatar, Chip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";

export const revalidate = 0;

export default async function AdminPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalUsers, recentUsers, recentChildren, upcomingSessions, pendingRoleCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, image: true, appRole: true, createdAt: true, sportRole: true, sportRoleVariant: true, sportRoleSuggested: true, sportRoleSuggestedVariant: true },
    }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, sportRole: true, sportRoleVariant: true, createdAt: true, parent: { select: { name: true, email: true } } },
    }),
    prisma.trainingSession.count({ where: { date: { gte: now } } }),
    // Utenti con ruolo suggerito ma non ancora confermato
    prisma.user.count({
      where: { sportRoleSuggested: { not: null }, sportRole: null },
    }),
  ]);

  // Unisce utenti e figli, ordina per data e prende i 5 più recenti
  const recentAll = [
    ...recentUsers.map((u) => ({ ...u, kind: "user" as const })),
    ...recentChildren.map((c) => ({ ...c, kind: "child" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const recentCount = await prisma.user.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Navigazione */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 2 }}>
        <NavCard
          href="/admin/utenti"
          icon={<PersonIcon />}
          label="Gestione Utenti"
          stat={`${totalUsers} utenti · +${recentCount} negli ultimi 30gg`}
          badge={pendingRoleCount}
          color="#E65100"
        />
        <NavCard
          href="/admin/allenamenti"
          icon={<CalendarMonthIcon />}
          label="Gestione Allenamenti"
          stat={upcomingSessions > 0 ? `${upcomingSessions} ${upcomingSessions === 1 ? "prossimo" : "prossimi"}` : "Nessuno in programma"}
          color="#00897B"
        />
        <NavCard href="/admin/squadre" icon={<GroupsIcon />} label="Gestione Squadre" color="#1565C0" />
        <NavCard href="/admin/partite" icon={<EmojiEventsIcon />} label="Gestione Partite" color="#2E7D32" />
        <NavCard href="/admin/eventi" icon={<CalendarMonthIcon />} label="Gestione Eventi" color="#6A1B9A" />
      </Box>

      {/* Badge suggerimenti ruolo */}
      {pendingRoleCount > 0 && (
        <Paper elevation={2} sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <NewReleasesIcon color="warning" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={700}>
              {pendingRoleCount} {pendingRoleCount === 1 ? "utente ha" : "utenti hanno"} suggerito il proprio ruolo Baskin
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Vai su Gestione Utenti per confermare o modificare il ruolo.
            </Typography>
          </Box>
          <Link href="/admin/utenti" style={{ textDecoration: "none" }}>
            <Typography variant="caption" color="primary" sx={{ "&:hover": { textDecoration: "underline" } }}>
              Gestisci →
            </Typography>
          </Link>
        </Paper>
      )}

      {/* Ultimi iscritti */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonAddIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={700}>
              Ultimi iscritti
            </Typography>
          </Box>
          <Link href="/admin/utenti" style={{ textDecoration: "none" }}>
            <Typography variant="caption" color="primary" sx={{ "&:hover": { textDecoration: "underline" } }}>
              Vedi tutti →
            </Typography>
          </Link>
        </Box>
        <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 0, width: 40 }} />
              <TableCell sx={{ fontWeight: 700 }}>Utente</TableCell>
              <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Ruolo utente</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Ruolo Baskin</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Iscritto il</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentAll.map((row) => (
              <TableRow key={`${row.kind}-${row.id}`} hover>
                <TableCell sx={{ width: 40, pl: 0 }}>
                  <Avatar
                    src={row.kind === "user" ? (row.image ?? undefined) : undefined}
                    sx={{ width: 30, height: 30, fontSize: 13, bgcolor: row.kind === "child" ? "grey.400" : undefined }}
                  >
                    {(row.name ?? (row.kind === "user" ? row.email : "?"))[0].toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{row.name ?? "—"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.kind === "user" ? row.email : `Figlio di ${row.parent.name ?? row.parent.email}`}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.kind === "user"
                    ? <Chip label={ROLE_LABELS_IT[row.appRole]} size="small" color={ROLE_CHIP_COLORS[row.appRole]} sx={{ fontWeight: 600 }} />
                    : <Chip label="Atleta" size="small" color="primary" sx={{ fontWeight: 600 }} />
                  }
                </TableCell>
                <TableCell align="center">
                  {row.sportRole
                    ? <Chip
                        label={sportRoleLabel(row.sportRole, row.sportRoleVariant)}
                        size="small"
                        sx={{ bgcolor: ROLE_COLORS[row.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}
                      />
                    : row.kind === "user" && row.sportRoleSuggested
                      ? <Chip
                          label={`${sportRoleLabel(row.sportRoleSuggested, row.sportRoleSuggestedVariant)} ?`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: ROLE_COLORS[row.sportRoleSuggested], color: ROLE_COLORS[row.sportRoleSuggested], fontWeight: 700, fontSize: "0.72rem" }}
                        />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(row.createdAt), "d MMM yyyy", { locale: it })}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {recentAll.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  Nessun utente ancora iscritto
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </Box>
      </Paper>

    </Box>
  );
}

function NavCard({ href, icon, label, stat, badge, color }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  stat?: string;
  badge?: number;
  color: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Paper
        elevation={2}
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          cursor: "pointer",
          border: "2px solid transparent",
          transition: "all 0.15s",
          "&:hover": { borderColor: color, transform: "translateY(-2px)" },
          height: "100%",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ color }}>{icon}</Box>
          {badge != null && badge > 0 && (
            <Chip label={badge} size="small" color="warning" sx={{ fontWeight: 700, height: 20, fontSize: "0.72rem" }} />
          )}
        </Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color }}>
          {label}
        </Typography>
        {stat && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {stat}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: "auto" }}>
          Gestisci →
        </Typography>
      </Paper>
    </Link>
  );
}

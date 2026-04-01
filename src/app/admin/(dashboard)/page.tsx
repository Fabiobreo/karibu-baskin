import { prisma } from "@/lib/db";
import {
  Box, Typography, Paper, Divider,
  Table, TableBody, TableCell, TableRow, Avatar, Chip,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Link from "next/link";
import AdminSessionsPanel from "@/components/AdminSessionsPanel";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const revalidate = 0;

export default async function AdminPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalUsers, recentUsers, upcomingSessions, pendingRoleCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, image: true, appRole: true, createdAt: true },
    }),
    prisma.trainingSession.count({ where: { date: { gte: now } } }),
    // Utenti con ruolo suggerito ma non ancora confermato
    prisma.user.count({
      where: { sportRoleSuggested: { not: null }, sportRole: null },
    }),
  ]);

  const recentCount = await prisma.user.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const APP_ROLE_LABELS: Record<string, string> = {
    GUEST: "Ospite",
    ATHLETE: "Atleta",
    PARENT: "Genitore",
    COACH: "Allenatore",
    ADMIN: "Admin",
  };

  const APP_ROLE_COLORS: Record<string, "default" | "warning" | "info" | "success" | "error"> = {
    GUEST: "default",
    ATHLETE: "info",
    PARENT: "success",
    COACH: "warning",
    ADMIN: "error",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>

      {/* Stat cards + navigazione */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 2 }}>
        <StatCard icon={<PeopleIcon />} label="Utenti totali" value={totalUsers} color="#1565C0" />
        <StatCard icon={<CalendarMonthIcon />} label="Prossimi allenamenti" value={upcomingSessions} color="#2E7D32" />
        <NavCard
          href="/admin/utenti"
          icon={<PersonIcon />}
          label="Gestione Utenti"
          badge={pendingRoleCount}
          color="#E65100"
        />
        <StatCard
          icon={<PersonAddIcon />}
          label="Nuovi iscritti (30 gg)"
          value={recentCount}
          color={recentCount > 0 ? "#1565C0" : "#757575"}
        />
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
        <Table size="small">
          <TableBody>
            {recentUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ width: 40, pl: 0 }}>
                  <Avatar src={user.image ?? undefined} sx={{ width: 30, height: 30, fontSize: 13 }}>
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{user.name ?? "—"}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={APP_ROLE_LABELS[user.appRole] ?? user.appRole}
                    size="small"
                    color={APP_ROLE_COLORS[user.appRole] ?? "default"}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(user.createdAt), "d MMM yyyy", { locale: it })}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {recentUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  Nessun utente ancora iscritto
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Divider />

      {/* Gestione allenamenti */}
      <AdminSessionsPanel />
    </Box>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Paper elevation={2} sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color }}>
        {icon}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ color }}>
        {value}
      </Typography>
    </Paper>
  );
}

function NavCard({ href, icon, label, badge, color }: {
  href: string;
  icon: React.ReactNode;
  label: string;
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
        <Typography variant="caption" color="text.secondary">
          Gestisci →
        </Typography>
      </Paper>
    </Link>
  );
}

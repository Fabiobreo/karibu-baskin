import { prisma } from "@/lib/db";
import {
  Box, Typography, Paper, Chip,
} from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DownloadIcon from "@mui/icons-material/Download";
import AdminDashboardTabs from "@/components/AdminDashboardTabs";
import AdminNotificationSender from "@/components/AdminNotificationSender";
import Link from "next/link";
import { getCurrentSeason } from "@/lib/seasonUtils";

export const revalidate = 30;

export default async function AdminPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalUsers, recentUsers, recentChildren, pendingRoleCount, recentAnonymous, sessionsIncomplete] = await Promise.all([
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
    // Utenti con ruolo suggerito ma non ancora confermato
    prisma.user.count({
      where: { sportRoleSuggested: { not: null }, sportRole: null },
    }),
    // Iscrizioni anonime (tutte, per raggruppamento per nome)
    prisma.registration.findMany({
      where: { userId: null, childId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, anonymousEmail: true, role: true, createdAt: true,
        session: { select: { id: true, date: true, dateSlug: true } },
      },
    }),
    // Allenamenti passati non ancora conclusi dallo staff
    prisma.trainingSession.count({
      where: {
        date: { lt: now },
        managedAt: null,
        registrations: { some: {} },
      },
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
          badge={sessionsIncomplete}
          badgeLabel={sessionsIncomplete === 1 ? "da completare" : "da completare"}
          color="#00897B"
        />
        <NavCard href="/admin/squadre" icon={<GroupsIcon />} label="Gestione Squadre" color="#1565C0" />
        <NavCard href="/admin/partite" icon={<EmojiEventsIcon />} label="Gestione Partite" color="#2E7D32" />
        <NavCard href="/admin/eventi" icon={<CalendarMonthIcon />} label="Gestione Eventi" color="#6A1B9A" />
        <NavCard href="/admin/esporta" icon={<DownloadIcon />} label="Esporta CSV" color="#37474F" />
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

      <AdminDashboardTabs recentAll={recentAll} registrations={recentAnonymous} />

      <AdminNotificationSender currentSeason={getCurrentSeason()} />

    </Box>
  );
}

function NavCard({ href, icon, label, stat, badge, badgeLabel, color }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  stat?: string;
  badge?: number;
  badgeLabel?: string;
  color: string;
}) {
  const hasBadge = badge != null && badge > 0;
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
          {hasBadge && (
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
        {hasBadge && badgeLabel && (
          <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 700, lineHeight: 1.4 }}>
            {badge} {badgeLabel}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: "auto" }}>
          Gestisci →
        </Typography>
      </Paper>
    </Link>
  );
}

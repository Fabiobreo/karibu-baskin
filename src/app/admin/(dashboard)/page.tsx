import { prisma } from "@/lib/db";
import { Box, Typography, Paper, Chip } from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import TableChartIcon from "@mui/icons-material/TableChart";
import ShieldIcon from "@mui/icons-material/Shield";
import ArticleIcon from "@mui/icons-material/Article";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CollectionsIcon from "@mui/icons-material/Collections";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminDashboardTabs from "@/components/admin/AdminDashboardTabs";
import AdminNotificationSender from "@/components/admin/AdminNotificationSender";
import AdminProssimePartite from "@/components/admin/AdminProssimePartite";
import Link from "next/link";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import { onHover } from "@/lib/hoverStyles";

export const revalidate = 30;

export default async function AdminPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    recentUsers,
    recentChildren,
    pendingRoleCount,
    recentAnonymous,
    sessionsIncomplete,
    newSuggestionsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        appRole: true,
        createdAt: true,
        sportRole: true,
        sportRoleVariant: true,
        sportRoleSuggested: true,
        sportRoleSuggestedVariant: true,
      },
    }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        sportRole: true,
        sportRoleVariant: true,
        createdAt: true,
        parent: { select: { name: true, email: true } },
      },
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
        id: true,
        name: true,
        anonymousEmail: true,
        role: true,
        createdAt: true,
        session: { select: { id: true, date: true, dateSlug: true } },
      },
    }),
    // Allenamenti passati non ancora conclusi dallo staff. Stesso filtro della
    // pagina /admin/allenamenti: contava solo quelli con iscritti, e la card
    // diceva 15 mentre la pagina ne elencava 27. Anche una sessione senza
    // iscritti va chiusa, e da li' si chiude.
    prisma.trainingSession.count({
      where: { date: { lt: now }, managedAt: null },
    }),
    // Suggerimenti nuovi (non ancora letti)
    prisma.suggestion.count({ where: { status: "NUOVO" } }),
  ]);

  // Unisce utenti e figli, ordina per data e prende i 5 più recenti
  const recentAll = [
    ...recentUsers.map((u) => ({ ...u, kind: "user" as const })),
    ...recentChildren.map((c) => ({ ...c, kind: "child" as const })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentCount = await prisma.user.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Cosa richiede attenzione, e da dove si gestisce il resto."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
      />

      {/* I due numeri che contano. Erano due card fra tredici identiche, e il
          "15 da completare" era scritto due volte nella stessa card. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
        }}
      >
        <StatCard
          href="/admin/allenamenti"
          icon={<CalendarMonthIcon />}
          value={sessionsIncomplete}
          label="Allenamenti da completare"
          caption="Sessioni passate ancora da chiudere: presenze, partitelle e conferma."
          color="admin.activity"
          highlight={sessionsIncomplete > 0}
        />
        <StatCard
          href="/admin/utenti"
          icon={<PersonIcon />}
          value={totalUsers}
          label="Utenti registrati"
          caption={`+${recentCount} negli ultimi 30 giorni`}
          color="admin.registry"
        />
      </Box>

      {/* Il resto sono voci di menu: link compatti, non card. */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <NavSection title="Attività">
          <NavLink href="/admin/partite" icon={<EmojiEventsIcon />} label="Partite" />
          <NavLink href="/admin/eventi" icon={<CalendarMonthIcon />} label="Eventi" />
          <NavLink href="/admin/news" icon={<ArticleIcon />} label="News" />
          <NavLink href="/admin/gallery" icon={<CollectionsIcon />} label="Gallery" />
        </NavSection>

        <NavSection title="Anagrafiche">
          <NavLink href="/admin/squadre" icon={<GroupsIcon />} label="Squadre" />
          <NavLink href="/admin/gironi" icon={<TableChartIcon />} label="Gironi" />
          <NavLink href="/admin/avversarie" icon={<ShieldIcon />} label="Squadre avversarie" />
        </NavSection>

        <NavSection title="Strumenti">
          <NavLink href="/admin/sviluppo" icon={<TrendingUpIcon />} label="Sviluppo giocatori" />
          <NavLink href="/admin/esporta" icon={<DownloadIcon />} label="Esporta CSV" />
          <NavLink
            href="/admin/suggerimenti"
            icon={<LightbulbIcon />}
            label="Suggerimenti"
            badge={newSuggestionsCount}
          />
          <NavLink href="/admin/audit" icon={<HistoryIcon />} label="Registro attività" />
        </NavSection>
      </Box>

      {/* Badge suggerimenti ruolo */}
      {pendingRoleCount > 0 && (
        <Paper elevation={2} sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <NewReleasesIcon color="warning" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={700}>
              {pendingRoleCount} {pendingRoleCount === 1 ? "utente ha" : "utenti hanno"} suggerito
              il proprio ruolo Baskin
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Vai su Gestione Utenti per confermare o modificare il ruolo.
            </Typography>
          </Box>
          <Link href="/admin/utenti" style={{ textDecoration: "none" }}>
            <Typography
              variant="caption"
              color="primary.onLight"
              sx={{ "&:hover": { textDecoration: "underline" } }}
            >
              Gestisci →
            </Typography>
          </Link>
        </Paper>
      )}

      {/* Partite imminenti — convocazioni mancanti */}
      <AdminProssimePartite />

      <AdminDashboardTabs recentAll={recentAll} registrations={recentAnonymous} />

      <AdminNotificationSender currentSeason={getCurrentSeason()} />
    </Box>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="overline"
        component="h2"
        sx={{
          fontWeight: 700,
          color: "text.secondary",
          letterSpacing: 1,
          display: "block",
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/**
 * Card con un numero. Riservata alle due voci che portano davvero un dato: la
 * card è il contenitore più costoso del sistema, spenderla su undici link la
 * svuota di significato.
 */
function StatCard({
  href,
  icon,
  value,
  label,
  caption,
  color,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  value: number;
  label: string;
  caption: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Paper
        elevation={2}
        sx={{
          p: 2.5,
          height: "100%",
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
          cursor: "pointer",
          border: "2px solid",
          borderColor: highlight ? color : "transparent",
          transition: "all 0.15s",
          ...onHover({ borderColor: color, transform: "translateY(-2px)" }),
        }}
      >
        <Box sx={{ color, display: "flex", mt: 0.5 }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="p"
            sx={{
              fontSize: "2.2rem",
              fontWeight: 900,
              lineHeight: 1,
              color,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {caption}
          </Typography>
        </Box>
      </Paper>
    </Link>
  );
}

/** Voce di menu compatta: nessun dato da mostrare, nessuna card da spendere. */
function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  const hasBadge = badge != null && badge > 0;
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.25,
          minHeight: 44,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          // Senza, il testo eredita il blu di default dell'ancora.
          color: "text.primary",
          transition: "all 0.15s",
          ...onHover({ borderColor: "text.disabled", bgcolor: "action.hover" }),
        }}
      >
        <Box sx={{ color: "text.secondary", display: "flex", "& svg": { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {label}
        </Typography>
        {hasBadge && (
          <Chip
            label={badge}
            size="small"
            color="warning"
            sx={{ fontWeight: 700, height: 20, fontSize: "0.72rem" }}
          />
        )}
      </Box>
    </Link>
  );
}

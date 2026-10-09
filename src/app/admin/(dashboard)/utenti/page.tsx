import { prisma } from "@/lib/db";
import AdminUserList from "@/components/admin/AdminUserList";
import { Paper, Button, Stack } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PageHeader from "@/components/common/PageHeader";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { requireAdminPage } from "@/lib/adminAccess";
import AthletesTab from "@/components/admin/userList/AthletesTab";
import type { AdminRow } from "@/components/admin/userList/userListShared";
import { GUARDIANS_SELECT, guardianList } from "@/lib/guardians";
import { cookies } from "next/headers";
import { parseRowsPerPage, rowsPerPageCookieName } from "@/lib/rowsPerPage";
import { joinFilter, parseAppRoles, parseSportRoles } from "@/lib/userFilters";
import { ATHLETE_ACCOUNT_WHERE } from "@/lib/athletes";

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Appiattisce i collegamenti di famiglia in due liste di nomi per la riga. */
function toUserEntry<
  T extends {
    guardianOf: { child: { name: string } }[];
    childAccount: { guardians: { user: { name: string | null; email: string } }[] } | null;
  },
>({ guardianOf, childAccount, ...user }: T) {
  return {
    ...user,
    childNames: guardianOf.map((g) => g.child.name),
    parentNames: (childAccount?.guardians ?? []).map((g) => g.user.name?.trim() || g.user.email),
  };
}

const USER_ROW_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  appRole: true,
  sportRole: true,
  sportRoleVariant: true,
  sportRoleSuggested: true,
  sportRoleSuggestedVariant: true,
  gender: true,
  birthDate: true,
  athleteStatus: true,
  createdAt: true,
  _count: { select: { registrations: true } },
  // Figli collegati: sotto il nome del genitore compare "Genitore di …".
  guardianOf: {
    orderBy: { createdAt: "asc" as const },
    select: { child: { select: { name: true } } },
  },
  // Genitori di chi ha un account ma e' anche figlio di qualcuno: sotto il
  // nome compare "Figlio di …", come per i figli senza account.
  childAccount: {
    select: {
      guardians: {
        orderBy: { createdAt: "asc" as const },
        select: { user: { select: { name: true, email: true } } },
      },
    },
  },
  sportRoleHistory: {
    orderBy: { changedAt: "desc" as const },
    select: { sportRole: true, changedAt: true },
  },
  teamMemberships: {
    select: {
      id: true,
      teamId: true,
      isCaptain: true,
      team: { select: { id: true, name: true, season: true, color: true } },
    },
  },
};

const CHILD_ROW_SELECT = {
  id: true,
  name: true,
  sportRole: true,
  sportRoleVariant: true,
  gender: true,
  birthDate: true,
  athleteStatus: true,
  createdAt: true,
  ...GUARDIANS_SELECT,
  _count: { select: { registrations: true } },
  teamMemberships: {
    select: {
      id: true,
      teamId: true,
      isCaptain: true,
      team: { select: { id: true, name: true, season: true, color: true } },
    },
  },
};

/** Squadre a cui si assegnano gli atleti: la Karibu di stagione non ha una rosa sua. */
const seasonTeams = (season: string) =>
  prisma.competitiveTeam.findMany({
    where: { season, isMixed: false },
    select: { id: true, name: true, season: true, color: true },
    orderBy: { name: "asc" },
  });

/**
 * La pagina del dirigente: la rosa (la tab Atleti) in sola lettura. Niente
 * account, ospiti in attesa, schede da aprire o comandi; la data di nascita non
 * serve alla lista e non arriva al browser.
 */
async function ReadOnlyRoster() {
  const currentSeason = await getCurrentSeasonLabel();
  const [athleteUsers, childEntries, teams] = await Promise.all([
    prisma.user.findMany({
      where: ATHLETE_ACCOUNT_WHERE,
      orderBy: { name: "asc" },
      select: USER_ROW_SELECT,
    }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: [{ athleteStatus: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
      select: CHILD_ROW_SELECT,
    }),
    seasonTeams(currentSeason),
  ]);
  const rows: AdminRow[] = [
    ...athleteUsers.map((u) => ({ ...toUserEntry(u), birthDate: null, kind: "user" as const })),
    ...childEntries.map(({ guardians, ...c }) => ({
      ...c,
      birthDate: null,
      guardians: guardianList({ guardians }),
      kind: "child" as const,
    })),
  ];
  return (
    <>
      <PageHeader
        title="Utenti"
        subtitle="La rosa: chi gioca, con o senza account."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Utenti" }]}
      />
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        <AthletesTab rows={rows} teams={teams} currentSeason={currentSeason} readOnly />
      </Paper>
    </>
  );
}

export default async function AdminUtentiPage({ searchParams }: { searchParams: SearchParams }) {
  const { session, readOnly } = await requireAdminPage("/admin/utenti");
  if (readOnly) return <ReadOnlyRoster />;

  const sp = await searchParams;
  const search = (sp.search as string | undefined)?.trim() ?? "";
  // Piu' valori separati da virgola (es. ruoli Baskin 4 e 5 insieme).
  const appRoles = parseAppRoles(sp.appRole as string | undefined);
  const sportRoles = parseSportRoles(sp.sportRole as string | undefined);
  const gender = sp.gender as string | undefined;
  const teamId = sp.teamId as string | undefined;
  const athleteStatus = sp.athleteStatus as string | undefined;
  const tab = sp.tab as string | undefined;
  const sortBy = (sp.sortBy as string | undefined) ?? "createdAt";
  const sortDir = ((sp.sortDir as string | undefined) ?? "desc") as "asc" | "desc";
  // 25 e non 10: con 111 utenti la paginazione a dieci righe faceva dodici
  // pagine, ed e' il default gia' documentato in CLAUDE.md. Senza `limit`
  // nell'URL vale l'ultima scelta dello staff (cookie, vedi @/lib/rowsPerPage).
  const savedLimit = parseRowsPerPage(
    (await cookies()).get(rowsPerPageCookieName("users"))?.value,
    [10, 25, 50, 100],
    25
  );
  const limit = Math.min(
    100,
    Math.max(10, parseInt((sp.limit as string | undefined) ?? String(savedLimit), 10) || 25)
  );

  const isAdmin = session.user.appRole === "ADMIN";
  const currentSeason = await getCurrentSeasonLabel();

  const [users, athleteUsers, childEntries, teams] = await Promise.all([
    // Tab Account: tutti gli account, senza filtri ne' paginazione. Ricerca,
    // filtri, ordinamento e pagine avvengono nel browser, come nelle altre due
    // tab: con il filtro sul server ogni lettera digitata rifaceva tutta la
    // pagina (sei query) e la ricerca arrivava con secondi di ritardo.
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: USER_ROW_SELECT }),
    // Tab Atleti: tutti gli account che giocano, senza filtri ne' paginazione
    // (poche decine di righe: ricerca e filtri avvengono nel browser).
    prisma.user.findMany({
      where: ATHLETE_ACCOUNT_WHERE,
      orderBy: { name: "asc" },
      select: USER_ROW_SELECT,
    }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: [{ athleteStatus: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
      select: CHILD_ROW_SELECT,
    }),
    seasonTeams(currentSeason),
  ]);

  return (
    <>
      <PageHeader
        title="Utenti"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Utenti" }]}
        action={
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            <Button
              href="/admin/utenti/nuovo-figlio"
              variant="outlined"
              startIcon={<ChildCareIcon />}
            >
              Nuovo figlio
            </Button>
            <Button href="/admin/utenti/nuovo" variant="contained" startIcon={<PersonAddIcon />}>
              Nuovo utente
            </Button>
          </Stack>
        }
      />
      {/* I nuovi account da approvare li mostra la lista, dalle stesse righe. */}
      <AdminUserList
        users={users.map(toUserEntry)}
        athleteUsers={athleteUsers.map(toUserEntry)}
        childEntries={childEntries.map(({ guardians, ...c }) => ({
          ...c,
          guardians: guardianList({ guardians }),
        }))}
        initialTeams={teams}
        isAdmin={isAdmin}
        currentUserId={session.user.id ?? null}
        currentSeason={currentSeason}
        currentFilters={{
          search,
          appRole: joinFilter(appRoles),
          sportRole: joinFilter(sportRoles),
          gender,
          teamId,
          athleteStatus,
          sortBy,
          sortDir,
          limit,
          tab,
        }}
      />
    </>
  );
}

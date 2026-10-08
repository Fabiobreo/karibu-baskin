import { prisma } from "@/lib/db";
import AdminUserList from "@/components/admin/AdminUserList";
import GuestApprovalInbox from "@/components/admin/GuestApprovalInbox";
import { Paper, Button, Stack } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PageHeader from "@/components/common/PageHeader";
import type { AppRole, AthleteStatus, Gender, Prisma } from "@prisma/client";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { requireAdminPage } from "@/lib/adminAccess";
import AthletesTab from "@/components/admin/userList/AthletesTab";
import type { AdminRow } from "@/components/admin/userList/userListShared";
import { GUARDIANS_SELECT, guardianList } from "@/lib/guardians";
import { cookies } from "next/headers";
import { parseRowsPerPage, rowsPerPageCookieName } from "@/lib/rowsPerPage";
import { joinFilter, parseAppRoles, parseSportRoles, sportRoleWhere } from "@/lib/userFilters";
import { ATHLETE_ACCOUNT_WHERE, compareAthletes } from "@/lib/athletes";

export const revalidate = 60;

const VALID_GENDERS: Gender[] = ["MALE", "FEMALE"];
const VALID_ATHLETE_STATUSES: AthleteStatus[] = ["INACTIVE_SEASON", "FORMER"];

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
  const page = Math.max(1, parseInt((sp.page as string | undefined) ?? "1", 10));
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

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (appRoles.length > 0) where.appRole = { in: appRoles };
  // In AND: la ricerca usa gia' `where.OR`, e "senza ruolo o ruolo 1" e' un altro OR.
  const sportRoleCond = sportRoleWhere(sportRoles);
  if (sportRoleCond) where.AND = [sportRoleCond];
  if (gender === "none") where.gender = null;
  else if (gender && VALID_GENDERS.includes(gender as Gender)) where.gender = gender as Gender;
  if (teamId) where.teamMemberships = { some: { teamId } };
  if (athleteStatus === "active") where.athleteStatus = null;
  else if (athleteStatus && VALID_ATHLETE_STATUSES.includes(athleteStatus as AthleteStatus))
    where.athleteStatus = athleteStatus as AthleteStatus;

  // Genere: femmine, maschi, poi chi non l'ha indicato, come nelle altre tab.
  // Nel database l'enum è MALE, FEMALE: per avere le femmine prima il verso si
  // inverte. A parità decide il nome (vedi `orderBy` sotto).
  const chosenOrderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === "gender"
      ? { gender: { sort: sortDir === "asc" ? "desc" : "asc", nulls: "last" } }
      : sortBy === "name"
        ? { name: sortDir }
        : sortBy === "sportRole"
          ? { sportRole: sortDir }
          : sortBy === "appRole"
            ? { appRole: sortDir }
            : sortBy === "registrations"
              ? { registrations: { _count: sortDir } }
              : { createdAt: sortDir };

  // Attivi (athleteStatus null) sempre in cima; "In pausa" prima di "Ex"
  // (ordine enum). Dentro ogni gruppo si applica il sort scelto dall'utente.
  const orderBy: Prisma.UserOrderByWithRelationInput[] = [
    { athleteStatus: { sort: "asc", nulls: "first" } },
    chosenOrderBy,
    ...(sortBy === "gender" ? [{ name: "asc" as const }] : []),
  ];

  const isAdmin = session.user.appRole === "ADMIN";
  const currentSeason = await getCurrentSeasonLabel();

  // Ordinare per squadra non si può chiedere al database: la squadra è quella
  // della stagione in corso fra le tante di una persona. Si leggono gli id con
  // il minimo che serve, si ordinano qui con la regola della tab Atleti e si
  // carica solo la pagina. Sono poche centinaia di righe al massimo.
  let teamPageIds: string[] | null = null;
  if (sortBy === "team") {
    const light = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        sportRole: true,
        gender: true,
        athleteStatus: true,
        teamMemberships: { select: { team: { select: { season: true, name: true } } } },
        _count: { select: { registrations: true } },
      },
    });
    // Attivi in cima, poi "in pausa", poi "ex": come per le altre colonne.
    const statusRank = (s: AthleteStatus | null) =>
      s === null ? 0 : s === "INACTIVE_SEASON" ? 1 : 2;
    teamPageIds = light
      .sort(
        (a, b) =>
          statusRank(a.athleteStatus) - statusRank(b.athleteStatus) ||
          compareAthletes(a, b, "team", sortDir, currentSeason)
      )
      .slice((page - 1) * limit, page * limit)
      .map((u) => u.id);
  }
  const pageIds = teamPageIds;

  const [users, total, athleteUsers, childEntries, teams, pendingGuests] = await Promise.all([
    pageIds
      ? prisma.user
          .findMany({ where: { id: { in: pageIds } }, select: USER_ROW_SELECT })
          .then((rows) =>
            pageIds.flatMap((id) => {
              const row = rows.find((r) => r.id === id);
              return row ? [row] : [];
            })
          )
      : prisma.user.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          select: USER_ROW_SELECT,
        }),
    prisma.user.count({ where }),
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
    // Corsia rapida: nuovi account in attesa di approvazione
    prisma.user.findMany({
      where: { appRole: "GUEST" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
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
      <GuestApprovalInbox guests={pendingGuests} />
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
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
          serverTotal={total}
          serverPage={page}
          serverLimit={limit}
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
      </Paper>
    </>
  );
}

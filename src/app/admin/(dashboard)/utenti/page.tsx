import { prisma } from "@/lib/db";
import AdminUserList from "@/components/admin/AdminUserList";
import GuestApprovalInbox from "@/components/admin/GuestApprovalInbox";
import { Paper, Button, Stack } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PageHeader from "@/components/common/PageHeader";
import type { AppRole, AthleteStatus, Gender, Prisma } from "@prisma/client";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { auth } from "@/lib/authjs";
import { GUARDIANS_SELECT, guardianList } from "@/lib/guardians";
import { cookies } from "next/headers";
import { parseRowsPerPage, rowsPerPageCookieName } from "@/lib/rowsPerPage";
import { joinFilter, parseAppRoles, parseSportRoles, sportRoleWhere } from "@/lib/userFilters";
import { ATHLETE_ACCOUNT_WHERE } from "@/lib/athletes";

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

export default async function AdminUtentiPage({ searchParams }: { searchParams: SearchParams }) {
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

  const chosenOrderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === "name"
      ? { name: sortDir }
      : sortBy === "sportRole"
        ? { sportRole: sortDir }
        : sortBy === "appRole"
          ? { appRole: sortDir }
          : { createdAt: sortDir };

  // Attivi (athleteStatus null) sempre in cima; "In pausa" prima di "Ex"
  // (ordine enum). Dentro ogni gruppo si applica il sort scelto dall'utente.
  const orderBy: Prisma.UserOrderByWithRelationInput[] = [
    { athleteStatus: { sort: "asc", nulls: "first" } },
    chosenOrderBy,
  ];

  const select = {
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
    ratingMu: true,
    ratingSigma: true,
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

  const session = await auth();
  const isAdmin = session?.user?.appRole === "ADMIN";
  const currentSeason = await getCurrentSeasonLabel();

  const [users, total, athleteUsers, childEntries, teams, pendingGuests] = await Promise.all([
    prisma.user.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select }),
    prisma.user.count({ where }),
    // Tab Atleti: tutti gli account che giocano, senza filtri ne' paginazione
    // (poche decine di righe: ricerca e filtri avvengono nel browser).
    prisma.user.findMany({ where: ATHLETE_ACCOUNT_WHERE, orderBy: { name: "asc" }, select }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: [{ athleteStatus: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
        athleteStatus: true,
        ratingMu: true,
        ratingSigma: true,
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
      },
    }),
    prisma.competitiveTeam.findMany({
      // La Karibu di stagione non ha una rosa a cui assegnare gli atleti.
      where: { season: currentSeason, isMixed: false },
      select: { id: true, name: true, season: true, color: true },
      orderBy: { name: "asc" },
    }),
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
        title="Gestione Utenti"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Utenti" }]}
        action={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button
              href="/admin/utenti/nuovo-figlio"
              variant="outlined"
              startIcon={<ChildCareIcon />}
              size="small"
            >
              Nuovo figlio
            </Button>
            <Button
              href="/admin/utenti/nuovo"
              variant="contained"
              startIcon={<PersonAddIcon />}
              size="small"
            >
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

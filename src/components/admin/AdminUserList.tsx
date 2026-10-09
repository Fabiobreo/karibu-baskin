"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { writeRowsPerPageCookie } from "@/lib/rowsPerPage";
import { joinFilter, parseAppRoles, parseSportRoles } from "@/lib/userFilters";
import { usePathname } from "next/navigation";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_HIERARCHY } from "@/lib/authRoles";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import UserFilters from "@/components/admin/userList/UserFilters";
import UsersTable from "@/components/admin/userList/UsersTable";
import UsersMobileCards from "@/components/admin/userList/UsersMobileCards";
import ChildrenTab from "@/components/admin/userList/ChildrenTab";
import AthletesTab from "@/components/admin/userList/AthletesTab";
import { isAthleteAccount } from "@/lib/athletes";
import UserEditDialog from "@/components/admin/userList/UserEditDialog";
import GuestApprovalInbox from "@/components/admin/GuestApprovalInbox";
import type {
  AdminRow,
  ChildEntry,
  CurrentFilters,
  MembershipInfo,
  SortColumn,
  TeamInfo,
  UserEntry,
} from "@/components/admin/userList/userListShared";

/** Righe per pagina di default (vedi utenti/page.tsx). */
const DEFAULT_ROWS_PER_PAGE = 25;

type UserRow = UserEntry & { kind: "user" };
type TabKey = "athletes" | "accounts" | "children";

const toUserRow = (u: UserEntry): UserRow => ({ ...u, kind: "user" });

/** Attivi in cima, poi "In pausa", poi "Ex": dentro ogni gruppo l'ordine scelto. */
const ATHLETE_STATUS_RANK = { INACTIVE_SEASON: 1, FORMER: 2 } as const;

/**
 * Tab di partenza: Atleti, a meno che l'URL non chieda altro. Un link con dei
 * filtri (ricerca, ruolo utente…) parla della lista degli account.
 */
function initialTab(filters: CurrentFilters): TabKey {
  if (filters.tab === "figli") return "children";
  const hasAccountFilters =
    !!filters.search ||
    !!filters.appRole ||
    !!filters.sportRole ||
    !!filters.gender ||
    !!filters.teamId ||
    !!filters.athleteStatus;
  return filters.tab === "account" || hasAccountFilters ? "accounts" : "athletes";
}

export default function AdminUserList({
  users: initialUsers,
  athleteUsers: initialAthleteUsers,
  childEntries: initialChildren,
  initialTeams = [],
  isAdmin = false,
  currentUserId = null,
  currentFilters = {},
  currentSeason,
}: {
  /** Tutti gli account: ricerca, filtri e pagine della tab Account sono nel browser. */
  users: UserEntry[];
  /** Tutti gli account che giocano, per la tab Atleti (vedi `@/lib/athletes`). */
  athleteUsers: UserEntry[];
  childEntries: ChildEntry[];
  initialTeams?: TeamInfo[];
  isAdmin?: boolean;
  /** Chi sta guardando: nessuno cambia il proprio ruolo utente. */
  currentUserId?: string | null;
  /** Stagione in corso (flag dello staff, o calendario), dal Server Component. */
  currentSeason: string;
  currentFilters?: CurrentFilters;
}) {
  const pathname = usePathname();

  // Filtri della tab Account: partono dall'URL (link dalla dashboard, ricarica).
  const [search, setSearch] = useState(currentFilters.search ?? "");
  const [filterAppRoles, setFilterAppRoles] = useState<AppRole[]>(() =>
    parseAppRoles(currentFilters.appRole)
  );
  const [filterSportRoles, setFilterSportRoles] = useState<string[]>(() =>
    parseSportRoles(currentFilters.sportRole)
  );
  const [filterGender, setFilterGender] = useState(currentFilters.gender ?? "");
  const [filterTeamId, setFilterTeamId] = useState(currentFilters.teamId ?? "");
  const [filterAthleteStatus, setFilterAthleteStatus] = useState(
    currentFilters.athleteStatus ?? ""
  );

  const [sortBy, setSortBy] = useState<SortColumn>(
    (currentFilters.sortBy as SortColumn) ?? "createdAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    (currentFilters.sortDir as "asc" | "desc") ?? "desc"
  );

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(currentFilters.limit ?? DEFAULT_ROWS_PER_PAGE);

  // Account che giocano: tutti, indipendenti da filtri e pagina della tab Account.
  const [athleteUserRows, setAthleteUserRows] = useState<UserRow[]>(() =>
    initialAthleteUsers.map(toUserRow)
  );

  const [rows, setRows] = useState<AdminRow[]>(() => [
    ...initialUsers.map((u) => ({ ...u, kind: "user" as const })),
    ...initialChildren.map((c) => ({ ...c, kind: "child" as const })),
  ]);

  // Quando il server manda dati nuovi (router.refresh), sincronizza rows.
  // Usiamo un ref per non triggherare al primo render (initialUsers non cambia lì).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setRows([
      ...initialUsers.map((u) => ({ ...u, kind: "user" as const })),
      ...initialChildren.map((c) => ({ ...c, kind: "child" as const })),
    ]);
    setAthleteUserRows(initialAthleteUsers.map(toUserRow));
  }, [initialUsers, initialAthleteUsers, initialChildren]);

  const [activeTab, setActiveTab] = useState<TabKey>(() => initialTab(currentFilters));

  /**
   * Aggiorna una persona ovunque compaia. Un account puo' stare nella pagina
   * della tab Account, nella lista degli atleti o in entrambe; e una modifica
   * (ruolo utente, ruolo Baskin) puo' farlo entrare o uscire dagli atleti.
   */
  function updateRow(target: Pick<AdminRow, "kind" | "id">, change: (row: AdminRow) => AdminRow) {
    const isTarget = (r: AdminRow) => r.kind === target.kind && r.id === target.id;
    const current = athleteUserRows.find(isTarget) ?? rows.find(isTarget);
    if (!current) return;
    const next = change(current);
    setRows((prev) => prev.map((r) => (isTarget(r) ? next : r)));
    if (next.kind !== "user") return;
    setAthleteUserRows((prev) => {
      const others = prev.filter((r) => r.id !== next.id);
      return isAthleteAccount(next) ? [...others, next] : others;
    });
  }

  // Dialogs
  const [editRow, setEditRow] = useState<AdminRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Dopo un'eliminazione la riga e il suo "⋯" non ci sono più: il focus va sulla
  // scheda attiva (Atleti, Account, Figli), punto fisso sopra la lista.
  const tabsRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

  const availableTeams = initialTeams;

  const childCount = initialChildren.length;

  // ── Filtro + ordinamento (memo) ────────────────────────────────────────────

  const activeFilterCount =
    (filterAppRoles.length > 0 ? 1 : 0) +
    (filterSportRoles.length > 0 ? 1 : 0) +
    (filterGender ? 1 : 0) +
    (filterTeamId ? 1 : 0) +
    (filterAthleteStatus ? 1 : 0) +
    (search ? 1 : 0);

  const userRows = useMemo(() => rows.filter((r) => r.kind === "user"), [rows]);
  const userCount = userRows.length;

  // Account in attesa di approvazione, dal più recente. Sono le stesse righe
  // della tabella: approvare da lì (scheda utente) toglie l'account dal
  // riquadro in alto, e approvare dal riquadro aggiorna la riga.
  const pendingGuests = useMemo(
    () =>
      userRows
        .filter((r) => r.kind === "user" && r.appRole === "GUEST")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [userRows]
  );

  // Tab Account: filtra e ordina nel browser, come le altre due tab.
  const processed = useMemo(() => {
    let result = userRows;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.kind === "user" &&
          (r.name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      );
    }
    if (filterAppRoles.length > 0) {
      result = result.filter((r) => r.kind === "user" && filterAppRoles.includes(r.appRole));
    }
    if (filterSportRoles.length > 0) {
      result = result.filter((r) => {
        if (filterSportRoles.includes("none") && !r.sportRole) return true;
        if (r.sportRole && filterSportRoles.includes(r.sportRole.toString())) return true;
        return false;
      });
    }
    if (filterGender === "none") result = result.filter((r) => !r.gender);
    else if (filterGender) result = result.filter((r) => r.gender === filterGender);
    if (filterTeamId) {
      result = result.filter((r) =>
        r.teamMemberships.some((m) => m.teamId === filterTeamId && m.team.season === currentSeason)
      );
    }
    if (filterAthleteStatus === "active") result = result.filter((r) => !r.athleteStatus);
    else if (filterAthleteStatus)
      result = result.filter((r) => r.athleteStatus === filterAthleteStatus);

    const statusRank = (r: AdminRow) =>
      r.athleteStatus ? ATHLETE_STATUS_RANK[r.athleteStatus] : 0;
    return [...result].sort((a, b) => {
      const byStatus = statusRank(a) - statusRank(b);
      if (byStatus !== 0) return byStatus;
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "", "it");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "sportRole":
          cmp = (a.sportRole ?? 99) - (b.sportRole ?? 99);
          break;
        case "registrations":
          cmp = a._count.registrations - b._count.registrations;
          break;
        case "appRole": {
          const aRole = a.kind === "user" ? ROLE_HIERARCHY[a.appRole] : -1;
          const bRole = b.kind === "user" ? ROLE_HIERARCHY[b.appRole] : -1;
          cmp = aRole - bRole;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [
    userRows,
    search,
    filterAppRoles,
    filterSportRoles,
    filterGender,
    filterTeamId,
    filterAthleteStatus,
    currentSeason,
    sortBy,
    sortDir,
  ]);

  // Dopo un'eliminazione l'ultima pagina puo' restare vuota: si torna all'ultima piena.
  const lastPage = Math.max(0, Math.ceil(processed.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, lastPage);
  const paginated = processed.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

  // L'URL segue i filtri della tab Account senza chiedere niente al server:
  // ricaricando (o condividendo il link) si ritrova la stessa lista.
  useEffect(() => {
    if (activeTab !== "accounts") return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filterAppRoles.length > 0) params.set("appRole", joinFilter(filterAppRoles));
    if (filterSportRoles.length > 0) params.set("sportRole", joinFilter(filterSportRoles));
    if (filterGender) params.set("gender", filterGender);
    if (filterTeamId) params.set("teamId", filterTeamId);
    if (filterAthleteStatus) params.set("athleteStatus", filterAthleteStatus);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortDir !== "desc") params.set("sortDir", sortDir);
    params.set("tab", "account");
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }, [
    activeTab,
    search,
    filterAppRoles,
    filterSportRoles,
    filterGender,
    filterTeamId,
    filterAthleteStatus,
    sortBy,
    sortDir,
    pathname,
  ]);

  const childRows = useMemo(
    () => rows.filter((r): r is ChildEntry & { kind: "child" } => r.kind === "child"),
    [rows]
  );

  function handleSort(col: SortColumn) {
    // Date e conteggi partono dal più recente e dal più alto.
    const firstDir = col === "createdAt" || col === "registrations" ? "desc" : "asc";
    const newDir = sortBy === col ? (sortDir === "asc" ? "desc" : "asc") : firstDir;
    setSortBy(col);
    setSortDir(newDir);
    setPage(0);
  }

  function resetFilters() {
    setSearch("");
    setFilterAppRoles([]);
    setFilterSportRoles([]);
    setFilterGender("");
    setFilterTeamId("");
    setFilterAthleteStatus("");
    setPage(0);
  }

  // Scelta multipla: nell'URL i valori vanno separati da virgola (vedi
  // @/lib/userFilters), es. ruoli 4 e 5 insieme.
  function toggleAppRole(role: AppRole) {
    const newRoles = filterAppRoles.includes(role)
      ? filterAppRoles.filter((r) => r !== role)
      : [...filterAppRoles, role];
    setFilterAppRoles(newRoles);
    setPage(0);
  }

  function toggleSportRole(val: string) {
    const newVals = filterSportRoles.includes(val)
      ? filterSportRoles.filter((r) => r !== val)
      : [...filterSportRoles, val];
    setFilterSportRoles(newVals);
    setPage(0);
  }

  // ── Azioni tabella ────────────────────────────────────────────────────────

  async function handleConfirmSuggestedRole(row: UserEntry & { kind: "user" }) {
    if (!row.sportRoleSuggested) return;
    const res = await fetch(`/api/users/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sportRole: row.sportRoleSuggested,
        sportRoleVariant: row.sportRoleSuggestedVariant ?? null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      updateRow(row, (r) =>
        r.kind === "user"
          ? {
              ...r,
              sportRole: updated.sportRole,
              sportRoleVariant: updated.sportRoleVariant,
              sportRoleSuggested: null,
              sportRoleSuggestedVariant: null,
              sportRoleHistory:
                updated.sportRole !== null
                  ? [
                      { sportRole: updated.sportRole, changedAt: new Date().toISOString() },
                      ...r.sportRoleHistory,
                    ]
                  : r.sportRoleHistory,
            }
          : r
      );
      showToast({ message: "Ruolo confermato", severity: "success" });
    } else {
      showToast({ message: "Errore nella conferma", severity: "error" });
    }
  }

  async function handleRejectSuggestedRole(row: UserEntry & { kind: "user" }) {
    const res = await fetch(`/api/users/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearRoleSuggestion: true }),
    });
    if (res.ok) {
      updateRow(row, (r) =>
        r.kind === "user" ? { ...r, sportRoleSuggested: null, sportRoleSuggestedVariant: null } : r
      );
      showToast({ message: "Suggerimento rimosso", severity: "info" });
    } else {
      showToast({ message: "Errore nel rifiuto", severity: "error" });
    }
  }

  async function handleTeamChange(row: AdminRow, newTeamId: string) {
    const existing = row.teamMemberships.find((m) => m.team.season === currentSeason);
    if ((existing?.teamId ?? "") === newTeamId) return;
    try {
      if (existing) {
        await fetch(`/api/competitive-teams/${existing.teamId}/members/${existing.id}`, {
          method: "DELETE",
        });
      }
      let newMembership: MembershipInfo | null = null;
      if (newTeamId) {
        const body = row.kind === "user" ? { userId: row.id } : { childId: row.id };
        const res = await fetch(`/api/competitive-teams/${newTeamId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const teamInfo = availableTeams.find((t) => t.id === newTeamId);
          if (teamInfo)
            newMembership = { id: data.id, teamId: newTeamId, isCaptain: false, team: teamInfo };
        } else {
          showToast({ message: "Errore nell'assegnazione alla squadra", severity: "error" });
          return;
        }
      }
      updateRow(row, (r) => {
        const others = r.teamMemberships.filter((m) => m.team.season !== currentSeason);
        return { ...r, teamMemberships: newMembership ? [...others, newMembership] : others };
      });
      showToast({
        message: newTeamId ? "Squadra aggiornata" : "Rimosso dalla squadra",
        severity: "success",
      });
    } catch {
      showToast({ message: "Errore nella gestione della squadra", severity: "error" });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteRow) return;
    setDeleting(true);
    const url =
      deleteRow.kind === "user"
        ? `/api/users/${deleteRow.id}`
        : `/api/children/${deleteRow.id}?all=1`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        const gone = (r: AdminRow) => r.kind === deleteRow.kind && r.id === deleteRow.id;
        setRows((prev) => prev.filter((r) => !gone(r)));
        setAthleteUserRows((prev) => prev.filter((r) => !gone(r)));
        const label =
          deleteRow.kind === "user"
            ? `Utente "${deleteRow.name ?? deleteRow.email}" eliminato`
            : `Figlio "${deleteRow.name}" eliminato`;
        showToast({ message: label, severity: "success" });
        setDeleteRow(null);
        // Dopo il ripristino del focus del dialog, che punterebbe al "⋯" sparito.
        requestAnimationFrame(() =>
          tabsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
        );
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore durante l'eliminazione", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const summary =
    processed.length !== userCount ? `${processed.length} di ${userCount}` : `${userCount} account`;

  // La rosa: account che giocano e figli senza account, insieme.
  const athleteRows = useMemo<AdminRow[]>(
    () => [...athleteUserRows, ...childRows],
    [athleteUserRows, childRows]
  );
  const activeAthleteCount = athleteRows.filter((r) => r.athleteStatus === null).length;

  return (
    <>
      <GuestApprovalInbox
        guests={pendingGuests}
        isAdmin={isAdmin}
        onApproved={(id, appRole) =>
          updateRow({ kind: "user", id }, (r) => (r.kind === "user" ? { ...r, appRole } : r))
        }
      />
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        {/* ── Tabs ── */}
        <Tabs
          ref={tabsRef}
          value={activeTab === "children" && childCount === 0 ? "athletes" : activeTab}
          onChange={(_, v: TabKey) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ mb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}
        >
          {/* Il numero e' la rosa attiva: in pausa ed ex si vedono dal filtro di stato. */}
          <Tab value="athletes" label={`Atleti (${activeAthleteCount})`} />
          <Tab value="accounts" label={`Account (${userCount})`} />
          {childCount > 0 && <Tab value="children" label={`Figli senza account (${childCount})`} />}
        </Tabs>

        {/* Atleti: chi gioca, con o senza account */}
        {(activeTab === "athletes" || (activeTab === "children" && childCount === 0)) && (
          <AthletesTab
            rows={athleteRows}
            teams={availableTeams}
            currentSeason={currentSeason}
            isAdmin={isAdmin}
            onConfirmSuggestedRole={handleConfirmSuggestedRole}
            onRejectSuggestedRole={handleRejectSuggestedRole}
            onTeamChange={handleTeamChange}
            onEdit={setEditRow}
            onDelete={setDeleteRow}
          />
        )}

        {/* Account: chiunque possa entrare nell'app */}
        {activeTab === "accounts" && (
          <>
            <UserFilters
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(0);
              }}
              summary={summary}
              activeFilterCount={activeFilterCount}
              onResetFilters={resetFilters}
              filterAppRoles={filterAppRoles}
              onToggleAppRole={toggleAppRole}
              filterSportRoles={filterSportRoles}
              onToggleSportRole={toggleSportRole}
              filterGender={filterGender}
              onGenderChange={(v) => {
                setFilterGender(v);
                setPage(0);
              }}
              filterAthleteStatus={filterAthleteStatus}
              onAthleteStatusChange={(v) => {
                setFilterAthleteStatus(v);
                setPage(0);
              }}
              filterTeamId={filterTeamId}
              onTeamFilterChange={(v) => {
                setFilterTeamId(v);
                setPage(0);
              }}
              teams={availableTeams}
            />

            <UsersTable
              rows={paginated}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              teams={availableTeams}
              currentSeason={currentSeason}
              activeFilterCount={activeFilterCount}
              isAdmin={isAdmin}
              onConfirmSuggestedRole={handleConfirmSuggestedRole}
              onRejectSuggestedRole={handleRejectSuggestedRole}
              onTeamChange={handleTeamChange}
              onEdit={setEditRow}
              onDelete={setDeleteRow}
            />

            <UsersMobileCards
              rows={paginated}
              currentSeason={currentSeason}
              activeFilterCount={activeFilterCount}
              isAdmin={isAdmin}
              onEdit={setEditRow}
              onDelete={setDeleteRow}
            />

            {/* ── Paginazione ── */}
            <TablePagination
              component="div"
              count={processed.length}
              page={currentPage}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                const newLimit = parseInt(e.target.value);
                setRowsPerPage(newLimit);
                writeRowsPerPageCookie("users", newLimit);
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Righe:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            />
          </>
        )}

        {/* Figli senza account */}
        {activeTab === "children" && childCount > 0 && (
          <ChildrenTab
            childRows={childRows}
            teams={availableTeams}
            currentSeason={currentSeason}
            isAdmin={isAdmin}
            onTeamChange={handleTeamChange}
            onEdit={setEditRow}
            onDelete={setDeleteRow}
          />
        )}

        {/* ── Dialog conferma eliminazione ── */}
        <Dialog open={!!deleteRow} onClose={() => !deleting && setDeleteRow(null)}>
          <DialogTitle>
            {deleteRow?.kind === "user" ? "Elimina utente" : "Elimina figlio"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Sei sicuro di voler eliminare{" "}
              <strong>
                {deleteRow?.kind === "user" ? (deleteRow.name ?? deleteRow.email) : deleteRow?.name}
              </strong>
              ? Verranno eliminate anche tutte le iscrizioni associate. Questa azione è
              irreversibile.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteRow(null)} disabled={deleting}>
              Annulla
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Dialog modifica utente/figlio (montato solo quando aperto) ── */}
        {editRow && (
          <UserEditDialog
            row={editRow}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            teams={availableTeams}
            currentSeason={currentSeason}
            onClose={() => setEditRow(null)}
            onSaved={(updated) => {
              updateRow(updated, () => updated);
              // I genitori si salvano subito, a scheda aperta: la scheda deve
              // vedere la lista nuova.
              setEditRow((cur) =>
                cur && cur.id === updated.id && cur.kind === updated.kind ? updated : cur
              );
            }}
          />
        )}
      </Paper>
    </>
  );
}

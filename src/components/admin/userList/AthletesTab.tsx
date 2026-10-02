"use client";
import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  InputAdornment,
  Paper,
  TablePagination,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import { roleColorSx, sportRoleLabel } from "@/lib/constants";
import { teamFill } from "@/lib/teamColors";
import TeamColorDot from "@/components/teams/TeamColorDot";
import {
  DEFAULT_ATHLETE_FILTERS,
  countAthleteFilters,
  matchesAthleteFilters,
  type AthleteAccountFilter,
  type AthleteFilters,
  type AthleteStatusFilter,
} from "@/lib/athletes";
import AthletesTable, { type AthleteSortColumn } from "@/components/admin/userList/AthletesTable";
import {
  TOGGLE_SX,
  filterChipSx,
  type AdminRow,
  type TeamInfo,
  type UserEntry,
} from "@/components/admin/userList/userListShared";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TOUCH_FIELD_ON_PHONE, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

interface AthletesTabProps {
  /** Tutti gli atleti: account che giocano e figli senza account, in ogni stato. */
  rows: AdminRow[];
  teams: TeamInfo[];
  currentSeason: string;
  isAdmin: boolean;
  onConfirmSuggestedRole: (row: UserEntry & { kind: "user" }) => void;
  onRejectSuggestedRole: (row: UserEntry & { kind: "user" }) => void;
  onTeamChange: (row: AdminRow, teamId: string) => void;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
}

const STATUS_LABELS: Record<AthleteStatusFilter, string> = {
  active: "attivi",
  INACTIVE_SEASON: "in pausa",
  FORMER: "ex",
  all: "in tutto",
};

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={FONT_WEIGHT.semibold}
        sx={{ minWidth: 90 }}
      >
        {label}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>{children}</Box>
    </Box>
  );
}

/**
 * Tab "Atleti" di `/admin/utenti`: la rosa, cioe' chi gioca, con o senza
 * account (regola in `@/lib/athletes`). Parte dai soli attivi; in pausa ed ex
 * si vedono scegliendo lo stato. Gli atleti sono poche decine: si caricano
 * tutti e ricerca, filtri, ordinamento e paginazione avvengono nel browser.
 */
export default function AthletesTab({
  rows,
  teams,
  currentSeason,
  isAdmin,
  onConfirmSuggestedRole,
  onRejectSuggestedRole,
  onTeamChange,
  onEdit,
  onDelete,
}: AthletesTabProps) {
  const [filters, setFilters] = useState<AthleteFilters>(DEFAULT_ATHLETE_FILTERS);
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState<AthleteSortColumn>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage("athletes", [10, 25, 50, 100], 25);

  function update(patch: Partial<AthleteFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  }

  const filtered = useMemo(() => {
    const result = rows.filter((r) => matchesAthleteFilters(r, filters, currentSeason));
    return result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "sportRole") cmp = (a.sportRole ?? 99) - (b.sportRole ?? 99);
      else if (sortBy === "registrations") cmp = a._count.registrations - b._count.registrations;
      // A parita' (e per la colonna Atleta) decide il nome.
      if (cmp === 0) {
        const byName = (a.name ?? "").localeCompare(b.name ?? "", "it");
        return sortBy === "name" && sortDir === "desc" ? -byName : byName;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, filters, currentSeason, sortBy, sortDir]);

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const activeFilterCount = countAthleteFilters(filters);
  // Nel pannello chiuso stanno ruolo, squadra, genere e account: la ricerca e
  // lo stato sono sempre in vista.
  const panelFilterCount =
    (filters.sportRoles.length > 0 ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    (filters.teamId ? 1 : 0) +
    (filters.account ? 1 : 0);

  function handleSort(col: AthleteSortColumn) {
    setSortDir(sortBy === col && sortDir === "asc" ? "desc" : "asc");
    setSortBy(col);
    setPage(0);
  }

  function toggleSportRole(value: string) {
    update({
      sportRoles: filters.sportRoles.includes(value)
        ? filters.sportRoles.filter((v) => v !== value)
        : [...filters.sportRoles, value],
    });
  }

  const count = filtered.length;
  const summary = `${count} ${count === 1 ? "atleta" : "atleti"}${
    filters.status === "all" ? "" : ` ${STATUS_LABELS[filters.status]}`
  }`;

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca per nome, email o genitore..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          size="small"
          sx={{ width: { xs: "100%", sm: 280 }, ...TOUCH_FIELD_ON_PHONE }}
          slotProps={{
            htmlInput: { "aria-label": "Cerca fra gli atleti" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {/* Lo stato e' sempre in vista: e' il filtro che decide chi e' "in rosa". */}
        <ToggleButtonGroup
          value={filters.status}
          exclusive
          size="small"
          aria-label="Stato degli atleti"
          onChange={(_e, val: AthleteStatusFilter | null) => val && update({ status: val })}
        >
          <ToggleButton value="active" sx={TOGGLE_SX}>
            Attivi
          </ToggleButton>
          <ToggleButton value="INACTIVE_SEASON" sx={TOGGLE_SX}>
            In pausa
          </ToggleButton>
          <ToggleButton value="FORMER" sx={TOGGLE_SX}>
            Ex
          </ToggleButton>
          <ToggleButton value="all" sx={TOGGLE_SX}>
            Tutti
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {summary}
        </Typography>
        <Button
          size="small"
          sx={TOUCH_TARGET_ON_PHONE}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          startIcon={
            <Badge badgeContent={panelFilterCount} color="primary">
              <FilterListIcon fontSize="small" />
            </Badge>
          }
          endIcon={
            <ExpandMoreIcon
              fontSize="small"
              sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            />
          }
        >
          Filtri
        </Button>
        {activeFilterCount > 0 && (
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              setFilters(DEFAULT_ATHLETE_FILTERS);
              setPage(0);
            }}
          >
            Rimuovi filtri
          </Button>
        )}
      </Box>

      <Collapse in={open} unmountOnExit>
        <Paper
          variant="outlined"
          elevation={0}
          sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, mb: 2.5 }}
        >
          <FilterRow label="Ruolo Baskin">
            <Chip
              label="Non impostato"
              size="small"
              variant="outlined"
              onClick={() => toggleSportRole("none")}
              aria-pressed={filters.sportRoles.includes("none")}
              sx={filterChipSx(filters.sportRoles.includes("none"))}
            />
            {[1, 2, 3, 4, 5].map((r) => {
              const active = filters.sportRoles.includes(String(r));
              return (
                <Chip
                  key={r}
                  label={sportRoleLabel(r)}
                  size="small"
                  variant="outlined"
                  onClick={() => toggleSportRole(String(r))}
                  aria-pressed={active}
                  sx={filterChipSx(active, roleColorSx(r))}
                />
              );
            })}
          </FilterRow>

          <FilterRow label="Squadra">
            <Chip
              label="Senza squadra"
              size="small"
              variant="outlined"
              onClick={() => update({ teamId: filters.teamId === "none" ? "" : "none" })}
              aria-pressed={filters.teamId === "none"}
              sx={filterChipSx(filters.teamId === "none")}
            />
            {teams.map((t) => {
              const active = filters.teamId === t.id;
              const fill = teamFill(t.color);
              return (
                <Chip
                  key={t.id}
                  label={t.name}
                  size="small"
                  variant="outlined"
                  onClick={() => update({ teamId: active ? "" : t.id })}
                  aria-pressed={active}
                  sx={{
                    ...filterChipSx(active, fill && { bgcolor: fill.bg, color: fill.fg }),
                    "& .MuiChip-avatar": { width: "auto", height: "auto", ml: 1, mr: -0.5 },
                  }}
                  avatar={
                    fill && !active ? (
                      <Box component="span" sx={{ display: "inline-flex" }}>
                        <TeamColorDot color={t.color} />
                      </Box>
                    ) : undefined
                  }
                />
              );
            })}
          </FilterRow>

          <FilterRow label="Genere">
            <ToggleButtonGroup
              value={filters.gender}
              exclusive
              size="small"
              aria-label="Genere"
              onChange={(_e, val: string | null) => update({ gender: val ?? "" })}
            >
              <ToggleButton value="" sx={TOGGLE_SX}>
                Tutti
              </ToggleButton>
              <ToggleButton value="MALE" sx={TOGGLE_SX}>
                M
              </ToggleButton>
              <ToggleButton value="FEMALE" sx={TOGGLE_SX}>
                F
              </ToggleButton>
              <ToggleButton value="none" sx={TOGGLE_SX}>
                N/D
              </ToggleButton>
            </ToggleButtonGroup>
          </FilterRow>

          <FilterRow label="Account">
            <ToggleButtonGroup
              value={filters.account}
              exclusive
              size="small"
              aria-label="Account"
              onChange={(_e, val: AthleteAccountFilter | null) => update({ account: val ?? "" })}
            >
              <ToggleButton value="" sx={TOGGLE_SX}>
                Tutti
              </ToggleButton>
              <ToggleButton value="with" sx={TOGGLE_SX}>
                Con account
              </ToggleButton>
              <ToggleButton value="without" sx={TOGGLE_SX}>
                Senza account
              </ToggleButton>
            </ToggleButtonGroup>
          </FilterRow>
        </Paper>
      </Collapse>

      <AthletesTable
        rows={paginated}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        teams={teams}
        currentSeason={currentSeason}
        isAdmin={isAdmin}
        emptyLabel={
          activeFilterCount > 0
            ? "Nessun atleta corrisponde ai filtri selezionati."
            : "Nessun atleta attivo."
        }
        onConfirmSuggestedRole={onConfirmSuggestedRole}
        onRejectSuggestedRole={onRejectSuggestedRole}
        onTeamChange={onTeamChange}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count: total }) => `${from}–${to} di ${total}`}
      />
    </>
  );
}

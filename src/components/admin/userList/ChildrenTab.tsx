"use client";
import { useMemo, useState } from "react";
import { useRowsPerPage } from "@/hooks/useRowsPerPage";
import {
  Avatar,
  Box,
  Button,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import { sportRoleLabel, GENDER_LABELS_SHORT } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import { PersonNameButton, PersonRowMenu } from "@/components/admin/userList/PersonRowControls";
import {
  AthleteStatusChip,
  TeamCellSelect,
  type ChildEntry,
  type TeamInfo,
} from "@/components/admin/userList/userListShared";
import ChildrenMobileCards from "@/components/admin/userList/ChildrenMobileCards";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TOUCH_FIELD_ON_PHONE, TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

type ChildRow = ChildEntry & { kind: "child" };
type ChildSortColumn = "name" | "createdAt" | "sportRole";

interface ChildrenTabProps {
  childRows: ChildRow[];
  teams: TeamInfo[];
  currentSeason: string;
  /** Assegnare la squadra è dell'admin. */
  isAdmin: boolean;
  onTeamChange: (row: ChildRow, teamId: string) => void;
  onEdit: (row: ChildRow) => void;
  onDelete: (row: ChildRow) => void;
}

/**
 * Tab "Figli senza account": ricerca/ordinamento/paginazione sempre client-side
 * (i figli sono pochi e caricati tutti), tabella desktop + card mobile.
 */
export default function ChildrenTab({
  childRows,
  teams,
  currentSeason,
  isAdmin,
  onTeamChange,
  onEdit,
  onDelete,
}: ChildrenTabProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ChildSortColumn>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useRowsPerPage("children", [10, 25, 50, 100], 25);

  const filtered = useMemo(() => {
    let result = childRows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.guardians.some(
            (g) => g.name?.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
          )
      );
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name, "it");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "sportRole":
          cmp = (a.sportRole ?? 99) - (b.sportRole ?? 99);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [childRows, search, sortBy, sortDir]);

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  function handleSort(col: ChildSortColumn) {
    const newDir = sortBy === col ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortBy(col);
    setSortDir(newDir);
  }

  return (
    <>
      {/* ── Barra ricerca figli ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca per nome o genitore..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ width: { xs: "100%", sm: 280 }, ...TOUCH_FIELD_ON_PHONE }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {filtered.length !== childRows.length
            ? `${filtered.length} di ${childRows.length}`
            : `${childRows.length} figli senza account`}
        </Typography>
        <Button
          href="/admin/utenti/nuovo-figlio"
          variant="outlined"
          size="small"
          startIcon={<ChildCareIcon />}
          sx={TOUCH_TARGET_ON_PHONE}
        >
          Nuovo figlio
        </Button>
      </Box>

      {/* ── Tabella figli ── */}
      <TableContainer
        component={Box}
        sx={{
          display: { xs: "none", sm: "block" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: RADIUS.lg,
          overflowX: "auto",
        }}
      >
        <Table size="small" aria-label="Lista figli">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "name"}
                  direction={sortBy === "name" ? sortDir : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Nome
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Genitore</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortBy === "sportRole"}
                  direction={sortBy === "sportRole" ? sortDir : "asc"}
                  onClick={() => handleSort("sportRole")}
                >
                  Baskin
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Squadra</TableCell>
              <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Genere
              </TableCell>
              <TableCell align="center">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row) => (
              <TableRow key={`child-${row.id}`} hover>
                {/* Nome */}
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{ width: 30, height: 30, fontSize: TYPE_SCALE.sm, bgcolor: "grey.400" }}
                    >
                      {row.name[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <PersonNameButton name={row.name} onOpen={() => onEdit(row)} />
                      <AthleteStatusChip status={row.athleteStatus} />
                    </Box>
                  </Box>
                </TableCell>

                {/* Genitori */}
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  {row.guardians.map((g) => (
                    <Box key={g.id} sx={{ "& + &": { mt: 0.5 } }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        {g.name ?? g.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {g.email}
                      </Typography>
                    </Box>
                  ))}
                </TableCell>

                {/* Ruolo Baskin */}
                <TableCell align="center">
                  {row.sportRole ? (
                    <RoleBadge role={row.sportRole} variant={row.sportRoleVariant} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* Squadra */}
                <TableCell align="center">
                  <TeamCellSelect
                    value={
                      row.teamMemberships.find((m) => m.team.season === currentSeason)?.teamId ?? ""
                    }
                    teams={teams}
                    memberships={row.teamMemberships}
                    onChange={(teamId) => onTeamChange(row, teamId)}
                    ariaLabel={`Squadra di ${row.name}`}
                    readOnly={!isAdmin}
                  />
                </TableCell>

                {/* Genere */}
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.gender ? (
                    <Typography variant="body2">{GENDER_LABELS_SHORT[row.gender]}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* Azioni: un figlio senza account lo elimina anche l'allenatore. */}
                <TableCell align="center">
                  <PersonRowMenu
                    name={row.name}
                    canDelete
                    onOpen={() => onEdit(row)}
                    onDelete={() => onDelete(row)}
                  />
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {search
                    ? "Nessun risultato corrisponde alla ricerca."
                    : "Nessun figlio senza account trovato."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Mobile card view figli ── */}
      <ChildrenMobileCards
        rows={paginated}
        currentSeason={currentSeason}
        hasSearch={!!search}
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
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
      />
    </>
  );
}

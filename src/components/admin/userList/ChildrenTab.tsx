"use client";
import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
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
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ROLE_COLORS, sportRoleLabel, GENDER_LABELS_SHORT } from "@/lib/constants";
import RatingBadge from "@/components/rating/RatingBadge";
import {
  AthleteStatusChip,
  TeamCellSelect,
  type ChildEntry,
  type TeamInfo,
} from "@/components/admin/userList/userListShared";
import ChildrenMobileCards from "@/components/admin/userList/ChildrenMobileCards";

type ChildRow = ChildEntry & { kind: "child" };
type ChildSortColumn = "name" | "createdAt" | "sportRole";

interface ChildrenTabProps {
  childRows: ChildRow[];
  teams: TeamInfo[];
  currentSeason: string;
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
  onTeamChange,
  onEdit,
  onDelete,
}: ChildrenTabProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ChildSortColumn>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(() => {
    let result = childRows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.parent.name?.toLowerCase().includes(q) ||
          c.parent.email.toLowerCase().includes(q)
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
          sx={{ width: { xs: "100%", sm: 280 } }}
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
      </Box>

      {/* ── Tabella figli ── */}
      <TableContainer
        component={Box}
        sx={{
          display: { xs: "none", sm: "block" },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
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
              <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                Skill
              </TableCell>
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
                    <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "grey.400" }}>
                      {row.name[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {row.name}
                      </Typography>
                      <AthleteStatusChip status={row.athleteStatus} />
                    </Box>
                  </Box>
                </TableCell>

                {/* Genitore */}
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {row.parent.name ?? row.parent.email}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {row.parent.email}
                  </Typography>
                </TableCell>

                {/* Ruolo Baskin */}
                <TableCell align="center">
                  {row.sportRole ? (
                    <Chip
                      label={sportRoleLabel(row.sportRole, row.sportRoleVariant)}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[row.sportRole],
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.disabled">
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
                  />
                </TableCell>

                {/* Skill (TrueSkill) — solo COACH/ADMIN */}
                <TableCell align="center" sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <RatingBadge mu={row.ratingMu} sigma={row.ratingSigma} />
                </TableCell>

                {/* Genere */}
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {row.gender ? (
                    <Typography variant="body2">{GENDER_LABELS_SHORT[row.gender]}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* Azioni */}
                <TableCell align="center">
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                    <Tooltip title="Modifica figlio">
                      <IconButton
                        size="medium"
                        aria-label="Modifica figlio"
                        onClick={() => onEdit(row)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Elimina figlio">
                      <IconButton
                        size="medium"
                        aria-label="Elimina figlio"
                        color="error"
                        onClick={() => onDelete(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
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
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Righe:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} di ${count}`}
      />
    </>
  );
}

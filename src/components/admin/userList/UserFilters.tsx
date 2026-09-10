"use client";
import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  InputAdornment,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import { ALL_APP_ROLES, type TeamInfo } from "@/components/admin/userList/userListShared";

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  summary: string;
  activeFilterCount: number;
  onResetFilters: () => void;
  filterAppRoles: AppRole[];
  onToggleAppRole: (role: AppRole) => void;
  filterSportRoles: string[];
  onToggleSportRole: (value: string) => void;
  filterGender: string;
  onGenderChange: (value: string) => void;
  filterAthleteStatus: string;
  onAthleteStatusChange: (value: string) => void;
  filterTeamId: string;
  onTeamFilterChange: (teamId: string) => void;
  teams: TeamInfo[];
}

/** Barra di ricerca + filtri del tab Utenti (ruolo app, ruolo Baskin, genere, stato, squadra). */
export default function UserFilters({
  search,
  onSearchChange,
  summary,
  activeFilterCount,
  onResetFilters,
  filterAppRoles,
  onToggleAppRole,
  filterSportRoles,
  onToggleSportRole,
  filterGender,
  onGenderChange,
  filterAthleteStatus,
  onAthleteStatusChange,
  filterTeamId,
  onTeamFilterChange,
  teams,
}: UserFiltersProps) {
  // Cinque righe di chip prima del primo dato spingevano la tabella sotto la
  // piega. Il pannello parte chiuso, ma resta aperto se si arriva con dei
  // filtri gia' attivi (link condiviso, ritorno indietro): li' nasconderli
  // renderebbe incomprensibile una lista gia' filtrata.
  const [open, setOpen] = useState(activeFilterCount > 0);

  return (
    <>
      {/* ── Barra ricerca + info ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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
          {summary}
        </Typography>
        <Button
          size="small"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          startIcon={
            <Badge badgeContent={activeFilterCount} color="primary">
              <FilterListIcon fontSize="small" />
            </Badge>
          }
          endIcon={
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          }
        >
          Filtri
        </Button>
        {activeFilterCount > 0 && (
          <Button size="small" color="inherit" onClick={onResetFilters}>
            Rimuovi filtri
          </Button>
        )}
      </Box>

      {/* ── Filtri ── */}
      <Collapse in={open} unmountOnExit>
        <Paper
          variant="outlined"
          elevation={0}
          sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, mb: 2.5 }}
        >
          {/* Ruolo utente */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ minWidth: 90 }}
            >
              Ruolo utente
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {ALL_APP_ROLES.map((role) => (
                <Chip
                  key={role}
                  label={ROLE_LABELS_IT[role]}
                  size="small"
                  color={filterAppRoles.includes(role) ? ROLE_CHIP_COLORS[role] : "default"}
                  variant={filterAppRoles.includes(role) ? "filled" : "outlined"}
                  onClick={() => onToggleAppRole(role)}
                  aria-pressed={filterAppRoles.includes(role)}
                  sx={{
                    cursor: "pointer",
                    fontWeight: filterAppRoles.includes(role) ? 700 : 400,
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Ruolo Baskin */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ minWidth: 90 }}
            >
              Ruolo Baskin
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <Chip
                label="Non impostato"
                size="small"
                variant={filterSportRoles.includes("none") ? "filled" : "outlined"}
                onClick={() => onToggleSportRole("none")}
                aria-pressed={filterSportRoles.includes("none")}
                sx={{
                  cursor: "pointer",
                  fontWeight: filterSportRoles.includes("none") ? 700 : 400,
                }}
              />
              {[1, 2, 3, 4, 5].map((r) => {
                const active = filterSportRoles.includes(r.toString());
                return (
                  <Chip
                    key={r}
                    label={sportRoleLabel(r)}
                    size="small"
                    variant={active ? "filled" : "outlined"}
                    onClick={() => onToggleSportRole(r.toString())}
                    aria-pressed={active}
                    sx={{
                      cursor: "pointer",
                      fontWeight: active ? 700 : 400,
                      bgcolor: active ? ROLE_COLORS[r] : undefined,
                      color: active ? "#fff" : undefined,
                      borderColor: active ? ROLE_COLORS[r] : undefined,
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Genere */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ minWidth: 90 }}
            >
              Genere
            </Typography>
            <ToggleButtonGroup
              value={filterGender}
              exclusive
              size="small"
              onChange={(_e, val) => onGenderChange(val ?? "")}
            >
              <ToggleButton value="" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                Tutti
              </ToggleButton>
              <ToggleButton value="MALE" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                M
              </ToggleButton>
              <ToggleButton value="FEMALE" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                F
              </ToggleButton>
              <ToggleButton value="none" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                N/D
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Stato atleta */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ minWidth: 90 }}
            >
              Stato
            </Typography>
            <ToggleButtonGroup
              value={filterAthleteStatus}
              exclusive
              size="small"
              onChange={(_e, val) => onAthleteStatusChange(val ?? "")}
            >
              <ToggleButton value="" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                Tutti
              </ToggleButton>
              <ToggleButton value="active" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                Attivi
              </ToggleButton>
              <ToggleButton value="INACTIVE_SEASON" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                In pausa
              </ToggleButton>
              <ToggleButton value="FORMER" sx={{ px: 1.5, fontSize: "0.75rem" }}>
                Ex
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Squadra */}
          {teams.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ minWidth: 90 }}
              >
                Squadra
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {teams.map((t) => {
                  const active = filterTeamId === t.id;
                  return (
                    <Chip
                      key={t.id}
                      label={t.name}
                      size="small"
                      variant={active ? "filled" : "outlined"}
                      onClick={() => onTeamFilterChange(active ? "" : t.id)}
                      aria-pressed={active}
                      sx={{
                        cursor: "pointer",
                        fontWeight: active ? 700 : 400,
                        ...(active && t.color
                          ? {
                              bgcolor: t.color,
                              color: contrastText(t.color),
                              borderColor: t.color,
                            }
                          : {}),
                      }}
                      avatar={
                        t.color && !active ? (
                          <Box
                            component="span"
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: t.color,
                              ml: "6px !important",
                              mr: "-4px !important",
                            }}
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </Paper>
      </Collapse>
    </>
  );
}

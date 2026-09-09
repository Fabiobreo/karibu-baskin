"use client";

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Grid2 as Grid,
  Tabs,
  Tab,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { differenceInYears } from "date-fns";
import {
  sportRoleLabel,
  ROLE_COLORS,
  ROLE_GROUPS,
  ROLES,
  roleGroupOf,
  type RoleGroupKey,
} from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import { contrastText } from "@/lib/colorUtils";
import type { Gender } from "@prisma/client";

// ── Tipi ──────────────────────────────────────────────────────────────────────

type Athlete = {
  id: string;
  name: string | null;
  image?: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: Gender | null;
  birthDate: Date | string | null;
};

type Membership = {
  id: string;
  isCaptain: boolean;
  userId: string | null;
  childId: string | null;
  user: (Athlete & { image: string | null }) | null;
  child: Athlete | null;
};

type Team = {
  id: string;
  name: string;
  season: string;
  color: string | null;
  memberships: Membership[];
};

type OtherTeam = {
  id: string;
  name: string;
  memberships: { userId: string | null; childId: string | null }[];
};

interface AdminRosaClientProps {
  team: Team;
  users: Athlete[];
  childPlayers: Athlete[];
  otherTeams: OtherTeam[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ageFrom(birthDate: Date | string | null): number | null {
  if (!birthDate) return null;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  return differenceInYears(new Date(), d);
}

function genderShort(g: Gender | null): string | null {
  if (!g) return null;
  return g === "MALE" ? "M" : "F";
}

// ── Componente principale ────────────────────────────────────────────────────

export default function AdminRosaClient({
  team: initialTeam,
  users,
  childPlayers,
  otherTeams,
}: AdminRosaClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [team, setTeam] = useState(initialTeam);
  const [isPending, startTransition] = useTransition();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  // Filtri pool
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<number | "all">("all");
  const [filterGender, setFilterGender] = useState<Gender | "all">("all");
  const [filterKind, setFilterKind] = useState<"all" | "user" | "child">("all");

  // Tab mobile
  const [mobileTab, setMobileTab] = useState<"roster" | "pool">("roster");

  const teamColor = team.color ?? "#FF6D00";

  // ── Calcoli per la rosa ──────────────────────────────────────────────────────

  const membersByGroup = useMemo(() => {
    const map = new Map<RoleGroupKey | "none", Membership[]>();
    for (const m of team.memberships) {
      const role = m.user?.sportRole ?? m.child?.sportRole ?? null;
      const key: RoleGroupKey | "none" = roleGroupOf(role) ?? "none";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [team.memberships]);

  // ── Pool: chi è disponibile da aggiungere ────────────────────────────────────

  const otherTeamByUserId = useMemo(() => {
    const m = new Map<string, OtherTeam>();
    for (const t of otherTeams) {
      for (const mb of t.memberships) {
        if (mb.userId) m.set(mb.userId, t);
      }
    }
    return m;
  }, [otherTeams]);

  const otherTeamByChildId = useMemo(() => {
    const m = new Map<string, OtherTeam>();
    for (const t of otherTeams) {
      for (const mb of t.memberships) {
        if (mb.childId) m.set(mb.childId, t);
      }
    }
    return m;
  }, [otherTeams]);

  type PoolEntry = {
    key: string;
    kind: "user" | "child";
    id: string;
    athlete: Athlete;
    otherTeamName: string | null;
  };

  const pool: PoolEntry[] = useMemo(() => {
    const memberUserIds = new Set(
      team.memberships.map((m) => m.userId).filter((x): x is string => !!x)
    );
    const memberChildIds = new Set(
      team.memberships.map((m) => m.childId).filter((x): x is string => !!x)
    );

    const entries: PoolEntry[] = [];
    for (const u of users) {
      if (memberUserIds.has(u.id)) continue;
      entries.push({
        key: `u:${u.id}`,
        kind: "user",
        id: u.id,
        athlete: u,
        otherTeamName: otherTeamByUserId.get(u.id)?.name ?? null,
      });
    }
    for (const c of childPlayers) {
      if (memberChildIds.has(c.id)) continue;
      entries.push({
        key: `c:${c.id}`,
        kind: "child",
        id: c.id,
        athlete: c,
        otherTeamName: otherTeamByChildId.get(c.id)?.name ?? null,
      });
    }
    return entries.sort((a, b) => (a.athlete.name ?? "").localeCompare(b.athlete.name ?? "", "it"));
  }, [users, childPlayers, team.memberships, otherTeamByUserId, otherTeamByChildId]);

  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool.filter((e) => {
      if (q && !(e.athlete.name ?? "").toLowerCase().includes(q)) return false;
      if (filterRole !== "all" && e.athlete.sportRole !== filterRole) return false;
      if (filterGender !== "all" && e.athlete.gender !== filterGender) return false;
      if (filterKind !== "all" && e.kind !== filterKind) return false;
      return true;
    });
  }, [pool, search, filterRole, filterGender, filterKind]);

  // ── Azioni ───────────────────────────────────────────────────────────────────

  async function addMember(entry: PoolEntry) {
    setPendingMemberId(entry.key);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/competitive-teams/${team.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            entry.kind === "child" ? { childId: entry.id } : { userId: entry.id }
          ),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
        const created = await res.json();
        const newMembership: Membership = {
          id: created.id,
          isCaptain: created.isCaptain ?? false,
          userId: created.userId ?? null,
          childId: created.childId ?? null,
          user:
            entry.kind === "user" ? { ...entry.athlete, image: entry.athlete.image ?? null } : null,
          child: entry.kind === "child" ? entry.athlete : null,
        };
        setTeam((prev) => ({ ...prev, memberships: [...prev.memberships, newMembership] }));
        showToast({ message: `${entry.athlete.name} aggiunto in rosa`, severity: "success" });
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : "Errore",
          severity: "error",
        });
      } finally {
        setPendingMemberId(null);
      }
    });
  }

  async function removeMember(m: Membership) {
    setPendingMemberId(m.id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/competitive-teams/${team.id}/members/${m.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Errore eliminazione");
        setTeam((prev) => ({
          ...prev,
          memberships: prev.memberships.filter((x) => x.id !== m.id),
        }));
        showToast({ message: "Atleta rimosso dalla rosa", severity: "success" });
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : "Errore",
          severity: "error",
        });
      } finally {
        setPendingMemberId(null);
      }
    });
  }

  async function toggleCaptain(m: Membership) {
    setPendingMemberId(m.id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/competitive-teams/${team.id}/members/${m.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCaptain: !m.isCaptain }),
        });
        if (!res.ok) throw new Error("Errore");
        setTeam((prev) => ({
          ...prev,
          memberships: prev.memberships.map((x) =>
            x.id === m.id ? { ...x, isCaptain: !m.isCaptain } : x
          ),
        }));
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : "Errore",
          severity: "error",
        });
      } finally {
        setPendingMemberId(null);
      }
    });
  }

  // ── Render: roster column ────────────────────────────────────────────────────

  const rosterColumn = (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: teamColor,
          color: contrastText(teamColor),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="subtitle1" fontWeight={800}>
          Rosa attuale
        </Typography>
        <Chip
          label={`${team.memberships.length} ${team.memberships.length === 1 ? "atleta" : "atleti"}`}
          size="small"
          sx={{
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.2),
            color: "common.white",
            fontWeight: 700,
          }}
        />
      </Box>

      <Box sx={{ p: 2 }}>
        {team.memberships.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <PersonOffIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Rosa vuota. Aggiungi atleti dal pool a destra.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {ROLE_GROUPS.map((g) => {
              const members = membersByGroup.get(g.key) ?? [];
              const shortfall = Math.max(0, g.min - members.length);
              return (
                <GroupSection
                  key={g.key}
                  label={g.label}
                  representativeRole={g.roles[0]}
                  required={g.min}
                  shortfall={shortfall}
                  members={members}
                  teamColor={teamColor}
                  pendingMemberId={pendingMemberId}
                  onRemove={removeMember}
                  onToggleCaptain={toggleCaptain}
                />
              );
            })}
            {(membersByGroup.get("none") ?? []).length > 0 && (
              <GroupSection
                label="Senza ruolo"
                representativeRole={null}
                required={0}
                shortfall={0}
                members={membersByGroup.get("none") ?? []}
                teamColor={teamColor}
                pendingMemberId={pendingMemberId}
                onRemove={removeMember}
                onToggleCaptain={toggleCaptain}
              />
            )}
          </Stack>
        )}
      </Box>
    </Paper>
  );

  // ── Render: pool column ──────────────────────────────────────────────────────

  const poolColumn = (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" fontWeight={800}>
          Atleti disponibili
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Click su + per aggiungere alla rosa
        </Typography>
      </Box>

      {/* Filtri */}
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack spacing={1.5}>
          <TextField
            size="small"
            placeholder="Cerca per nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Ruolo:
            </Typography>
            <Chip
              label="Tutti"
              size="small"
              variant={filterRole === "all" ? "filled" : "outlined"}
              color={filterRole === "all" ? "primary" : "default"}
              onClick={() => setFilterRole("all")}
            />
            {ROLES.map((r) => (
              <Chip
                key={r}
                label={`R${r}`}
                size="small"
                variant={filterRole === r ? "filled" : "outlined"}
                onClick={() => setFilterRole(r)}
                sx={{
                  fontWeight: 700,
                  ...(filterRole === r && {
                    bgcolor: ROLE_COLORS[r],
                    color: "common.white",
                  }),
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filterGender}
              onChange={(_, v) => v && setFilterGender(v)}
            >
              <ToggleButton value="all">Tutti</ToggleButton>
              <ToggleButton value="MALE">M</ToggleButton>
              <ToggleButton value="FEMALE">F</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filterKind}
              onChange={(_, v) => v && setFilterKind(v)}
            >
              <ToggleButton value="all">Tutti</ToggleButton>
              <ToggleButton value="user">Utenti</ToggleButton>
              <ToggleButton value="child">Figli</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </Box>

      {/* Lista pool */}
      <Box sx={{ p: 1.5, maxHeight: { md: "70vh" }, overflowY: { md: "auto" } }}>
        {filteredPool.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.disabled">
              {pool.length === 0
                ? "Tutti gli atleti sono già in rosa"
                : "Nessun atleta corrisponde ai filtri"}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.5}>
            {filteredPool.map((entry) => (
              <PoolRow
                key={entry.key}
                entry={entry}
                disabled={isPending && pendingMemberId !== entry.key}
                loading={pendingMemberId === entry.key}
                onAdd={() => addMember(entry)}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );

  // ── Render finale ────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Mobile: tabs */}
      <Box sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
        <Tabs value={mobileTab} onChange={(_, v) => setMobileTab(v)} variant="fullWidth">
          <Tab
            value="roster"
            label={`Rosa (${team.memberships.length})`}
            sx={{ fontWeight: 700 }}
          />
          <Tab value="pool" label={`Disponibili (${pool.length})`} sx={{ fontWeight: 700 }} />
        </Tabs>
        <Box sx={{ mt: 2 }}>{mobileTab === "roster" ? rosterColumn : poolColumn}</Box>
      </Box>

      {/* Desktop: due colonne */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Grid container spacing={2}>
          <Grid size={{ md: 6 }}>{rosterColumn}</Grid>
          <Grid size={{ md: 6 }}>{poolColumn}</Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={() => router.push("/admin/squadre")} variant="outlined">
          Torna alle squadre
        </Button>
      </Box>
    </Box>
  );
}

// ── Sotto-componenti ──────────────────────────────────────────────────────────

function GroupSection({
  label,
  representativeRole,
  required,
  shortfall,
  members,
  teamColor,
  pendingMemberId,
  onRemove,
  onToggleCaptain,
}: {
  label: string;
  /** Ruolo usato per il colore dell'header; null = grigio (senza ruolo) */
  representativeRole: number | null;
  required: number;
  shortfall: number;
  members: Membership[];
  teamColor: string;
  pendingMemberId: string | null;
  onRemove: (m: Membership) => void;
  onToggleCaptain: (m: Membership) => void;
}) {
  const isShortfall = shortfall > 0;
  const isMet = required > 0 && shortfall === 0;
  const roleColor = representativeRole == null ? "#9e9e9e" : ROLE_COLORS[representativeRole];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1,
          pb: 0.5,
          borderBottom: "2px solid",
          borderColor: roleColor,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: roleColor,
            flexShrink: 0,
          }}
        />
        <Typography variant="subtitle2" fontWeight={800}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          {members.length}
          {required > 0 && ` / ${required} richiesti`}
        </Typography>
        {isShortfall && (
          <Tooltip title={`Mancano ${shortfall} atleta/i per questo ruolo`}>
            <WarningAmberIcon sx={{ fontSize: 18, color: "warning.main" }} />
          </Tooltip>
        )}
        {isMet && <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />}
      </Box>

      {members.length === 0 ? (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: "block", py: 1, fontStyle: "italic" }}
        >
          Nessun atleta in questo ruolo
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {members.map((m) => (
            <MemberRow
              key={m.id}
              membership={m}
              teamColor={teamColor}
              loading={pendingMemberId === m.id}
              onRemove={() => onRemove(m)}
              onToggleCaptain={() => onToggleCaptain(m)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function MemberRow({
  membership,
  teamColor,
  loading,
  onRemove,
  onToggleCaptain,
}: {
  membership: Membership;
  teamColor: string;
  loading: boolean;
  onRemove: () => void;
  onToggleCaptain: () => void;
}) {
  const m = membership;
  const athlete = m.user ?? m.child;
  if (!athlete) return null;
  const name = athlete.name ?? "—";
  const image = m.user?.image ?? null;
  const age = ageFrom(athlete.birthDate);
  const gShort = genderShort(athlete.gender);
  const isChild = !!m.child;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: m.isCaptain ? `${teamColor}66` : "divider",
        bgcolor: m.isCaptain ? `${teamColor}0a` : "transparent",
      }}
    >
      <Avatar
        src={image ?? undefined}
        sx={{
          width: 32,
          height: 32,
          fontSize: 13,
          bgcolor: teamColor,
          color: contrastText(teamColor),
        }}
      >
        {name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {name}
          </Typography>
          {isChild && (
            <Chip
              label="Figlio"
              size="small"
              sx={{ height: 15, fontSize: "0.58rem", fontWeight: 700 }}
            />
          )}
          {m.isCaptain && (
            <Chip
              label="Capitano"
              size="small"
              sx={{
                height: 16,
                fontSize: "0.6rem",
                bgcolor: "medal.gold",
                color: "common.white",
                fontWeight: 700,
              }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25 }}>
          {athlete.sportRole && (
            <Chip
              label={sportRoleLabel(athlete.sportRole, athlete.sportRoleVariant)}
              size="small"
              sx={{
                bgcolor: ROLE_COLORS[athlete.sportRole],
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.6rem",
                height: 16,
              }}
            />
          )}
          {gShort && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
              {gShort}
            </Typography>
          )}
          {age != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
              · {age}a
            </Typography>
          )}
        </Box>
      </Box>
      <Tooltip title={m.isCaptain ? "Rimuovi capitano" : "Nomina capitano"}>
        <span>
          <IconButton
            size="small"
            onClick={onToggleCaptain}
            disabled={loading}
            sx={{ color: m.isCaptain ? "medal.gold" : "action.disabled" }}
          >
            <EmojiEventsIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Rimuovi dalla rosa">
        <span>
          <IconButton size="small" color="error" onClick={onRemove} disabled={loading}>
            {loading ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

function PoolRow({
  entry,
  disabled,
  loading,
  onAdd,
}: {
  entry: {
    key: string;
    kind: "user" | "child";
    athlete: Athlete;
    otherTeamName: string | null;
  };
  disabled: boolean;
  loading: boolean;
  onAdd: () => void;
}) {
  const { athlete, otherTeamName, kind } = entry;
  const name = athlete.name ?? "—";
  const age = ageFrom(athlete.birthDate);
  const gShort = genderShort(athlete.gender);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Avatar src={athlete.image ?? undefined} sx={{ width: 30, height: 30, fontSize: 12 }}>
        {name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {name}
          </Typography>
          {kind === "child" && (
            <Chip
              label="Figlio"
              size="small"
              sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700 }}
            />
          )}
          {otherTeamName && (
            <Tooltip title={`Già in rosa con ${otherTeamName}`}>
              <Chip
                label={otherTeamName}
                size="small"
                color="warning"
                sx={{ height: 14, fontSize: "0.55rem", fontWeight: 700 }}
              />
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25 }}>
          {athlete.sportRole ? (
            <Chip
              label={sportRoleLabel(athlete.sportRole, athlete.sportRoleVariant)}
              size="small"
              sx={{
                bgcolor: ROLE_COLORS[athlete.sportRole],
                color: "common.white",
                fontWeight: 700,
                fontSize: "0.58rem",
                height: 15,
              }}
            />
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
              Ruolo non assegnato
            </Typography>
          )}
          {gShort && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
              {gShort}
            </Typography>
          )}
          {age != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
              · {age}a
            </Typography>
          )}
        </Box>
      </Box>
      <Tooltip
        title={
          otherTeamName
            ? `Non aggiungibile: è già in rosa con ${otherTeamName}`
            : "Aggiungi alla rosa"
        }
      >
        <span>
          <IconButton
            size="small"
            color="primary"
            onClick={onAdd}
            disabled={disabled || loading || !!otherTeamName}
          >
            {loading ? <CircularProgress size={14} /> : <AddIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

"use client";

import { useState } from "react";
import {
  Box, Typography, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow, Avatar, Chip,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WarningIcon from "@mui/icons-material/Warning";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/authRoles";
import AdminAnonymousRegistrations from "@/components/AdminAnonymousRegistrations";

type RecentUser = {
  kind: "user";
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  appRole: string;
  createdAt: Date | string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  sportRoleSuggested: number | null;
  sportRoleSuggestedVariant: string | null;
};

type RecentChild = {
  kind: "child";
  id: string;
  name: string | null;
  createdAt: Date | string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  parent: { name: string | null; email: string | null };
};

type RecentRow = RecentUser | RecentChild;

type AnonReg = {
  id: string;
  name: string;
  anonymousEmail: string | null;
  role: number;
  createdAt: Date | string;
  session: { id: string; date: Date | string; dateSlug: string | null };
};

interface Props {
  recentAll: RecentRow[];
  registrations: AnonReg[];
}

export default function AdminDashboardTabs({ recentAll, registrations }: Props) {
  const [tab, setTab] = useState(0);

  const anonGroups = (() => {
    const map = new Map<string, boolean>();
    for (const r of registrations) {
      const key = r.name.toLowerCase().trim();
      if (!map.has(key)) map.set(key, false);
      if (r.anonymousEmail) map.set(key, true);
    }
    return map;
  })();
  const anonCount = anonGroups.size;
  const anonNoEmail = Array.from(anonGroups.values()).filter((hasEmail) => !hasEmail).length;

  return (
    <Paper elevation={2} sx={{ overflow: "hidden" }}>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider", minHeight: 44 }}
        TabIndicatorProps={{ style: { height: 3 } }}
      >
        <Tab
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <PersonAddIcon sx={{ fontSize: 16 }} />
              <span>Ultimi iscritti</span>
            </Box>
          }
          sx={{ minHeight: 44, fontSize: "0.82rem", fontWeight: 600, textTransform: "none" }}
        />
        <Tab
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <WarningIcon sx={{ fontSize: 16 }} />
              <span>Iscrizioni anonime</span>
              {anonCount > 0 && (
                <Chip
                  label={anonNoEmail > 0 ? `${anonNoEmail} senza email` : anonCount}
                  size="small"
                  color={anonNoEmail > 0 ? "warning" : "default"}
                  sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                />
              )}
            </Box>
          }
          sx={{ minHeight: 44, fontSize: "0.82rem", fontWeight: 600, textTransform: "none" }}
        />
      </Tabs>

      {/* Tab 0: Ultimi iscritti */}
      {tab === 0 && (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Ultimi iscritti
            </Typography>
            <Link href="/admin/utenti" style={{ textDecoration: "none" }}>
              <Typography variant="caption" color="primary" sx={{ "&:hover": { textDecoration: "underline" } }}>
                Vedi tutti →
              </Typography>
            </Link>
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 0, width: 40 }} />
                  <TableCell sx={{ fontWeight: 700 }}>Utente</TableCell>
                  <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Ruolo utente</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Ruolo Baskin</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Iscritto il</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentAll.map((row) => (
                  <TableRow key={`${row.kind}-${row.id}`} hover>
                    <TableCell sx={{ width: 40, pl: 0 }}>
                      <Avatar
                        src={row.kind === "user" ? (row.image ?? undefined) : undefined}
                        sx={{ width: 30, height: 30, fontSize: 13, bgcolor: row.kind === "child" ? "grey.400" : undefined }}
                      >
                        {(row.name ?? (row.kind === "user" ? row.email : "?"))?.[0]?.toUpperCase() ?? "?"}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{row.name ?? "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.kind === "user"
                          ? row.email
                          : `Figlio di ${row.parent.name ?? row.parent.email}`}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      {row.kind === "user"
                        ? <Chip label={ROLE_LABELS_IT[row.appRole as keyof typeof ROLE_LABELS_IT]} size="small" color={ROLE_CHIP_COLORS[row.appRole as keyof typeof ROLE_CHIP_COLORS]} sx={{ fontWeight: 600 }} />
                        : <Chip label="Atleta" size="small" color="primary" sx={{ fontWeight: 600 }} />
                      }
                    </TableCell>
                    <TableCell align="center">
                      {row.sportRole
                        ? <Chip
                            label={sportRoleLabel(row.sportRole, row.sportRoleVariant ?? undefined)}
                            size="small"
                            sx={{ bgcolor: ROLE_COLORS[row.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}
                          />
                        : row.kind === "user" && row.sportRoleSuggested
                          ? <Chip
                              label={`${sportRoleLabel(row.sportRoleSuggested, row.sportRoleSuggestedVariant ?? undefined)} ?`}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: ROLE_COLORS[row.sportRoleSuggested], color: ROLE_COLORS[row.sportRoleSuggested], fontWeight: 700, fontSize: "0.72rem" }}
                            />
                          : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(row.createdAt), "d MMM yyyy", { locale: it })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {recentAll.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      Nessun utente ancora iscritto
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {/* Tab 1: Iscrizioni anonime */}
      {tab === 1 && (
        <AdminAnonymousRegistrations registrations={registrations} bare />
      )}
    </Paper>
  );
}

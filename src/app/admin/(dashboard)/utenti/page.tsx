import { prisma } from "@/lib/db";
import AdminUserList from "@/components/AdminUserList";
import { Typography, Box, Paper, Button } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import type { AppRole, Gender, Prisma } from "@prisma/client";

export const revalidate = 0;

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
const VALID_GENDERS: Gender[] = ["MALE", "FEMALE"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminUtentiPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const search = (sp.search as string | undefined)?.trim() ?? "";
  const appRole = sp.appRole as AppRole | undefined;
  const sportRole = sp.sportRole as string | undefined;
  const gender = sp.gender as string | undefined;
  const sortBy = (sp.sortBy as string | undefined) ?? "createdAt";
  const sortDir = ((sp.sortDir as string | undefined) ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt((sp.page as string | undefined) ?? "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt((sp.limit as string | undefined) ?? "25", 10)));

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (appRole && VALID_ROLES.includes(appRole)) where.appRole = appRole;
  if (sportRole === "none") where.sportRole = null;
  else if (sportRole) { const n = parseInt(sportRole, 10); if (!isNaN(n)) where.sportRole = n; }
  if (gender === "none") where.gender = null;
  else if (gender && VALID_GENDERS.includes(gender as Gender)) where.gender = gender as Gender;

  const orderBy: Prisma.UserOrderByWithRelationInput = sortBy === "name"
    ? { name: sortDir }
    : sortBy === "sportRole"
    ? { sportRole: sortDir }
    : sortBy === "appRole"
    ? { appRole: sortDir }
    : { createdAt: sortDir };

  const select = {
    id: true, name: true, email: true, image: true, appRole: true,
    sportRole: true, sportRoleVariant: true, sportRoleSuggested: true, sportRoleSuggestedVariant: true,
    gender: true, birthDate: true, createdAt: true,
    _count: { select: { registrations: true } },
    sportRoleHistory: { orderBy: { changedAt: "desc" as const }, select: { sportRole: true, changedAt: true } },
  };

  const [users, total, childEntries] = await Promise.all([
    prisma.user.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select }),
    prisma.user.count({ where }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, sportRole: true, sportRoleVariant: true,
        gender: true, birthDate: true, createdAt: true,
        parent: { select: { name: true, email: true } },
        _count: { select: { registrations: true } },
      },
    }),
  ]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <Button startIcon={<ArrowBackIcon />} size="small" sx={{ fontWeight: 500 }}>
              Dashboard
            </Button>
          </Link>
          <Typography variant="h5" fontWeight={700}>
            Gestione Utenti
          </Typography>
        </Box>
        <Link href="/admin/utenti/nuovo" style={{ textDecoration: "none" }}>
          <Button variant="contained" startIcon={<PersonAddIcon />} size="small">
            Nuovo utente
          </Button>
        </Link>
      </Box>
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        <AdminUserList
          users={users}
          childEntries={childEntries}
          serverTotal={total}
          serverPage={page}
          serverLimit={limit}
          currentFilters={{ search, appRole, sportRole, gender, sortBy, sortDir, limit }}
        />
      </Paper>
    </Box>
  );
}

import { prisma } from "@/lib/db";
import AdminUserList from "@/components/AdminUserList";
import { Typography, Box, Paper, Button } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";

export const revalidate = 0;

export default async function AdminUtentiPage() {
  const [users, childEntries] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
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
        createdAt: true,
        _count: { select: { registrations: true } },
        sportRoleHistory: {
          orderBy: { changedAt: "desc" },
          select: { sportRole: true, changedAt: true },
        },
      },
    }),
    prisma.child.findMany({
      where: { userId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        sportRole: true,
        sportRoleVariant: true,
        gender: true,
        birthDate: true,
        createdAt: true,
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
            <Button
              startIcon={<ArrowBackIcon />}
              size="small"
              sx={{ fontWeight: 500 }}
            >
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
        <AdminUserList users={users} childEntries={childEntries} />
      </Paper>
    </Box>
  );
}

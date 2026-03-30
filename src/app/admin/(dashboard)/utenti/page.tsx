import { prisma } from "@/lib/db";
import AdminUserList from "@/components/AdminUserList";
import { Typography, Box } from "@mui/material";

export const revalidate = 0;

export default async function AdminUtentiPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
      createdAt: true,
      _count: { select: { registrations: true } },
    },
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Gestione Utenti
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {users.length} utenti registrati — modifica i ruoli dalla tabella sottostante.
      </Typography>
      <AdminUserList users={users} />
    </Box>
  );
}

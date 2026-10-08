import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { canViewAdminPanel } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import { Container } from "@mui/material";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Staff e dirigenti. Cosa vede ognuno lo decide la pagina (`requireAdminPage`).
  if (!canViewAdminPanel(session?.user?.appRole as AppRole | undefined)) {
    redirect("/admin/login");
  }

  return (
    // L'intestazione del pannello (`AdminHeader`) la monta il layout radice,
    // fuori dal <main>.
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {children}
    </Container>
  );
}

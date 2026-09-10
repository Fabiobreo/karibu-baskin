import { redirect } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import AdminNavBar from "@/components/admin/AdminNavBar";
import { Container } from "@mui/material";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const allowed = session?.user?.appRole && hasRole(session.user.appRole as AppRole, "COACH");

  if (!allowed) {
    redirect("/admin/login");
  }

  return (
    <>
      <AdminNavBar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </>
  );
}

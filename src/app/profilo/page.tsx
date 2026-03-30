import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Avatar, Chip, Divider } from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import { ROLE_LABELS_IT } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import ParentChildLinker from "@/components/ParentChildLinker";

export const revalidate = 0;

export default async function ProfiloPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      childLinks: {
        include: { child: { select: { id: true, name: true, email: true, image: true, appRole: true } } },
      },
    },
  });

  if (!user) redirect("/login");

  const isParent = user.appRole === "PARENT" || user.appRole === "ADMIN";

  return (
    <>
      <SiteHeader />
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Il mio profilo
        </Typography>

        {/* Info utente */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar src={user.image ?? undefined} sx={{ width: 56, height: 56 }}>
              {user.name?.[0] ?? user.email[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{user.name ?? "—"}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
            </Box>
          </Box>
          <Chip
            label={ROLE_LABELS_IT[user.appRole as AppRole]}
            color={user.appRole === "GUEST" ? "default" : "primary"}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {user.appRole === "GUEST" && (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
              Il tuo account è in attesa di approvazione da parte dell&apos;admin.
            </Typography>
          )}
        </Paper>

        {/* Sezione figli (solo PARENT e ADMIN) */}
        {isParent && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              I miei figli
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Collega il profilo di tuo figlio/a per iscriverlo agli allenamenti.
            </Typography>
            <ParentChildLinker
              initialChildren={user.childLinks.map((l) => l.child)}
            />
          </>
        )}
      </Container>
    </>
  );
}

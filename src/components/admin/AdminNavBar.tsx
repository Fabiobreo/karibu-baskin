"use client";
import { Box, Container, Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sezioni principali del pannello; gli strumenti (export, audit, …) restano
// raggiungibili dalle NavCard della dashboard per non affollare la barra.
const NAV_ITEMS: { label: string; href: string; exact?: boolean }[] = [
  { label: "Dashboard", href: "/admin", exact: true },
  { label: "Allenamenti", href: "/admin/allenamenti" },
  { label: "Partite", href: "/admin/partite" },
  { label: "Eventi", href: "/admin/eventi" },
  { label: "News", href: "/admin/news" },
  { label: "Utenti", href: "/admin/utenti" },
  { label: "Squadre", href: "/admin/squadre" },
  { label: "Gironi", href: "/admin/gironi" },
];

/** Barra di navigazione persistente del pannello admin (tab orizzontali scrollabili). */
export default function AdminNavBar() {
  const pathname = usePathname();

  // Voce attiva per prefisso (es. /admin/partite/xyz/convocazioni → Partite)
  const active =
    NAV_ITEMS.find((item) =>
      item.exact ? pathname === item.href : pathname?.startsWith(item.href)
    )?.href ?? false;

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 2 } }}>
        <Tabs
          value={active}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Sezioni pannello admin"
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              px: 1.75,
            },
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Tab
              key={item.href}
              value={item.href}
              label={item.label}
              component={Link}
              href={item.href}
            />
          ))}
        </Tabs>
      </Container>
    </Box>
  );
}

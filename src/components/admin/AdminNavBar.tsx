"use client";
import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sezioni principali del pannello; gli strumenti (export, audit, …) restano
// raggiungibili dalla dashboard per non affollare la barra.
const NAV_ITEMS: { label: string; href: string; exact?: boolean }[] = [
  { label: "Dashboard", href: "/admin", exact: true },
  { label: "Allenamenti da completare", href: "/admin/allenamenti" },
  { label: "Partite", href: "/admin/partite" },
  { label: "Eventi", href: "/admin/eventi" },
  { label: "News", href: "/admin/news" },
  { label: "Utenti", href: "/admin/utenti" },
  { label: "Squadre", href: "/admin/squadre" },
  { label: "Gironi", href: "/admin/gironi" },
];

// L'arancione scuro del brand, fisso in entrambi i temi come lo e' l'AppBar:
// e' colore di chrome, non una superficie di contenuto. Il bianco sopra fa
// 5,60:1, quindi le etichette restano leggibili senza scale di opacita'.
const ADMIN_BAND = "#BF360C";
const ADMIN_BAND_SELECTED = "rgba(0,0,0,0.22)";

/**
 * Barra di navigazione persistente del pannello admin.
 *
 * Cinque etichette (Allenamenti, Partite, Eventi, News, Squadre) sono identiche
 * a quelle del menu pubblico trenta pixel più sopra e portano altrove, e niente
 * diceva di essere passati in area gestione. La barra ora si dichiara: banda
 * arancione piena, che non si confonde ne' col menu pubblico scuro ne' col
 * corpo della pagina, ed etichetta "Amministrazione" a sinistra. Le voci
 * restano corte, che e' quello che serve a una barra scrollabile.
 */
export default function AdminNavBar() {
  const pathname = usePathname();

  // Voce attiva per prefisso (es. /admin/partite/xyz/convocazioni → Partite)
  const active =
    NAV_ITEMS.find((item) =>
      item.exact ? pathname === item.href : pathname?.startsWith(item.href)
    )?.href ?? false;

  return (
    <Box
      component="nav"
      aria-label="Navigazione pannello amministrazione"
      sx={{ bgcolor: ADMIN_BAND, color: "common.white" }}
    >
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 2 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexShrink: 0,
              pl: { xs: 0.5, sm: 0 },
            }}
          >
            <ShieldIcon sx={{ fontSize: 18, color: "common.white" }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontSize: "0.65rem",
                color: "common.white",
                display: { xs: "none", md: "block" },
              }}
            >
              Amministrazione
            </Typography>
          </Box>

          <Tabs
            value={active}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Sezioni pannello amministrazione"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              "& .MuiTabs-indicator": { backgroundColor: "common.white", height: 3 },
              "& .MuiTabs-scrollButtons": { color: "common.white" },
              "& .MuiTab-root": {
                minHeight: 44,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                px: 1.75,
                // Tutte le etichette a bianco pieno: la selezionata si
                // distingue per peso e riempimento, non abbassando il
                // contrasto delle altre.
                color: "common.white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                "&.Mui-selected": {
                  color: "common.white",
                  fontWeight: 800,
                  bgcolor: ADMIN_BAND_SELECTED,
                },
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
        </Box>
      </Container>
    </Box>
  );
}

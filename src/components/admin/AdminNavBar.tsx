"use client";
import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

// Sezioni principali del pannello; gli strumenti (export, audit, …) restano
// raggiungibili dalla dashboard per non affollare la barra.
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

/**
 * Barra di navigazione persistente del pannello admin.
 *
 * Cinque etichette (Allenamenti, Partite, Eventi, News, Squadre) sono identiche
 * a quelle del menu pubblico trenta pixel più sopra e portano altrove, e niente
 * diceva di essere passati in area gestione. La barra ora si dichiara con lo
 * scudo e l'etichetta "Amministrazione" a sinistra, su una banda neutra
 * (`palette.adminBand`: carta e divisore). L'arancio resta solo sulla voce
 * selezionata e sull'indicatore, perche' e' lo stato attivo (UX-29). Le voci
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
      sx={{
        bgcolor: "adminBand.bg",
        color: "adminBand.text",
        borderBottom: 1,
        borderColor: "adminBand.border",
      }}
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
            <ShieldIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: FONT_WEIGHT.bold,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontSize: TYPE_SCALE.xs,
                color: "text.secondary",
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
              "& .MuiTabs-indicator": { backgroundColor: "adminBand.indicator", height: 3 },
              "& .MuiTabs-scrollButtons": { color: "adminBand.text" },
              "& .MuiTab-root": {
                minHeight: 44,
                textTransform: "none",
                fontWeight: FONT_WEIGHT.semibold,
                fontSize: TYPE_SCALE.sm,
                px: 1.75,
                // Etichette a contrasto pieno (MUI le metterebbe su
                // text.secondary): la selezionata si distingue per colore,
                // peso e sottolineatura, non abbassando il contrasto delle altre.
                color: "adminBand.text",
                "&:hover": { bgcolor: "adminBand.hover" },
                "&.Mui-selected": {
                  color: "adminBand.accent",
                  fontWeight: FONT_WEIGHT.bold,
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
                // Sono link di navigazione, non tab di un pannello: la voce
                // corrente va annunciata come pagina, non solo evidenziata.
                aria-current={active === item.href ? "page" : undefined}
              />
            ))}
          </Tabs>
        </Box>
      </Container>
    </Box>
  );
}

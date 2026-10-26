"use client";
import { useState, type ComponentProps } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import AdminSquadreClient from "@/components/admin/AdminSquadreClient";
import AdminAvversarieClient from "@/components/admin/AdminAvversarieClient";

export type SquadreSection = "nostre" | "avversarie";

interface AdminSquadreViewProps {
  initialSection: SquadreSection;
  ours: ComponentProps<typeof AdminSquadreClient>;
  /** Assente per il dirigente: la scheda delle avversarie è solo dello staff. */
  opponents?: ComponentProps<typeof AdminAvversarieClient>;
}

/**
 * `/admin/squadre`: le nostre squadre, divise per stagione, e l'anagrafica
 * delle avversarie, che vale per tutte le stagioni. Una voce di menu sola, due
 * schede perché le due liste non hanno né filtri né azioni in comune.
 */
export default function AdminSquadreView({
  initialSection,
  ours,
  opponents,
}: AdminSquadreViewProps) {
  const [section, setSection] = useState<SquadreSection>(opponents ? initialSection : "nostre");

  function changeSection(next: SquadreSection) {
    setSection(next);
    // La scheda resta nell'indirizzo: ricaricando o tornando indietro si riapre lì.
    const url = new URL(window.location.href);
    if (next === "nostre") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  // Al dirigente niente schede: vede solo le nostre squadre.
  if (!opponents) return <AdminSquadreClient {...ours} />;

  return (
    <Box>
      <Box sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs
          value={section}
          onChange={(_, value: SquadreSection) => changeSection(value)}
          variant="scrollable"
          scrollButtons={false}
          aria-label="Sezioni delle squadre"
          sx={{ "& .MuiTab-root": { minHeight: 48 } }}
        >
          <Tab
            value="nostre"
            label="Le nostre"
            id="squadre-tab-nostre"
            aria-controls="squadre-panel-nostre"
          />
          <Tab
            value="avversarie"
            label="Avversarie"
            id="squadre-tab-avversarie"
            aria-controls="squadre-panel-avversarie"
          />
        </Tabs>
      </Box>

      {/* Tutte e due restano montate: passando da una scheda all'altra non si
          perde quello che si è appena aggiunto o la stagione scelta. */}
      <Box
        role="tabpanel"
        id="squadre-panel-nostre"
        aria-labelledby="squadre-tab-nostre"
        hidden={section !== "nostre"}
      >
        <AdminSquadreClient {...ours} />
      </Box>
      <Box
        role="tabpanel"
        id="squadre-panel-avversarie"
        aria-labelledby="squadre-tab-avversarie"
        hidden={section !== "avversarie"}
      >
        <AdminAvversarieClient {...opponents} />
      </Box>
    </Box>
  );
}

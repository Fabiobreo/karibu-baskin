"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Button, Dialog, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AdminSessionForm from "@/components/admin/AdminSessionForm";
import PageHeader, { type BreadcrumbItem } from "@/components/common/PageHeader";
import AdminUpcomingList, { type AdminUpcomingRow } from "@/components/admin/AdminUpcomingList";
import AdminAllenamentiClient, {
  type AdminSessionRow,
} from "@/components/admin/AdminAllenamentiClient";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export type TrainingsSection = "prossimi" | "da-completare" | "conclusi";

interface AdminTrainingsViewProps {
  upcoming: AdminUpcomingRow[];
  toComplete: AdminSessionRow[];
  concluded: AdminSessionRow[];
  initialSection: TrainingsSection;
  /** Allenamento da aprire subito (`?apri=<id>`, dal sito pubblico o dal calendario). */
  openId: string | null;
  /** Allenamento da aprire in modifica (`?modifica=<id>`). */
  editId: string | null;
  /** Intestazione della pagina: il bottone "Nuovo allenamento" sta nel suo slot (UX-51). */
  header: { title: string; subtitle?: string; breadcrumb: BreadcrumbItem[] };
}

/**
 * Tutto il ciclo di vita di un allenamento in una vista (UX-14): Prossimi
 * (iscritti, iscrizioni, squadre), Da completare (presenze e risultati),
 * Conclusi (correzioni). Prima creazione, iscrizioni e squadre stavano sulla
 * pagina pubblica /allenamenti.
 */
export default function AdminTrainingsView({
  upcoming,
  toComplete,
  concluded,
  initialSection,
  openId,
  editId,
  header,
}: AdminTrainingsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [section, setSection] = useState<TrainingsSection>(initialSection);
  const [creating, setCreating] = useState(false);
  const [creatingBusy, setCreatingBusy] = useState(false);

  function changeSection(next: TrainingsSection) {
    setSection(next);
    // Nell'URL, cosi' tornando indietro o ricaricando si resta sulla sezione.
    router.replace(`${pathname}?sezione=${next}`, { scroll: false });
  }

  const tabs: { value: TrainingsSection; label: string }[] = [
    { value: "prossimi", label: `Prossimi (${upcoming.length})` },
    { value: "da-completare", label: `Da completare (${toComplete.length})` },
    { value: "conclusi", label: `Conclusi (${concluded.length})` },
  ];

  return (
    <Box>
      <PageHeader
        {...header}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Nuovo allenamento
          </Button>
        }
      />
      <Box sx={{ mb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs
          value={section}
          onChange={(_, v: TrainingsSection) => changeSection(v)}
          variant="scrollable"
          // Niente frecce: tre schede, e su telefono si scorre col dito (UX-40).
          scrollButtons={false}
          aria-label="Sezioni degli allenamenti"
          sx={{ "& .MuiTab-root": { minHeight: 48 } }}
        >
          {tabs.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>
      </Box>

      {section === "prossimi" && (
        <AdminUpcomingList sessions={upcoming} initialOpenId={openId} initialEditId={editId} />
      )}
      {section === "da-completare" && (
        <AdminAllenamentiClient
          sessions={toComplete}
          initialOpenId={openId}
          initialEditId={editId}
        />
      )}
      {section === "conclusi" && (
        <AdminAllenamentiClient
          sessions={concluded}
          variant="concluded"
          initialOpenId={openId}
          initialEditId={editId}
        />
      )}

      <Dialog
        open={creating}
        onClose={() => !creatingBusy && setCreating(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Nuovo allenamento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <AdminSessionForm
              showTitle={false}
              onLoadingChange={setCreatingBusy}
              onCreated={() => {
                setCreating(false);
                changeSection("prossimi");
                router.refresh();
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

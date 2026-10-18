"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AdminSessionForm from "@/components/admin/AdminSessionForm";
import PageHeader, { type BreadcrumbItem } from "@/components/common/PageHeader";
import AdminUpcomingList, { type AdminUpcomingRow } from "@/components/admin/AdminUpcomingList";
import AdminAllenamentiClient, {
  type AdminSessionRow,
} from "@/components/admin/AdminAllenamentiClient";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { duplicateFormValues, type DuplicateSource } from "@/lib/trainingDuplicate";

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
  /** Dirigente: legge iscritti, squadre, presenze e risultati, senza comandi. */
  readOnly?: boolean;
  /** Allenamento da duplicare (`?duplica=<id>`): apre "Nuovo allenamento" già compilato. */
  duplicateFrom?: DuplicateTemplate | null;
}

/** Quello che serve per duplicare un allenamento. */
export interface DuplicateTemplate extends DuplicateSource {
  id: string;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
}

const SOURCE_DATE = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "long",
  day: "numeric",
  month: "long",
});

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
  readOnly = false,
  duplicateFrom = null,
}: AdminTrainingsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [section, setSection] = useState<TrainingsSection>(initialSection);
  // Il modello da cui parte il modulo: l'allenamento da duplicare, o niente.
  const [template, setTemplate] = useState<DuplicateTemplate | null>(
    readOnly ? null : duplicateFrom
  );
  const [creating, setCreating] = useState(!!template);
  const [creatingBusy, setCreatingBusy] = useState(false);
  // "Duplica" porta a questa stessa pagina con `?duplica=<id>`: il componente
  // resta montato, quindi il modello nuovo si prende quando cambia la prop.
  const [seenDuplicate, setSeenDuplicate] = useState(duplicateFrom?.id ?? null);
  const incoming = readOnly ? null : (duplicateFrom?.id ?? null);
  if (incoming !== seenDuplicate) {
    setSeenDuplicate(incoming);
    if (duplicateFrom && incoming) {
      setTemplate(duplicateFrom);
      setCreating(true);
    }
  }

  function closeCreate() {
    setCreating(false);
    if (template) {
      setTemplate(null);
      // Via `?duplica=` dall'URL: ricaricando non deve riaprirsi.
      router.replace(`${pathname}?sezione=${section}`, { scroll: false });
    }
  }

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
          readOnly ? undefined : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setTemplate(null);
                setCreating(true);
              }}
            >
              Nuovo allenamento
            </Button>
          )
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
        <AdminUpcomingList
          sessions={upcoming}
          initialOpenId={openId}
          initialEditId={editId}
          readOnly={readOnly}
        />
      )}
      {section === "da-completare" && (
        <AdminAllenamentiClient
          sessions={toComplete}
          initialOpenId={openId}
          initialEditId={editId}
          readOnly={readOnly}
        />
      )}
      {section === "conclusi" && (
        <AdminAllenamentiClient
          sessions={concluded}
          variant="concluded"
          initialOpenId={openId}
          initialEditId={editId}
          readOnly={readOnly}
        />
      )}

      <Dialog
        open={creating && !readOnly}
        onClose={() => !creatingBusy && closeCreate()}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
          {template ? "Duplica allenamento" : "Nuovo allenamento"}
        </DialogTitle>
        <DialogContent>
          {template && (
            <Typography variant="body2" color="text.secondary">
              Copia di &quot;{template.title}&quot; ({SOURCE_DATE.format(new Date(template.date))}):
              cambia quello che serve. Iscrizioni, squadre e risultati non si copiano.
            </Typography>
          )}
          <Box sx={{ pt: 1 }}>
            <AdminSessionForm
              // Un modulo nuovo per ogni modello: i valori iniziali si leggono una volta.
              key={template?.id ?? "nuovo"}
              showTitle={false}
              onLoadingChange={setCreatingBusy}
              // La data proposta si calcola quando il modulo nasce (cambia la
              // `key` a ogni modello), non quando si è aperta la pagina: con il
              // pannello aperto da giorni proporrebbe una data già passata.
              // Il modulo legge i valori iniziali una volta sola.
              initialValues={template ? duplicateFormValues(template, new Date()) : undefined}
              initialRestrictions={
                template
                  ? {
                      allowedRoles: template.allowedRoles,
                      restrictTeamId: template.restrictTeamId,
                      openRoles: template.openRoles,
                    }
                  : undefined
              }
              onCreated={() => {
                setCreating(false);
                setTemplate(null);
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

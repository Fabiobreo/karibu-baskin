"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import type { DrillCourt, DrillKind } from "@prisma/client";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/admin/RowActions";
import BoardSvg from "@/components/board/BoardSvg";
import DrillFormDialog from "./DrillFormDialog";
import DrillStateChip from "./DrillStateChip";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { interpolateStep } from "@/lib/board/animation";
import type { DrillContent } from "@/lib/board/content";
import {
  DRILL_COURT_LABELS,
  DRILL_KIND_LABELS,
  type AdminDrillRow,
  type DrillTeamOption,
} from "@/lib/board/labels";
import { TOUCH_FIELD_ON_PHONE } from "@/lib/touchTarget";
import { RADIUS } from "@/lib/radius";

export interface AdminDrillListItem extends AdminDrillRow {
  content: DrillContent;
}

interface AdminDrillListClientProps {
  drills: AdminDrillListItem[];
  teams: DrillTeamOption[];
  readOnly: boolean;
}

type StatusFilter = "active" | "DRAFT" | "PUBLISHED" | "archived";

/**
 * Lavagna nel pannello (UX-72): gli schemi a card con la miniatura del primo
 * passo, filtri e azioni. "Nuovo schema" chiede titolo, tipo e campo e apre
 * l'editor. Il dirigente guarda soltanto.
 */
export default function AdminDrillListClient({
  drills,
  teams,
  readOnly,
}: AdminDrillListClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<DrillKind | "">("");
  const [court, setCourt] = useState<DrillCourt | "">("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const titleRef = useRef<HTMLHeadingElement>(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drills.filter(
      (d) =>
        (!q || d.title.toLowerCase().includes(q)) &&
        (!kind || d.kind === kind) &&
        (!court || d.court === court) &&
        (!teamId || d.competitiveTeamId === teamId) &&
        (status === "archived"
          ? d.archived
          : !d.archived && (status === "active" || d.status === status))
    );
  }, [drills, search, kind, court, teamId, status]);

  const action = useMutation({
    mutationFn: async ({ url, init }: { url: string; init: RequestInit; done: string }) => {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(await readError(res));
      return res.json() as Promise<{ id?: string; archived?: boolean }>;
    },
    onSuccess: (data, { done }) => {
      showToast({
        message: data.archived ? "Schema archiviato: è usato in un allenamento" : done,
        severity: "success",
      });
      router.refresh();
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const setDrillStatus = (d: AdminDrillListItem, next: "DRAFT" | "PUBLISHED") =>
    action.mutate({
      url: `/api/drills/${d.id}`,
      init: {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      },
      done:
        next === "PUBLISHED"
          ? "Schema pubblicato: lo vedono i tesserati"
          : "Schema rimesso in bozza",
    });

  return (
    <>
      <PageHeader
        title="Lavagna"
        subtitle="Schemi ed esercizi da mostrare in palestra e da ritrovare negli allenamenti"
        titleRef={titleRef}
        action={
          readOnly ? undefined : (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
              Nuovo schema
            </Button>
          )
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "2fr 1fr 1fr 1fr 1fr" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder="Cerca per titolo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={TOUCH_FIELD_ON_PHONE}
          slotProps={{
            htmlInput: { "aria-label": "Cerca per titolo" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Filter
          label="Tipo"
          value={kind}
          onChange={(v) => setKind(v as DrillKind | "")}
          all="Tutti"
        >
          {Object.entries(DRILL_KIND_LABELS).map(([k, l]) => (
            <MenuItem key={k} value={k}>
              {l}
            </MenuItem>
          ))}
        </Filter>
        <Filter
          label="Campo"
          value={court}
          onChange={(v) => setCourt(v as DrillCourt | "")}
          all="Tutti"
        >
          {Object.entries(DRILL_COURT_LABELS).map(([k, l]) => (
            <MenuItem key={k} value={k}>
              {l}
            </MenuItem>
          ))}
        </Filter>
        <Filter label="Squadra" value={teamId} onChange={setTeamId} all="Tutte">
          {teams.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name} ({t.season})
            </MenuItem>
          ))}
        </Filter>
        <Filter label="Stato" value={status} onChange={(v) => setStatus(v as StatusFilter)}>
          <MenuItem value="active">Bozze e pubblicati</MenuItem>
          <MenuItem value="PUBLISHED">Pubblicati</MenuItem>
          <MenuItem value="DRAFT">Bozze</MenuItem>
          <MenuItem value="archived">Archiviati</MenuItem>
        </Filter>
      </Box>

      {shown.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: RADIUS.lg }}>
          <Typography color="text.secondary">
            {drills.length === 0
              ? "Ancora nessuno schema. Con “Nuovo schema” se ne disegna uno."
              : "Nessuno schema con questi filtri."}
          </Typography>
        </Paper>
      ) : (
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {shown.map((d) => (
            <Paper
              key={d.id}
              component="li"
              variant="outlined"
              sx={{
                borderRadius: RADIUS.lg,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <BoardSvg
                  court={d.court}
                  pieces={d.content.pieces}
                  frame={interpolateStep(d.content, 0)}
                  title={d.title}
                  framed={false}
                />
              </Box>
              <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Typography variant="h6" component="h2" sx={{ flex: 1, minWidth: 0 }}>
                    {d.title}
                  </Typography>
                  <DrillStateChip status={d.status} archived={d.archived} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {DRILL_KIND_LABELS[d.kind]} · {DRILL_COURT_LABELS[d.court]}
                  {d.durationMin ? ` · ${d.durationMin} min` : ""} · {d.content.steps.length}{" "}
                  {d.content.steps.length === 1 ? "passo" : "passi"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {d.usedIn > 0
                    ? `In ${d.usedIn} ${d.usedIn === 1 ? "allenamento" : "allenamenti"}`
                    : "Non ancora in un allenamento"}
                </Typography>
                <Box sx={{ mt: "auto", pt: 1 }}>
                  <RowActions
                    subject={d.title}
                    layout="card"
                    primary={{
                      label: readOnly || d.archived ? "Apri" : "Modifica",
                      href: `/admin/lavagna/${d.id}`,
                      emphasis: "outlined",
                    }}
                    items={
                      readOnly || d.archived
                        ? []
                        : [
                            d.status === "PUBLISHED"
                              ? {
                                  label: "Rimetti in bozza",
                                  onClick: () => setDrillStatus(d, "DRAFT"),
                                }
                              : {
                                  label: "Pubblica",
                                  onClick: () => setDrillStatus(d, "PUBLISHED"),
                                },
                            {
                              label: "Duplica",
                              onClick: () =>
                                action.mutate({
                                  url: `/api/drills/${d.id}/duplicate`,
                                  init: { method: "POST" },
                                  done: "Copia creata, in bozza",
                                }),
                            },
                          ]
                    }
                    onDelete={
                      readOnly || d.archived
                        ? undefined
                        : async () => {
                            try {
                              await action.mutateAsync({
                                url: `/api/drills/${d.id}`,
                                init: { method: "DELETE" },
                                done: "Schema eliminato",
                              });
                              return true;
                            } catch {
                              return false;
                            }
                          }
                    }
                    deleteLabel={d.usedIn > 0 ? "Archivia" : "Elimina"}
                    deleteConfirm={
                      d.usedIn > 0
                        ? {
                            title: `Archiviare ${d.title}?`,
                            message:
                              "È in una scaletta: non si elimina, sparisce dalla lavagna ma resta negli allenamenti in cui è stato usato.",
                            confirmLabel: "Archivia",
                          }
                        : {
                            title: `Eliminare ${d.title}?`,
                            message: "Lo schema si cancella e non si recupera.",
                            confirmLabel: "Elimina",
                          }
                    }
                    focusAfterDelete={titleRef}
                  />
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {creating && (
        <DrillFormDialog
          open
          drill={null}
          teams={teams}
          onClose={() => setCreating(false)}
          onSaved={({ id }) => router.push(`/admin/lavagna/${id}`)}
        />
      )}
    </>
  );
}

function Filter({
  label,
  value,
  onChange,
  all,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  all?: string;
  children: React.ReactNode;
}) {
  const id = `drill-filter-${label}`;
  return (
    <FormControl size="small" sx={TOUCH_FIELD_ON_PHONE}>
      <InputLabel id={id} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={id}
        label={label}
        value={value}
        displayEmpty
        notched
        onChange={(e) => onChange(e.target.value)}
      >
        {all !== undefined && <MenuItem value="">{all}</MenuItem>}
        {children}
      </Select>
    </FormControl>
  );
}

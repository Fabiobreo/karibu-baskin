"use client";
import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import PageHeader from "@/components/common/PageHeader";
import DeviceDraftAlert from "@/components/board/DeviceDraftAlert";
import DrillCanvasEditor from "@/components/board/DrillCanvasEditor";
import DrillPreviewDialog from "@/components/board/DrillPreviewDialog";
import { drillHistoryReducer } from "@/components/board/drillHistory";
import { clearDeviceDraft, useDeviceDraft } from "@/components/board/useDeviceDraft";
import DrillFormDialog from "./DrillFormDialog";
import DrillStateChip from "./DrillStateChip";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import type { DrillContent } from "@/lib/board/content";
import { canBePublic } from "@/lib/board/category";
import {
  DRILL_COURT_LABELS,
  DRILL_KIND_LABELS,
  type AdminDrillRow,
  type DrillTeamOption,
} from "@/lib/board/labels";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

interface DrillEditorProps {
  drill: AdminDrillRow;
  content: DrillContent;
  teams: DrillTeamOption[];
}

const draftKey = (id: string) => `karibu-lavagna:${id}`;

/**
 * Editor di uno schema per lo staff (UX-72): il disegno e' `DrillCanvasEditor`,
 * condiviso con l'editor delle proposte (UX-73); qui stanno salvataggio,
 * dettagli (squadra, durata, visibilita') e pubblicazione. Salvataggio
 * esplicito; le modifiche non salvate restano sul dispositivo e si propongono
 * alla riapertura.
 */
export default function DrillEditor({ drill, content: initial, teams }: DrillEditorProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [history, dispatch] = useReducer(drillHistoryReducer, {
    content: initial,
    past: [],
    future: [],
  });
  const [saved, setSaved] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [details, setDetails] = useState(false);
  const { content } = history;
  const court = drill.court;
  const dirty = content !== saved;
  const key = draftKey(drill.id);
  const device = useDeviceDraft({
    key,
    base: drill.updatedAt,
    content,
    saved,
    editedHere: history.past.length > 0 || dirty,
  });

  const save = useMutation({
    mutationFn: async (extra: { status?: "DRAFT" | "PUBLISHED" }) => {
      const res = await fetch(`/api/drills/${drill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, ...extra }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return { sent: content, ...extra };
    },
    onSuccess: ({ sent, status }) => {
      setSaved(sent);
      clearDeviceDraft(key);
      showToast({
        message:
          status === "PUBLISHED"
            ? drill.visibility === "PUBLIC" && canBePublic(drill.kind)
              ? "Pubblicato: lo vedono tutti"
              : "Pubblicato: lo vedono i tesserati"
            : status === "DRAFT"
              ? "Rimesso in bozza"
              : "Salvato",
        severity: "success",
      });
      router.refresh();
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const published = drill.status === "PUBLISHED";

  return (
    <>
      <PageHeader
        title={drill.title}
        breadcrumb={[{ label: "Playbook", href: "/admin/playbook" }, { label: drill.title }]}
        subtitle={`${DRILL_KIND_LABELS[drill.kind]} · ${DRILL_COURT_LABELS[court]}${dirty ? " · modifiche non salvate" : ""}`}
        action={
          <Button
            variant="contained"
            onClick={() => save.mutate({})}
            disabled={!dirty || save.isPending}
          >
            {dirty ? "Salva" : "Salvato"}
          </Button>
        }
      />

      {device.draft && (
        <DeviceDraftAlert
          onRestore={() => {
            dispatch({ type: "replace", content: device.draft! });
            device.restored();
          }}
          onDiscard={device.discard}
        />
      )}

      <DrillCanvasEditor
        title={drill.title}
        court={court}
        history={history}
        dispatch={dispatch}
        toolbarStart={<DrillStateChip status={drill.status} archived={false} />}
        toolbarEnd={
          <>
            <Button
              variant="text"
              startIcon={<PlayCircleOutlineIcon />}
              onClick={() => setPreview(true)}
              sx={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              Anteprima
            </Button>
            <Button
              variant="text"
              onClick={() => setDetails(true)}
              sx={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              Dettagli
            </Button>
            <Button
              variant="outlined"
              onClick={() => save.mutate({ status: published ? "DRAFT" : "PUBLISHED" })}
              disabled={save.isPending || (!published && content.pieces.length === 0)}
              sx={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              {published ? "Rimetti in bozza" : dirty ? "Salva e pubblica" : "Pubblica"}
            </Button>
          </>
        }
      />

      {preview && (
        <DrillPreviewDialog
          title={drill.title}
          court={court}
          content={content}
          onClose={() => setPreview(false)}
        />
      )}
      {details && (
        <DrillFormDialog
          open
          drill={drill}
          teams={teams}
          onClose={() => setDetails(false)}
          onSaved={() => {
            setDetails(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

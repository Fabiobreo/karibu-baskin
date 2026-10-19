"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import SuggestionCard from "@/components/admin/SuggestionCard";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { errorText } from "@/lib/networkError";
import type { AdminSuggestion, AdminSuggestionNote } from "@/lib/suggestions/adminSuggestion";

type Status = AdminSuggestion["status"];
type Filter = "DA_GESTIRE" | "ARCHIVIATI" | "TUTTI";

interface AdminSuggerimentiClientProps {
  initialSuggestions: AdminSuggestion[];
  currentUserId: string;
  isAdmin: boolean;
}

const FILTER_LABELS: Record<Filter, string> = {
  DA_GESTIRE: "Da gestire",
  ARCHIVIATI: "Archiviati",
  TUTTI: "Tutti",
};
const FILTER_ORDER: Filter[] = ["DA_GESTIRE", "ARCHIVIATI", "TUTTI"];

const EMPTY_TEXT: Record<Filter, string> = {
  DA_GESTIRE: "Niente da gestire. I suggerimenti nuovi arrivano anche come notifica.",
  ARCHIVIATI: "Nessun suggerimento archiviato.",
  TUTTI: "Nessun suggerimento.",
};

function matches(filter: Filter, status: Status): boolean {
  if (filter === "TUTTI") return true;
  return filter === "ARCHIVIATI" ? status === "ARCHIVIATO" : status !== "ARCHIVIATO";
}

export default function AdminSuggerimentiClient({
  initialSuggestions,
  currentUserId,
  isAdmin,
}: AdminSuggerimentiClientProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminSuggestion[]>(initialSuggestions);
  const [filter, setFilter] = useState<Filter>("DA_GESTIRE");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { DA_GESTIRE: 0, ARCHIVIATI: 0, TUTTI: items.length };
    for (const i of items) c[i.status === "ARCHIVIATO" ? "ARCHIVIATI" : "DA_GESTIRE"]++;
    return c;
  }, [items]);

  const visible = useMemo(() => items.filter((i) => matches(filter, i.status)), [items, filter]);

  // Apertura da notifica: ?apri=<id> apre il thread e porta la card in vista.
  useEffect(() => {
    const id = searchParams.get("apri");
    if (!id) return;
    const target = initialSuggestions.find((s) => s.id === id);
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (target.status === "ARCHIVIATO") setFilter("TUTTI");
      setOpenIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        document.getElementById(`s-${id}`)?.scrollIntoView({ block: "start" });
      }, 150);
    } else {
      showToast({ message: "Questo suggerimento non c'è più.", severity: "info" });
    }
    router.replace("/admin/suggerimenti", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function changeStatus(id: string, status: Status) {
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const updated: AdminSuggestion = await res.json();
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      showToast({ message: errorText(err, "Errore"), severity: "error" });
    }
  }

  async function deleteSuggestion(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(await readError(res));
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast({ message: "Suggerimento eliminato", severity: "success" });
      return true;
    } catch (err) {
      showToast({ message: errorText(err, "Errore"), severity: "error" });
      return false;
    }
  }

  function noteAdded(suggestionId: string, note: AdminSuggestionNote, status: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === suggestionId
          ? {
              ...i,
              status: status as Status,
              notes: [...i.notes, note],
              lastActivityAt: note.createdAt,
            }
          : i
      )
    );
  }

  function noteDeleted(suggestionId: string, noteId: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== suggestionId) return i;
        const notes = i.notes.filter((n) => n.id !== noteId);
        return {
          ...i,
          notes,
          lastActivityAt: notes.length > 0 ? notes[notes.length - 1].createdAt : i.createdAt,
        };
      })
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography
        component="h2"
        variant="h6"
        ref={listHeadingRef}
        tabIndex={-1}
        sx={{ outline: "none" }}
      >
        {FILTER_LABELS[filter]}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {FILTER_ORDER.map((f) => (
          <Chip
            key={f}
            label={`${FILTER_LABELS[f]} (${counts[f]})`}
            onClick={() => setFilter(f)}
            color={filter === f ? "primary" : "default"}
            variant={filter === f ? "filled" : "outlined"}
          />
        ))}
      </Stack>

      {visible.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider" }}
        >
          <Typography color="text.secondary">{EMPTY_TEXT[filter]}</Typography>
        </Paper>
      ) : (
        visible.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            open={openIds.has(s.id)}
            onToggle={() => toggle(s.id)}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onStatus={changeStatus}
            onDelete={deleteSuggestion}
            onNoteAdded={noteAdded}
            onNoteDeleted={noteDeleted}
            focusAfterDelete={listHeadingRef}
          />
        ))
      )}
    </Box>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TeamDisplay, { type TeamsData, type TeamAthlete } from "@/components/training/TeamDisplay";
import TeamsHeader from "@/components/training/TeamsHeader";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/context/ToastContext";

interface AdminSessionTeamsProps {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  initialTeams: TeamsData | null;
  /** Iscritti come atleti (non allenatori), nell'ordine del roster. */
  athletes: TeamAthlete[];
  coaches: { id: string; name: string }[];
}

/**
 * Squadre di un allenamento nella pagina "da completare": le stesse della
 * pagina pubblica, con creazione automatica, composizione a mano (da "Da
 * assegnare") e spostamenti. Dopo ogni modifica ricarica la pagina, così i
 * risultati delle partitelle vedono subito le squadre nuove.
 */
export default function AdminSessionTeams({
  sessionId,
  sessionTitle,
  sessionDate,
  initialTeams,
  athletes,
  coaches,
}: AdminSessionTeamsProps) {
  const [teams, setTeams] = useState<TeamsData | null>(initialTeams);
  const [editMode, setEditMode] = useState(false);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  function handleTeamsChanged(next: TeamsData) {
    setTeams(next);
    router.refresh();
  }

  async function removeTeams() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/teams/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setTeams(null);
        setEditMode(false);
        router.refresh();
        showToast({ message: "Squadre rimosse", severity: "success" });
      } else {
        showToast({ message: "Errore nella rimozione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <TeamsHeader
        teams={teams}
        coaches={coaches}
        sessionTitle={sessionTitle}
        sessionDate={sessionDate}
        isStaff
        removingTeams={removing}
        onRemoveTeams={() =>
          openConfirm(
            "Rimuovere le squadre?",
            "Le squadre di questo allenamento verranno cancellate. I risultati delle partitelle già salvati restano.",
            removeTeams,
            { confirmLabel: "Rimuovi" }
          )
        }
        onEditTeams={() => setEditMode((v) => !v)}
      />
      <TeamDisplay
        sessionId={sessionId}
        isStaff
        registrationIds={athletes.map((a) => a.id)}
        coaches={coaches}
        teams={teams}
        teamsLoading={false}
        editMode={editMode}
        onExitEditMode={() => setEditMode(false)}
        onEnterEditMode={() => setEditMode(true)}
        onTeamsGenerated={handleTeamsChanged}
        athletes={athletes}
      />
      {ConfirmDialog}
    </>
  );
}

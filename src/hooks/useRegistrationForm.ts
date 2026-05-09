"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import type { SportRoleResult } from "@/components/SportRoleQuestionnaire";

// ── Tipi esportati (re-esportati da RegistrationForm per backwards compat) ────

export interface TeamMembershipInfo {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  teamSeason: string;
}

export interface CurrentUser {
  id: string;
  name: string | null;
  appRole: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  sportRoleSuggested: number | null;
  sportRoleSuggestedVariant: string | null;
  linkedChildId: string | null;
  teamMemberships: TeamMembershipInfo[];
}

export interface ChildInfo {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  userId: string | null;
  teamMemberships: TeamMembershipInfo[];
}

type Phase = "questionnaire" | "confirm";
type Subject = "self" | string;

export interface UseRegistrationFormReturn {
  coachMode: "athlete" | "coach";
  setCoachMode: (m: "athlete" | "coach") => void;
  subject: Subject;
  setSubject: (s: Subject) => void;
  phase: Phase;
  setPhase: (p: Phase) => void;
  chosenRole: SportRoleResult | null;
  setChosenRole: (r: SportRoleResult | null) => void;
  anonymousName: string;
  setAnonymousName: (s: string) => void;
  anonymousEmail: string;
  setAnonymousEmail: (s: string) => void;
  note: string;
  setNote: (s: string) => void;
  loading: boolean;
  // Derived
  selectedChild: ChildInfo | null;
  confirmedRole: number | null;
  confirmedVariant: string | null;
  hasConfirmedRole: boolean;
  effectiveRegisteredChildIds: (string | null)[];
  selfRegistered: boolean;
  currentSubjectRegistered: boolean;
  isDuplicateName: boolean;
  isParent: boolean;
  isCoach: boolean;
  isStaff: boolean;
  hasChildren: boolean;
  // Handlers
  handleQuestionnaireResult: (result: SportRoleResult) => void;
  handleSubmit: () => Promise<void>;
}

interface Params {
  sessionId: string;
  currentUser: CurrentUser | null | undefined;
  parentChildren: ChildInfo[];
  registeredNames: string[];
  registeredUserIds: (string | null)[];
  registeredChildIds: (string | null)[];
  onRegistered: () => void;
}

export function useRegistrationForm({
  sessionId,
  currentUser,
  parentChildren,
  registeredNames,
  registeredUserIds,
  registeredChildIds,
  onRegistered,
}: Params): UseRegistrationFormReturn {
  const isParent = currentUser?.appRole === "PARENT";
  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";
  const isCoach = isStaff;
  const hasChildren = isParent && parentChildren.length > 0;

  const [coachMode, setCoachMode] = useState<"athlete" | "coach">("athlete");

  const registeredUserIdSet = new Set(registeredUserIds.filter(Boolean) as string[]);
  const effectiveRegisteredChildIds = [
    ...registeredChildIds,
    ...parentChildren
      .filter((c) => c.userId && registeredUserIdSet.has(c.userId))
      .map((c) => c.id),
  ];

  const selfRegistered = !!currentUser && (
    registeredUserIds.includes(currentUser.id) ||
    (!!currentUser.linkedChildId && registeredChildIds.includes(currentUser.linkedChildId))
  );
  const defaultSubject: Subject = isParent
    ? (parentChildren.find((c) => !effectiveRegisteredChildIds.includes(c.id))?.id ?? parentChildren[0]?.id ?? "self")
    : "self";
  const [subject, setSubject] = useState<Subject>(defaultSubject);

  const selectedChild = subject !== "self" ? parentChildren.find((c) => c.id === subject) ?? null : null;

  const confirmedRole = subject === "self"
    ? (currentUser?.sportRole ?? null)
    : (selectedChild?.sportRole ?? null);
  const confirmedVariant = subject === "self"
    ? (currentUser?.sportRoleVariant ?? null)
    : (selectedChild?.sportRoleVariant ?? null);
  const hasConfirmedRole = confirmedRole !== null;

  const [phase, setPhase] = useState<Phase>(hasConfirmedRole ? "confirm" : "questionnaire");
  const [chosenRole, setChosenRole] = useState<SportRoleResult | null>(
    confirmedRole ? { role: confirmedRole, variant: confirmedVariant ?? undefined } : null
  );

  // Quando arrivano i figli (fetch asincrona), seleziona automaticamente il primo disponibile
  useEffect(() => {
    if (!isParent || parentChildren.length === 0) return;
    if (subject === "self") {
      const firstAvailable = parentChildren.find((c) => !effectiveRegisteredChildIds.includes(c.id)) ?? parentChildren[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubject(firstAvailable.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentChildren]);

  // Ricalcola quando cambia il soggetto o arriva currentUser
  useEffect(() => {
    if (currentUser === undefined) return;
    const r = subject === "self" ? currentUser?.sportRole : selectedChild?.sportRole;
    const v = subject === "self" ? currentUser?.sportRoleVariant : selectedChild?.sportRoleVariant;
    if (r != null) {
      // Transizione questionnaire → confirm solo se l'utente non ha già navigato
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase((prev) => prev === "questionnaire" ? "confirm" : prev);
      setChosenRole({ role: r, variant: v ?? undefined });
    } else {
      setPhase("questionnaire");
      setChosenRole(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, currentUser]);

  const [anonymousName, setAnonymousName] = useState("");
  const [anonymousEmail, setAnonymousEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [optimisticSubjects, setOptimisticSubjects] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  // Rimuovi dall'ottimistico i soggetti che il server non considera più iscritti
  useEffect(() => {
    setOptimisticSubjects((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      if (next.has("self") && !selfRegistered) next.delete("self");
      for (const childId of next) {
        if (childId !== "self" && !effectiveRegisteredChildIds.includes(childId)) {
          next.delete(childId);
        }
      }
      return next.size === prev.size ? prev : next;
    });
    // registeredUserIds e registeredChildIds sono gli array "veri" che cambiano dopo SWR revalidation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registeredUserIds, registeredChildIds]);

  const currentSubjectRegistered =
    (subject === "self" ? selfRegistered : effectiveRegisteredChildIds.includes(subject)) ||
    optimisticSubjects.has(subject);

  const isDuplicateName =
    !currentUser &&
    anonymousName.trim().length > 0 &&
    registeredNames.some((n) => n.toLowerCase() === anonymousName.trim().toLowerCase());

  function handleQuestionnaireResult(result: SportRoleResult) {
    setChosenRole(result);
    setPhase("confirm");
  }

  async function handleSubmit() {
    const isCoachRegistration = isCoach && coachMode === "coach";
    if (!isCoachRegistration && !chosenRole) return;

    const isAnon = !currentUser;
    const name = isAnon ? anonymousName.trim() : null;
    if (isAnon && !name) {
      showToast({ message: "Inserisci il tuo nome", severity: "warning" });
      return;
    }

    const submittedSubject = subject;
    setOptimisticSubjects((prev) => new Set(prev).add(submittedSubject));
    setLoading(true);
    try {
      const roleToSend = isCoachRegistration
        ? (currentUser?.sportRole ?? 1)
        : chosenRole!.role;
      const body: Record<string, unknown> = { sessionId, role: roleToSend };
      if (isCoachRegistration) body.registeredAsCoach = true;
      if (isAnon) body.name = name;
      if (isAnon && anonymousEmail.trim()) body.anonymousEmail = anonymousEmail.trim();
      if (!isCoachRegistration && chosenRole?.variant) body.roleVariant = chosenRole.variant;
      if (subject !== "self") body.childId = subject;
      if (note.trim()) body.note = note.trim();

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setOptimisticSubjects((prev) => { const s = new Set(prev); s.delete(submittedSubject); return s; });
        const data = await res.json();
        showToast({ message: data.error ?? "Errore durante l'iscrizione", severity: "error" });
        return;
      }

      const displayName = subject !== "self"
        ? selectedChild?.name
        : (currentUser?.name ?? name ?? "Atleta");
      showToast({ message: `${displayName} iscritto/a con successo!`, severity: "success" });

      setAnonymousName("");
      setNote("");
      if (hasConfirmedRole) {
        setPhase("confirm");
      } else {
        setChosenRole(null);
        setPhase("questionnaire");
      }
      onRegistered();
    } catch {
      setOptimisticSubjects((prev) => { const s = new Set(prev); s.delete(submittedSubject); return s; });
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  return {
    coachMode, setCoachMode,
    subject, setSubject,
    phase, setPhase,
    chosenRole, setChosenRole,
    anonymousName, setAnonymousName,
    anonymousEmail, setAnonymousEmail,
    note, setNote,
    loading,
    selectedChild,
    confirmedRole,
    confirmedVariant,
    hasConfirmedRole,
    effectiveRegisteredChildIds,
    selfRegistered,
    currentSubjectRegistered,
    isDuplicateName,
    isParent,
    isCoach,
    isStaff,
    hasChildren,
    handleQuestionnaireResult,
    handleSubmit,
  };
}

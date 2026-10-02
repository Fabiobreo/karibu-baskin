"use client";
import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { splitOwnChild } from "@/lib/registrationSubjects";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import type { SportRoleResult } from "@/components/training/SportRoleQuestionnaire";
import { readError } from "@/lib/fetchJson";

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

export interface OptimisticReg {
  name: string;
  role: number;
  sessionId: string;
  userId: string | null;
  childId: string | null;
  registeredAsCoach: boolean;
}

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
  /** true se il form deve chiedere il nome (anonimi, o account senza nome). */
  needsOwnName: boolean;
  anonymousEmail: string;
  setAnonymousEmail: (s: string) => void;
  note: string;
  setNote: (s: string) => void;
  loading: boolean;
  /** Messaggio dell'ultimo invio fallito, da mostrare accanto al bottone. */
  submitError: string | null;
  clearSubmitError: () => void;
  // Derived
  selectedChild: ChildInfo | null;
  confirmedRole: number | null;
  confirmedVariant: string | null;
  hasConfirmedRole: boolean;
  effectiveRegisteredChildIds: (string | null)[];
  /** Figli fra cui scegliere: senza la scheda di chi sta guardando. */
  subjectChildren: ChildInfo[];
  selfRegistered: boolean;
  currentSubjectRegistered: boolean;
  isDuplicateName: boolean;
  isParent: boolean;
  isCoach: boolean;
  isStaff: boolean;
  hasChildren: boolean;
  // Handlers
  handleQuestionnaireResult: (result: SportRoleResult) => void;
  handleSubmit: () => void;
}

interface Params {
  sessionId: string;
  currentUser: CurrentUser | null | undefined;
  parentChildren: ChildInfo[];
  registeredNames: string[];
  registeredUserIds: (string | null)[];
  registeredChildIds: (string | null)[];
  onRegistered: () => void;
  onOptimisticAdd?: (reg: OptimisticReg) => void;
  onSubmitError?: () => void;
}

export function useRegistrationForm({
  sessionId,
  currentUser,
  parentChildren: allChildren,
  registeredNames,
  registeredUserIds,
  registeredChildIds,
  onRegistered,
  onOptimisticAdd,
  onSubmitError,
}: Params): UseRegistrationFormReturn {
  // Una persona, una voce (UX-42): la scheda figlio di chi sta guardando (stesso
  // account, `Child.userId`) è già "Io" nel selettore.
  const selfId = currentUser?.id ?? null;
  const selfChildId = currentUser?.linkedChildId ?? null;
  const { own: ownChild, others: parentChildren } = useMemo(
    () => splitOwnChild(allChildren, selfId, selfChildId),
    [allChildren, selfId, selfChildId]
  );
  const isParent = currentUser?.appRole === "PARENT";
  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";
  const isCoach = isStaff;
  const hasChildren = isParent && parentChildren.length > 0;

  const [coachMode, setCoachMode] = useState<"athlete" | "coach">("athlete");

  const registeredUserIdSet = new Set(registeredUserIds.filter(Boolean) as string[]);
  const effectiveRegisteredChildIds = [
    ...registeredChildIds,
    ...parentChildren.filter((c) => c.userId && registeredUserIdSet.has(c.userId)).map((c) => c.id),
  ];

  const selfRegistered =
    !!currentUser &&
    (registeredUserIds.includes(currentUser.id) ||
      (!!currentUser.linkedChildId && registeredChildIds.includes(currentUser.linkedChildId)));
  // Il primo figlio ancora da iscrivere; se sono tutti iscritti resta "Io", non
  // una voce già iscritta (che nel selettore non si può scegliere).
  const defaultSubject: Subject = isParent
    ? (parentChildren.find((c) => !effectiveRegisteredChildIds.includes(c.id))?.id ?? "self")
    : "self";
  const [subject, setSubject] = useState<Subject>(defaultSubject);

  const selectedChild =
    subject !== "self" ? (parentChildren.find((c) => c.id === subject) ?? null) : null;

  // Per sé: il ruolo dell'account o, se manca, quello confermato sulla propria
  // scheda figlio (il collegamento non lo copia sull'account).
  const confirmedRole =
    subject === "self"
      ? (currentUser?.sportRole ?? ownChild?.sportRole ?? null)
      : (selectedChild?.sportRole ?? null);
  const confirmedVariant =
    subject === "self"
      ? currentUser?.sportRole != null
        ? (currentUser.sportRoleVariant ?? null)
        : (ownChild?.sportRoleVariant ?? null)
      : (selectedChild?.sportRoleVariant ?? null);
  const hasConfirmedRole = confirmedRole !== null;

  // Ruolo di partenza: quello confermato o, per sé stessi, quello suggerito dal
  // questionario (anche fatto fuori da qui, in /profilo/ruolo). Con un
  // suggerimento si parte dal riepilogo: rifare le domande a ogni iscrizione
  // era inutile, e "Rifai il questionario" resta a portata di mano.
  function startingRole(): SportRoleResult | null {
    if (confirmedRole !== null) {
      return { role: confirmedRole, variant: confirmedVariant ?? undefined };
    }
    if (subject === "self" && currentUser?.sportRoleSuggested != null) {
      return {
        role: currentUser.sportRoleSuggested,
        variant: currentUser.sportRoleSuggestedVariant ?? undefined,
      };
    }
    return null;
  }

  const [phase, setPhase] = useState<Phase>(startingRole() ? "confirm" : "questionnaire");
  const [chosenRole, setChosenRole] = useState<SportRoleResult | null>(startingRole);

  // Quando arrivano i figli (fetch asincrona), seleziona automaticamente il primo disponibile
  useEffect(() => {
    if (!isParent || parentChildren.length === 0) return;
    if (subject === "self") {
      const firstAvailable = parentChildren.find(
        (c) => !effectiveRegisteredChildIds.includes(c.id)
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (firstAvailable) setSubject(firstAvailable.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentChildren]);

  // Ricalcola quando cambia il soggetto o arriva currentUser
  useEffect(() => {
    if (currentUser === undefined) return;
    const start = startingRole();
    if (start) {
      // Transizione questionnaire → confirm solo se l'utente non ha già navigato
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase((prev) => (prev === "questionnaire" ? "confirm" : prev));
      setChosenRole(start);
    } else {
      setPhase("questionnaire");
      setChosenRole(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, currentUser]);

  // Nome da chiedere nel form: agli anonimi, e a chi ha un account senza nome
  // (magic link, se il dialog del primo accesso è stato saltato). Per loro il
  // server lo salva anche sul profilo.
  const needsOwnName = !currentUser || (subject === "self" && !currentUser.name?.trim());
  const [anonymousName, setAnonymousName] = useState("");
  const [anonymousEmail, setAnonymousEmail] = useState("");
  const [note, setNote] = useState("");
  const [optimisticSubjects, setOptimisticSubjects] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const t = useTranslations("trainings");

  // Rimuovi dall'ottimistico i soggetti che il server non considera più iscritti
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // registeredUserIds e registeredChildIds sono gli array "veri" che cambiano dopo TanStack revalidation
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

  type MutationVars = {
    body: Record<string, unknown>;
    submittedSubject: string;
    displayName: string;
    optimisticReg: OptimisticReg;
  };

  // Errore dell'invio: resta accanto al bottone, con "Riprova", finche' non si
  // riprova o si chiude (UX-25). Il toast in un angolo si perdeva.
  const [submitError, setSubmitError] = useState<string | null>(null);

  const registerMutation = useMutation<void, Error, MutationVars>({
    mutationFn: async ({ body }) => {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
    },
    onMutate: ({ submittedSubject, optimisticReg }) => {
      setOptimisticSubjects((prev) => new Set(prev).add(submittedSubject));
      onOptimisticAdd?.(optimisticReg);
    },
    onError: (err, { submittedSubject }) => {
      setOptimisticSubjects((prev) => {
        const s = new Set(prev);
        s.delete(submittedSubject);
        return s;
      });
      onSubmitError?.();
      setSubmitError(err.message);
    },
    onSuccess: (_, { displayName }) => {
      showToast({ message: t("registeredSuccess", { name: displayName }), severity: "success" });
      setAnonymousName("");
      setNote("");
      if (hasConfirmedRole) {
        setPhase("confirm");
      } else {
        setChosenRole(null);
        setPhase("questionnaire");
      }
      onRegistered();
    },
  });

  function handleSubmit() {
    setSubmitError(null);
    const isCoachRegistration = isCoach && coachMode === "coach";
    if (!isCoachRegistration && !chosenRole) return;

    const isAnon = !currentUser;
    const name = needsOwnName ? anonymousName.trim() : null;
    if (needsOwnName && !name) {
      showToast({ message: t("enterName"), severity: "warning" });
      return;
    }

    const submittedSubject = subject;
    const roleToSend = isCoachRegistration ? (currentUser?.sportRole ?? 1) : chosenRole!.role;
    const displayName =
      subject !== "self" ? selectedChild?.name : currentUser?.name?.trim() || name || "Atleta";

    const body: Record<string, unknown> = { sessionId, role: roleToSend };
    if (isCoachRegistration) body.registeredAsCoach = true;
    if (needsOwnName) body.name = name;
    if (isAnon && anonymousEmail.trim()) body.anonymousEmail = anonymousEmail.trim();
    if (!isCoachRegistration && chosenRole?.variant) body.roleVariant = chosenRole.variant;
    if (subject !== "self") body.childId = subject;
    if (note.trim()) body.note = note.trim();

    const optimisticReg: OptimisticReg = {
      name: displayName ?? "Atleta",
      role: roleToSend,
      sessionId,
      userId: !isAnon ? (currentUser?.id ?? null) : null,
      childId: subject !== "self" ? subject : null,
      registeredAsCoach: isCoachRegistration,
    };

    registerMutation.mutate({
      body,
      submittedSubject,
      displayName: displayName ?? "Atleta",
      optimisticReg,
    });
  }

  return {
    coachMode,
    setCoachMode,
    subject,
    setSubject,
    phase,
    setPhase,
    chosenRole,
    setChosenRole,
    anonymousName,
    setAnonymousName,
    needsOwnName,
    anonymousEmail,
    setAnonymousEmail,
    note,
    setNote,
    loading: registerMutation.isPending,
    submitError,
    clearSubmitError: () => setSubmitError(null),
    selectedChild,
    confirmedRole,
    confirmedVariant,
    hasConfirmedRole,
    effectiveRegisteredChildIds,
    subjectChildren: parentChildren,
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

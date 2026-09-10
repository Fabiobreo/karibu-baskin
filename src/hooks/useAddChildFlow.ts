"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import {
  EMPTY_CHILD_FORM,
  type AddStep,
  type ChildData,
  type ChildFormState,
  type FoundUser,
} from "@/components/profile/childLinkerShared";

interface UseAddChildFlowParams {
  /** Figlio aggiunto alla lista (creazione manuale o richiesta collegamento inviata). */
  onChildAdded: (child: ChildData) => void;
  /** Chiusura del dialog richiesta dal flusso (es. dopo creazione manuale). */
  onClose: () => void;
}

/**
 * Stato e logica del flusso multi-step "Aggiungi figlio":
 * choice → (email | name) → confirm → sent, oppure choice → create.
 */
export function useAddChildFlow({ onChildAdded, onClose }: UseAddChildFlowParams) {
  const { showToast } = useToast();
  const t = useTranslations("childLinker");
  const tCommon = useTranslations("common");

  const [addStep, setAddStep] = useState<AddStep>("choice");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameResults, setNameResults] = useState<FoundUser[]>([]);
  const [nameSearched, setNameSearched] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [confirmName, setConfirmName] = useState(""); // usato solo se foundUser.name è null
  const [searching, setSearching] = useState(false);
  const [createForm, setCreateForm] = useState<ChildFormState>(EMPTY_CHILD_FORM);
  const [creating, setCreating] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);

  async function handleSearchEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setSearching(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const user: FoundUser = await res.json();
        setFoundUser(user);
        setConfirmName(user.name ?? "");
        setAddStep("confirm");
      } else {
        setEmailError(t("noUserFound"));
      }
    } catch {
      setEmailError(tCommon("networkError"));
    } finally {
      setSearching(false);
    }
  }

  async function handleSearchName() {
    const name = nameInput.trim();
    if (!name) return;
    setSearching(true);
    setNameResults([]);
    setNameSearched(false);
    try {
      const res = await fetch(`/api/users/lookup?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const results: FoundUser[] = await res.json();
        setNameResults(results);
      }
    } catch {
      showToast({ message: t("searchError"), severity: "error" });
    } finally {
      setSearching(false);
      setNameSearched(true);
    }
  }

  async function handleConfirmYes() {
    if (!foundUser || !confirmName.trim()) return;
    // Il figlio trovato va aggiunto come Child manuale + inviata richiesta di collegamento
    setCreating(true);
    try {
      // 1. Crea il Child entry per il genitore
      const createRes = await fetch("/api/users/me/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: confirmName.trim(), parentalConsent: true }),
      });
      const newChild = await createRes.json();
      if (!createRes.ok) {
        showToast({ message: newChild.error ?? t("createError"), severity: "error" });
        return;
      }

      // 2. Invia richiesta di collegamento
      const linkRes = await fetch(`/api/children/${newChild.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkUserId: foundUser.id }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) {
        showToast({ message: linkData.error ?? t("linkError"), severity: "error" });
        return;
      }

      onChildAdded({ ...newChild, pendingRequestId: linkData.requestId ?? null });
      setAddStep("sent");
    } catch {
      showToast({ message: tCommon("networkError"), severity: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateManually() {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users/me/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          gender: createForm.gender || null,
          birthDate: createForm.birthDate || null,
          parentalConsent: true,
        }),
      });
      if (!res.ok) {
        showToast({ message: await readError(res), severity: "error" });
        return;
      }
      const data = await res.json();
      onChildAdded(data);
      showToast({ message: t("childAdded", { name: data.name }), severity: "success" });
      onClose();
    } catch {
      showToast({ message: tCommon("networkError"), severity: "error" });
    } finally {
      setCreating(false);
    }
  }

  return {
    addStep,
    setAddStep,
    emailInput,
    setEmailInput,
    emailError,
    setEmailError,
    nameInput,
    setNameInput,
    nameResults,
    setNameResults,
    nameSearched,
    setNameSearched,
    foundUser,
    setFoundUser,
    confirmName,
    setConfirmName,
    searching,
    createForm,
    setCreateForm,
    creating,
    parentalConsent,
    setParentalConsent,
    handleSearchEmail,
    handleSearchName,
    handleConfirmYes,
    handleCreateManually,
  };
}

export type AddChildFlow = ReturnType<typeof useAddChildFlow>;

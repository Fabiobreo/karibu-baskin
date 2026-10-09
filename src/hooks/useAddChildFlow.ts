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
  type PendingLink,
} from "@/components/profile/childLinkerShared";

interface UseAddChildFlowParams {
  /** Figlio creato a mano, aggiunto alla lista. */
  onChildAdded: (child: ChildData) => void;
  /** Richiesta inviata a un figlio con account: in lista come "in attesa". */
  onRequestSent: (pending: PendingLink) => void;
  /** Chiusura del dialog richiesta dal flusso (es. dopo creazione manuale). */
  onClose: () => void;
}

/**
 * Stato e logica del flusso multi-step "Aggiungi figlio":
 * choice → (email | name) → confirm → sent, oppure choice → create.
 */
export function useAddChildFlow({ onChildAdded, onRequestSent, onClose }: UseAddChildFlowParams) {
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
  const [searching, setSearching] = useState(false);
  const [createForm, setCreateForm] = useState<ChildFormState>(EMPTY_CHILD_FORM);
  const [creating, setCreating] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [sameNameChecked, setSameNameChecked] = useState(false);

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
    if (!foundUser) return;
    // Una sola chiamata, e nessuna scheda figlio: nasce quando il figlio
    // accetta. Prima la scheda veniva creata subito e restava come doppione.
    setCreating(true);
    try {
      const res = await fetch("/api/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: foundUser.id, parentalConsent: true }),
      });
      if (!res.ok) {
        showToast({ message: await readError(res), severity: "error" });
        return;
      }
      const data: { requestId: string } = await res.json();
      onRequestSent({ requestId: data.requestId, name: foundUser.name, image: foundUser.image });
      setAddStep("sent");
    } catch {
      showToast({ message: tCommon("networkError"), severity: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateManually() {
    const name = createForm.name.trim();
    if (!name) return;
    setCreating(true);
    try {
      // Prima di creare una scheda a mano: c'è già un account con questo nome?
      // Una volta sola, poi il genitore può creare comunque (omonimi).
      if (!sameNameChecked) {
        setSameNameChecked(true);
        const lookup = await fetch(`/api/users/lookup?name=${encodeURIComponent(name)}`);
        const found: FoundUser[] = lookup.ok ? await lookup.json() : [];
        const same = found.filter((u) => u.name?.trim().toLowerCase() === name.toLowerCase());
        if (same.length > 0) {
          setNameInput(name);
          setNameResults(same);
          setNameSearched(true);
          setAddStep("name");
          showToast({ message: t("sameNameFound"), severity: "info" });
          return;
        }
      }
      const res = await fetch("/api/users/me/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
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

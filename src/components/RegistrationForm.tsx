"use client";
import { useState, useEffect } from "react";
import {
  Box, TextField, Button, Typography, CircularProgress,
  Chip, Avatar, Divider, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import { ROLE_COLORS, ROLE_LABELS, ROLES, sportRoleLabel } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import SportRoleQuestionnaire, { type SportRoleResult } from "@/components/SportRoleQuestionnaire";

// ── Tipi ─────────────────────────────────────────────────────────────────────

export interface CurrentUser {
  id: string;
  name: string | null;
  appRole: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  sportRoleSuggested: number | null;
  sportRoleSuggestedVariant: string | null;
  linkedChildId: string | null;
}

export interface ChildInfo {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  userId: string | null;
}

interface Props {
  sessionId: string;
  onRegistered: () => void;
  registeredNames: string[];
  registeredUserIds: (string | null)[];
  registeredChildIds: (string | null)[];
  currentUser?: CurrentUser | null;
  children?: ChildInfo[];
}

type Phase = "questionnaire" | "confirm";
type Subject = "self" | string; // "self" oppure childId

// ── Componente ────────────────────────────────────────────────────────────────

export default function RegistrationForm({
  sessionId,
  onRegistered,
  registeredNames,
  registeredUserIds,
  registeredChildIds,
  currentUser,
  children = [],
}: Props) {
  const isParent = currentUser?.appRole === "PARENT";
  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";
  const hasChildren = isParent && children.length > 0;

  // Un figlio è "già iscritto" se ha childId in registeredChildIds
  // OPPURE se si è iscritto col suo account (userId in registeredUserIds)
  const registeredUserIdSet = new Set(registeredUserIds.filter(Boolean) as string[]);
  const effectiveRegisteredChildIds = [
    ...registeredChildIds,
    ...children
      .filter((c) => c.userId && registeredUserIdSet.has(c.userId))
      .map((c) => c.id),
  ];

  // Soggetto selezionato (sé stesso o un figlio)
  // I PARENT possono iscrivere solo i propri figli, mai sé stessi
  // Un atleta con account collegato a un Child è "già iscritto" anche se la reg ha childId invece di userId
  const selfRegistered = !!currentUser && (
    registeredUserIds.includes(currentUser.id) ||
    (!!currentUser.linkedChildId && registeredChildIds.includes(currentUser.linkedChildId))
  );
  const defaultSubject: Subject = isParent
    ? (children.find((c) => !effectiveRegisteredChildIds.includes(c.id))?.id ?? children[0]?.id ?? "self")
    : "self";
  const [subject, setSubject] = useState<Subject>(defaultSubject);

  const selectedChild = subject !== "self" ? children.find((c) => c.id === subject) ?? null : null;

  // Ruolo confermato per il soggetto corrente
  const confirmedRole = subject === "self"
    ? (currentUser?.sportRole ?? null)
    : (selectedChild?.sportRole ?? null);
  const confirmedVariant = subject === "self"
    ? (currentUser?.sportRoleVariant ?? null)
    : (selectedChild?.sportRoleVariant ?? null);
  const hasConfirmedRole = confirmedRole !== null;

  // Fase e ruolo scelto
  const [phase, setPhase] = useState<Phase>(hasConfirmedRole ? "confirm" : "questionnaire");
  const [chosenRole, setChosenRole] = useState<SportRoleResult | null>(
    confirmedRole ? { role: confirmedRole, variant: confirmedVariant ?? undefined } : null
  );

  // Quando arrivano i figli (fetch asincrona), seleziona automaticamente il primo disponibile
  useEffect(() => {
    if (!isParent || children.length === 0) return;
    // Aggiorna solo se il soggetto è ancora "self" (valore iniziale prima che i figli fossero disponibili)
    if (subject === "self") {
      const firstAvailable = children.find((c) => !effectiveRegisteredChildIds.includes(c.id)) ?? children[0];
      setSubject(firstAvailable.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  // Ricalcola quando cambia il soggetto o arriva currentUser
  useEffect(() => {
    if (currentUser === undefined) return;
    const r = subject === "self" ? currentUser?.sportRole : selectedChild?.sportRole;
    const v = subject === "self" ? currentUser?.sportRoleVariant : selectedChild?.sportRoleVariant;
    if (r != null) {
      setPhase("confirm");
      setChosenRole({ role: r, variant: v ?? undefined });
    } else {
      setPhase("questionnaire");
      setChosenRole(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, currentUser]);

  const [anonymousName, setAnonymousName] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const currentSubjectRegistered = subject === "self"
    ? selfRegistered
    : effectiveRegisteredChildIds.includes(subject);

  const isDuplicateName =
    !currentUser &&
    anonymousName.trim().length > 0 &&
    registeredNames.some((n) => n.toLowerCase() === anonymousName.trim().toLowerCase());

  function handleQuestionnaireResult(result: SportRoleResult) {
    setChosenRole(result);
    setPhase("confirm");
  }

  async function handleSubmit() {
    if (!chosenRole) return;

    const isAnon = !currentUser;
    const name = isAnon ? anonymousName.trim() : null;
    if (isAnon && !name) {
      showToast({ message: "Inserisci il tuo nome", severity: "warning" });
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = { sessionId, role: chosenRole.role };
      if (isAnon) body.name = name;
      if (chosenRole.variant) body.roleVariant = chosenRole.variant;
      if (subject !== "self") body.childId = subject;

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Errore durante l'iscrizione", severity: "error" });
        return;
      }

      const displayName = subject !== "self"
        ? selectedChild?.name
        : (currentUser?.name ?? name ?? "Atleta");
      showToast({ message: `${displayName} iscritto/a con successo!`, severity: "success" });

      setAnonymousName("");
      if (hasConfirmedRole) {
        setPhase("confirm");
      } else {
        setChosenRole(null);
        setPhase("questionnaire");
      }
      onRegistered();
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  // ── Caricamento ──────────────────────────────────────────────────────────────

  if (currentUser === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Se è un genitore e tutti i figli sono già iscritti, mostra il messaggio
  const allChildrenRegistered = hasChildren && children.every((c) => effectiveRegisteredChildIds.includes(c.id));
  if (isParent && hasChildren && allChildrenRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={600}>
          {children.length === 1
            ? `${children[0].name} è già iscritto/a`
            : "Tutti i tuoi figli sono già iscritti"}
        </Typography>
      </Box>
    );
  }

  // Se è un genitore senza figli collegati, mostra un messaggio dedicato
  if (isParent && !hasChildren) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="h6" gutterBottom>
          Iscriviti all&apos;allenamento
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Non hai ancora collegato nessun figlio. Vai nel{" "}
          <Box component="a" href="/profilo" sx={{ color: "primary.main", fontWeight: 600 }}>
            tuo profilo
          </Box>{" "}
          per aggiungere i tuoi figli e iscriverli agli allenamenti.
        </Typography>
      </Box>
    );
  }

  // Se l'utente (non genitore) è già iscritto, mostra solo il messaggio
  if (!hasChildren && selfRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={600}>
          Sei già iscritto a questo allenamento
        </Typography>
      </Box>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Iscriviti all&apos;allenamento
      </Typography>

      {/* ── Selettore soggetto (solo genitore con figli) ── */}
      {hasChildren && (
        <>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
            Per chi ti iscrivi?
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
            {/* Opzione: ogni figlio */}
            {children.map((child) => {
              const alreadyIn = effectiveRegisteredChildIds.includes(child.id);
              const isSelected = subject === child.id;
              return (
                <Chip
                  key={child.id}
                  label={alreadyIn ? `${child.name} · già iscritto/a` : child.name}
                  icon={
                    alreadyIn
                      ? <CheckCircleIcon sx={{ fontSize: "1rem !important" }} />
                      : <ChildCareIcon sx={{ fontSize: "1rem !important" }} />
                  }
                  onClick={alreadyIn ? undefined : () => setSubject(child.id)}
                  variant="outlined"
                  sx={alreadyIn ? {
                    color: "success.main",
                    borderColor: "success.main",
                    "& .MuiChip-icon": { color: "success.main" },
                    cursor: "default",
                    fontWeight: 500,
                  } : {
                    fontWeight: isSelected ? 700 : 400,
                    borderColor: isSelected ? "primary.main" : undefined,
                    bgcolor: isSelected ? "primary.main" : undefined,
                    color: isSelected ? "#fff" : undefined,
                    "& .MuiChip-icon": { color: isSelected ? "#fff" : undefined },
                  }}
                />
              );
            })}
          </Box>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {/* Se il soggetto corrente è già iscritto */}
      {currentSubjectRegistered ? (
        <Box sx={{ textAlign: "center", py: 1.5 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
          <Typography variant="body2" fontWeight={600}>
            {subject === "self"
              ? "Sei già iscritto a questo allenamento"
              : `${selectedChild?.name} è già iscritto/a`}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Intestazione soggetto */}
          {currentUser && !hasChildren && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                {(currentUser.name ?? "?")[0].toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>{currentUser.name ?? "Utente"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser.appRole === "GUEST"
                    ? "Ospite"
                    : currentUser.appRole === "PARENT"
                      ? "Genitore"
                      : currentUser.appRole === "COACH"
                        ? "Allenatore"
                        : "Atleta"}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Campo nome per anonimi */}
          {!currentUser && (
            <TextField
              label="Nome e cognome"
              value={anonymousName}
              onChange={(e) => setAnonymousName(e.target.value)}
              fullWidth size="small"
              inputProps={{ maxLength: 60 }}
              sx={{ mb: 2 }}
              disabled={loading}
              error={isDuplicateName}
              helperText={isDuplicateName ? "Questo nome è già iscritto" : ""}
            />
          )}

          {/* Selezione ruolo */}
          {phase === "questionnaire" && (
            <>
              {currentUser && !hasChildren && <Divider sx={{ mb: 2 }} />}

              {/* Staff: selettore diretto; tutti gli altri (atleta, guest, genitore per figlio senza ruolo): questionario */}
              {isStaff ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {subject !== "self" ? `Ruolo di ${selectedChild?.name}:` : "Seleziona il tuo ruolo:"}
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={chosenRole?.role ?? null}
                    onChange={(_, val) => {
                      if (val !== null) { setChosenRole({ role: val as number }); setPhase("confirm"); }
                    }}
                    sx={{ flexWrap: "wrap", gap: 0.5 }}
                  >
                    {ROLES.map((r) => (
                      <ToggleButton key={r} value={r} size="small" sx={{
                        fontWeight: 600, fontSize: "0.75rem", py: 0.5, px: 1.5,
                        borderRadius: "6px !important",
                        border: "1px solid rgba(0,0,0,0.23) !important",
                        "&.Mui-selected": {
                          backgroundColor: ROLE_COLORS[r], color: "#fff",
                          borderColor: `${ROLE_COLORS[r]} !important`,
                          "&:hover": { backgroundColor: ROLE_COLORS[r], opacity: 0.9 },
                        },
                      }}>
                        {ROLE_LABELS[r]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              ) : (
                /* Atleta/Guest o genitore per figlio senza ruolo: questionario guidato */
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {subject !== "self"
                      ? `Rispondi a qualche domanda per determinare il ruolo di ${selectedChild?.name}:`
                      : "Rispondi a qualche domanda per determinare il tuo ruolo nel Baskin:"}
                  </Typography>
                  <SportRoleQuestionnaire
                    onResult={handleQuestionnaireResult}
                    initialSuggested={
                      subject === "self" && currentUser?.sportRoleSuggested
                        ? { role: currentUser.sportRoleSuggested, variant: currentUser.sportRoleSuggestedVariant ?? undefined }
                        : undefined
                    }
                  />
                </>
              )}
            </>
          )}

          {/* Riepilogo e conferma */}
          {phase === "confirm" && chosenRole && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <SportsSoccerIcon color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {hasConfirmedRole ? "Ruolo:" : "Ruolo suggerito:"}
                </Typography>
                <Chip
                  label={sportRoleLabel(chosenRole.role, chosenRole.variant)}
                  size="small"
                  sx={{ bgcolor: ROLE_COLORS[chosenRole.role], color: "#fff", fontWeight: 700, fontSize: "0.78rem" }}
                />
              </Box>

              {!hasConfirmedRole && subject === "self" && (
                <Box sx={{ mb: 2 }}>
                  <Button size="small" variant="text"
                    onClick={() => { setChosenRole(null); setPhase("questionnaire"); }}
                    sx={{ fontSize: "0.78rem", px: 0, color: "primary.main" }}>
                    ↩ Rifai il questionario
                  </Button>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Il ruolo sarà confermato dall&apos;allenatore dopo il primo allenamento.
                  </Typography>
                </Box>
              )}
              {!hasConfirmedRole && subject !== "self" && (
                <Box sx={{ mb: 2 }}>
                  <Button size="small" variant="text"
                    onClick={() => { setChosenRole(null); setPhase("questionnaire"); }}
                    sx={{ fontSize: "0.78rem", px: 0, color: "primary.main" }}>
                    ↩ Cambia ruolo
                  </Button>
                </Box>
              )}

              <Button
                variant="contained" fullWidth onClick={handleSubmit}
                disabled={loading || isDuplicateName || (!currentUser && !anonymousName.trim())}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {loading
                  ? "Iscrizione in corso..."
                  : subject !== "self"
                    ? `Iscrivi ${selectedChild?.name}`
                    : "Iscriviti"}
              </Button>
            </>
          )}
        </>
      )}
    </Box>
  );
}

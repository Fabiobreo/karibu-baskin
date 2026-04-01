"use client";
import { useState, useEffect } from "react";
import {
  Box, TextField, Button, Typography, CircularProgress,
  Chip, Avatar, Divider, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import { ROLE_COLORS, ROLE_LABELS, ROLES, sportRoleLabel } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import SportRoleQuestionnaire, { type SportRoleResult } from "@/components/SportRoleQuestionnaire";

export interface CurrentUser {
  id: string;
  name: string | null;
  appRole: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  sportRoleSuggested: number | null;
  sportRoleSuggestedVariant: string | null;
}

interface Props {
  sessionId: string;
  onRegistered: () => void;
  registeredNames: string[];
  registeredUserIds: (string | null)[];
  currentUser?: CurrentUser | null; // undefined = ancora in caricamento, null = anonimo
}

type Phase = "questionnaire" | "confirm";

export default function RegistrationForm({
  sessionId,
  onRegistered,
  registeredNames,
  registeredUserIds,
  currentUser,
}: Props) {
  // Determina se l'utente loggato ha già un ruolo confermato dall'allenatore
  const hasConfirmedRole = !!currentUser && currentUser.sportRole !== null;

  // Staff (coach/admin): non mostrano il questionario, usano il selettore diretto
  const isStaff = currentUser?.appRole === "COACH" || currentUser?.appRole === "ADMIN";

  // Inizia sempre dal questionario: verrà aggiornato dall'effect quando currentUser carica
  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [chosenRole, setChosenRole] = useState<SportRoleResult | null>(null);

  // Quando currentUser si carica, salta il questionario se il ruolo è già confermato
  useEffect(() => {
    if (currentUser === undefined) return; // ancora in caricamento
    if (currentUser?.sportRole != null) {
      setPhase("confirm");
      setChosenRole({
        role: currentUser.sportRole,
        variant: currentUser.sportRoleVariant ?? undefined,
      });
    }
  }, [currentUser]);

  // Nome per utenti anonimi
  const [anonymousName, setAnonymousName] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Controlla se già iscritto
  const alreadyRegistered =
    !!currentUser && registeredUserIds.includes(currentUser.id);

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

    const name = currentUser ? currentUser.name : anonymousName.trim();
    if (!currentUser && !name) {
      showToast({ message: "Inserisci il tuo nome", severity: "warning" });
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        sessionId,
        role: chosenRole.role,
      };
      if (!currentUser && name) body.name = name;
      if (chosenRole.variant) body.roleVariant = chosenRole.variant;

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        showToast({ message: "Sei già iscritto a questo allenamento", severity: "error" });
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Errore durante l'iscrizione", severity: "error" });
        return;
      }

      const displayName = name ?? "Atleta";
      showToast({ message: `${displayName} iscritto/a con successo!`, severity: "success" });
      setAnonymousName("");
      setChosenRole(hasConfirmedRole ? chosenRole : null);
      setPhase(hasConfirmedRole ? "confirm" : "questionnaire");
      onRegistered();
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Caricamento utente
  if (currentUser === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Utente già iscritto
  if (alreadyRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={600}>
          Sei già iscritto a questo allenamento
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Iscriviti all&apos;allenamento
      </Typography>

      {/* Intestazione utente loggato */}
      {currentUser && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Avatar src={currentUser.name?.[0] ? undefined : undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
            {(currentUser.name ?? "?")[0].toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {currentUser.name ?? "Utente"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentUser.appRole === "GUEST" ? "Ospite" : "Atleta"}
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
          fullWidth
          size="small"
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
          {currentUser && <Divider sx={{ mb: 2 }} />}

          {isStaff ? (
            /* Staff (coach/admin): selettore diretto senza questionario */
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Seleziona il tuo ruolo:
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={chosenRole?.role ?? null}
                onChange={(_, val) => {
                  if (val !== null) {
                    setChosenRole({ role: val as number });
                    setPhase("confirm");
                  }
                }}
                sx={{ flexWrap: "wrap", gap: 0.5 }}
              >
                {ROLES.map((r) => (
                  <ToggleButton
                    key={r}
                    value={r}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      py: 0.5,
                      px: 1.5,
                      borderRadius: "6px !important",
                      border: "1px solid rgba(0,0,0,0.23) !important",
                      "&.Mui-selected": {
                        backgroundColor: ROLE_COLORS[r],
                        color: "#fff",
                        borderColor: `${ROLE_COLORS[r]} !important`,
                        "&:hover": { backgroundColor: ROLE_COLORS[r], opacity: 0.9 },
                      },
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          ) : (
            /* Guest e anonimi: questionario guidato */
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Rispondi a qualche domanda per determinare il tuo ruolo nel Baskin:
              </Typography>
              <SportRoleQuestionnaire
                onResult={handleQuestionnaireResult}
                initialSuggested={
                  currentUser?.sportRoleSuggested
                    ? {
                        role: currentUser.sportRoleSuggested,
                        variant: currentUser.sportRoleSuggestedVariant ?? undefined,
                      }
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
              {hasConfirmedRole ? "Il tuo ruolo:" : "Ruolo suggerito:"}
            </Typography>
            <Chip
              label={sportRoleLabel(chosenRole.role, chosenRole.variant)}
              size="small"
              sx={{
                bgcolor: ROLE_COLORS[chosenRole.role],
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.78rem",
              }}
            />
          </Box>

          {!hasConfirmedRole && (
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => { setChosenRole(null); setPhase("questionnaire"); }}
                sx={{ fontSize: "0.78rem", px: 0, color: "primary.main" }}
              >
                ↩ Rifai il questionario
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Il ruolo sarà confermato dall&apos;allenatore dopo il primo allenamento.
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || isDuplicateName || (!currentUser && !anonymousName.trim())}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Iscrizione in corso..." : "Iscriviti"}
          </Button>
        </>
      )}
    </Box>
  );
}

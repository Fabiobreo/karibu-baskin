"use client";
import {
  Box, TextField, Button, Typography, CircularProgress,
  Chip, Avatar, Divider, ToggleButtonGroup, ToggleButton, Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import LockIcon from "@mui/icons-material/Lock";
import { ROLE_COLORS, ROLE_LABELS, ROLES, sportRoleLabel } from "@/lib/constants";
import SportRoleQuestionnaire from "@/components/SportRoleQuestionnaire";
import { hasRestrictions, type SessionRestrictions } from "@/lib/registrationRestrictions";
import { getCurrentSeason } from "@/lib/seasonUtils";
import { useRegistrationForm } from "@/hooks/useRegistrationForm";
import RegistrationSubjectSelector from "@/components/RegistrationSubjectSelector";

// Re-export types for backwards compatibility with existing imports
export type { TeamMembershipInfo, CurrentUser, ChildInfo } from "@/hooks/useRegistrationForm";

interface Props {
  sessionId: string;
  onRegistered: () => void;
  registeredNames: string[];
  registeredUserIds: (string | null)[];
  registeredChildIds: (string | null)[];
  currentUser?: import("@/hooks/useRegistrationForm").CurrentUser | null;
  parentChildren?: import("@/hooks/useRegistrationForm").ChildInfo[];
  restrictions?: SessionRestrictions & { restrictTeamName?: string | null };
}

export default function RegistrationForm({
  sessionId,
  onRegistered,
  registeredNames,
  registeredUserIds,
  registeredChildIds,
  currentUser,
  parentChildren = [],
  restrictions,
}: Props) {
  const {
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
  } = useRegistrationForm({
    sessionId,
    currentUser,
    parentChildren,
    registeredNames,
    registeredUserIds,
    registeredChildIds,
    onRegistered,
  });

  // ── Caricamento ──────────────────────────────────────────────────────────────

  if (currentUser === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Se è un genitore e tutti i figli sono già iscritti, mostra il messaggio
  const allChildrenRegistered = hasChildren && parentChildren.every((c) => effectiveRegisteredChildIds.includes(c.id));
  if (isParent && hasChildren && allChildrenRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={600}>
          {parentChildren.length === 1
            ? `${parentChildren[0].name} è già iscritto/a`
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

  // ── Restrizioni iscrizione ───────────────────────────────────────────────────
  const restrictionBlock = (() => {
    if (!restrictions || !hasRestrictions(restrictions)) return null;
    const appRole = currentUser?.appRole ?? null;
    if (appRole === "COACH" || appRole === "ADMIN" || appRole === "GUEST") return null;
    const roleToCheck = confirmedRole ?? chosenRole?.role ?? null;
    if (restrictions.allowedRoles.length > 0 && roleToCheck !== null && !restrictions.allowedRoles.includes(roleToCheck)) {
      return `Questo allenamento è riservato ai ruoli ${restrictions.allowedRoles.map((r) => ROLE_LABELS[r]).join(", ")}`;
    }
    if (restrictions.restrictTeamId !== null) {
      if (roleToCheck !== null && restrictions.openRoles.includes(roleToCheck)) return null;
      if (roleToCheck !== null) {
        const subjectTeamMemberships = subject === "self"
          ? (currentUser?.teamMemberships ?? [])
          : (selectedChild?.teamMemberships ?? []);
        if (!subjectTeamMemberships.some((m) => m.teamId === restrictions.restrictTeamId)) {
          const teamName = restrictions.restrictTeamName
            ? `"${restrictions.restrictTeamName}"`
            : "una squadra specifica";
          return `Questo allenamento è riservato ai membri di ${teamName}`;
        }
      }
    }
    return null;
  })();

  const restrictionInfo = (() => {
    if (!restrictions || !hasRestrictions(restrictions)) return null;
    const parts: string[] = [];
    if (restrictions.allowedRoles.length > 0) {
      let allowedRoles = `Ruoli ammessi: ${restrictions.allowedRoles.map((r) => `${r}`).join(", ")}`;
      if (restrictions.restrictTeamId) allowedRoles += ` dei ${restrictions.restrictTeamName}`;
      parts.push(allowedRoles);
    }
    if (restrictions.openRoles.length > 0) {
      parts.push(`Aperto ai ${restrictions.openRoles.map((r) => `${r}`).join(", ")} di entrambe le squadre`);
    }
    return parts.join("\n");
  })();

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Iscriviti all&apos;allenamento
      </Typography>

      {/* Toggle Atleta / Allenatore (solo per COACH) */}
      {isCoach && subject === "self" && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
            Come ti iscrivi?
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={coachMode}
            onChange={(_, val) => { if (val) setCoachMode(val as "athlete" | "coach"); }}
            size="small"
          >
            <ToggleButton value="athlete" sx={{ fontWeight: 600, fontSize: "0.8rem", px: 2 }}>
              Atleta
            </ToggleButton>
            <ToggleButton value="coach" sx={{ fontWeight: 600, fontSize: "0.8rem", px: 2 }}>
              Allenatore
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Banner restrizioni (solo in modalità atleta) */}
      {restrictionInfo && coachMode === "athlete" && (
        <Alert
          severity={restrictionBlock ? "error" : "info"}
          icon={<LockIcon fontSize="small" />}
          sx={{ mb: 2, fontSize: "0.8rem", "& .MuiAlert-message": { whiteSpace: "pre-line" } }}
        >
          {restrictionBlock ?? restrictionInfo}
        </Alert>
      )}

      {/* ── Selettore soggetto (solo genitore con figli) ── */}
      {hasChildren && (
        <RegistrationSubjectSelector
          parentChildren={parentChildren}
          subject={subject}
          effectiveRegisteredChildIds={effectiveRegisteredChildIds}
          onSelectChild={setSubject}
        />
      )}

      {/* Form semplificato per iscrizione come allenatore */}
      {isCoach && coachMode === "coach" && !currentSubjectRegistered && (
        <>
          <Divider sx={{ mb: 2 }} />
          <TextField
            label="Comunicazioni (opzionale)"
            placeholder="es. Devo andare via alle 11:30"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth size="small" multiline minRows={2}
            slotProps={{ htmlInput: { maxLength: 300 } }}
            disabled={loading}
            helperText={note.length > 0 ? `${note.length}/300` : "Lascia vuoto se non hai comunicazioni"}
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="contained" fullWidth onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Iscrizione in corso..." : "Iscriviti come allenatore"}
          </Button>
        </>
      )}

      {/* Form atleta (nascosto in modalità allenatore) */}
      {(!isCoach || coachMode === "athlete") && (currentSubjectRegistered ? (
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
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>{currentUser.name ?? "Utente"}</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    {currentUser.appRole === "GUEST"
                      ? "Ospite"
                      : currentUser.appRole === "PARENT"
                        ? "Genitore"
                        : currentUser.appRole === "COACH"
                          ? "Allenatore"
                          : "Atleta"}
                  </Typography>
                  {currentUser.teamMemberships
                    .filter((m) => m.teamSeason === getCurrentSeason())
                    .map((m) => (
                      <Chip
                        key={m.teamId}
                        label={m.teamName}
                        size="small"
                        sx={{ height: 16, fontSize: "0.65rem", fontWeight: 700, bgcolor: m.teamColor ?? "primary.main", color: "#fff", "& .MuiChip-label": { px: 0.75 } }}
                      />
                    ))}
                </Box>
              </Box>
            </Box>
          )}
          {/* Intestazione figlio selezionato (genitore) */}
          {selectedChild && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                <ChildCareIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>{selectedChild.name}</Typography>
                {selectedChild.teamMemberships
                  .filter((m) => m.teamSeason === getCurrentSeason())
                  .length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                      {selectedChild.teamMemberships
                        .filter((m) => m.teamSeason === getCurrentSeason())
                        .map((m) => (
                          <Chip
                            key={m.teamId}
                            label={m.teamName}
                            size="small"
                            sx={{ height: 16, fontSize: "0.65rem", fontWeight: 700, bgcolor: m.teamColor ?? "primary.main", color: "#fff", "& .MuiChip-label": { px: 0.75 } }}
                          />
                        ))}
                    </Box>
                  )}
              </Box>
            </Box>
          )}

          {/* Campo nome e email per anonimi */}
          {!currentUser && (
            <>
              <TextField
                label="Nome e cognome"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                fullWidth size="small"
                slotProps={{ htmlInput: { maxLength: 60 } }}
                sx={{ mb: 1.5 }}
                disabled={loading}
                error={isDuplicateName}
                helperText={isDuplicateName ? "Questo nome è già iscritto" : ""}
              />
              <TextField
                label="Email (opzionale)"
                type="email"
                value={anonymousEmail}
                onChange={(e) => setAnonymousEmail(e.target.value)}
                fullWidth size="small"
                slotProps={{ htmlInput: { maxLength: 254 } }}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText={
                  <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                    <span>Hai un account Google?</span>
                    <Box
                      component="a"
                      href="/api/auth/signin/google"
                      sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                    >
                      Accedi per registrarti più facilmente.
                    </Box>
                  </Box>
                }
              />
            </>
          )}

          {/* Selezione ruolo */}
          {phase === "questionnaire" && (
            <>
              {currentUser && !hasChildren && <Divider sx={{ mb: 2 }} />}
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

              {restrictionBlock ? (
                <Box sx={{ textAlign: "center", py: 1 }}>
                  <LockIcon sx={{ fontSize: 32, color: "error.main", mb: 0.5 }} />
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    Non puoi iscriverti a questo allenamento
                  </Typography>
                </Box>
              ) : (
                <>
                  <TextField
                    label="Comunicazioni (opzionale)"
                    placeholder="es. Devo andare via alle 11:30"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    fullWidth size="small" multiline minRows={2}
                    slotProps={{ htmlInput: { maxLength: 300 } }}
                    disabled={loading}
                    helperText={note.length > 0 ? `${note.length}/300` : "Lascia vuoto se non hai comunicazioni"}
                    sx={{ mb: 1.5 }}
                  />
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
        </>
      ))}
    </Box>
  );
}

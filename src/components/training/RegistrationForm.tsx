"use client";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Chip,
  Avatar,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import LockIcon from "@mui/icons-material/Lock";
import { ROLE_COLORS, ROLES } from "@/lib/constants";
import SportRoleQuestionnaire from "@/components/training/SportRoleQuestionnaire";
import { hasRestrictions, type SessionRestrictions } from "@/lib/registrationRestrictions";
import { getCurrentSeason } from "@/lib/seasonUtils";
import { signIn } from "next-auth/react";
import { useRegistrationForm } from "@/hooks/useRegistrationForm";
import RegistrationSubjectSelector from "@/components/training/RegistrationSubjectSelector";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";

// Re-export types for backwards compatibility with existing imports
export type {
  TeamMembershipInfo,
  CurrentUser,
  ChildInfo,
  OptimisticReg,
} from "@/hooks/useRegistrationForm";

interface Props {
  sessionId: string;
  onRegistered: () => void;
  onOptimisticAdd?: (reg: import("@/hooks/useRegistrationForm").OptimisticReg) => void;
  onSubmitError?: () => void;
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
  onOptimisticAdd,
  onSubmitError,
  registeredNames,
  registeredUserIds,
  registeredChildIds,
  currentUser,
  parentChildren = [],
  restrictions,
}: Props) {
  const t = useTranslations("trainings");
  const { roleLabel, sportRoleLabel } = useEntityLabels();
  const {
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
    anonymousEmail,
    setAnonymousEmail,
    note,
    setNote,
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
    onOptimisticAdd,
    onSubmitError,
  });

  // ── Caricamento ──────────────────────────────────────────────────────────────

  if (currentUser === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Se è un genitore e tutti (figli + sé stesso) sono già iscritti, mostra il messaggio
  const allChildrenRegistered =
    hasChildren && parentChildren.every((c) => effectiveRegisteredChildIds.includes(c.id));
  if (isParent && hasChildren && allChildrenRegistered && selfRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={600}>
          {parentChildren.length === 1
            ? t("alreadyRegisteredParentAndChild", { name: parentChildren[0].name })
            : t("alreadyRegisteredFamilyAll")}
        </Typography>
      </Box>
    );
  }

  // Se l'utente non genitore è già iscritto, mostra solo il messaggio
  if (!isParent && selfRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={600}>
          {t("alreadyRegistered")}
        </Typography>
      </Box>
    );
  }

  // ── Restrizioni iscrizione ───────────────────────────────────────────────────
  const restrictionBlock = (() => {
    if (!restrictions || !hasRestrictions(restrictions)) return null;
    const appRole = currentUser?.appRole ?? null;
    if (appRole === "ADMIN") return null;
    if (appRole === "COACH" && coachMode === "coach") return null;
    const roleToCheck = confirmedRole ?? chosenRole?.role ?? null;
    if (
      restrictions.restrictTeamId !== null &&
      roleToCheck !== null &&
      restrictions.openRoles.includes(roleToCheck)
    ) {
      return null;
    }
    if (
      restrictions.allowedRoles.length > 0 &&
      roleToCheck !== null &&
      !restrictions.allowedRoles.includes(roleToCheck)
    ) {
      return t("restrictionRoles", {
        roles: restrictions.allowedRoles.map((r) => roleLabel(r)).join(", "),
      });
    }
    if (restrictions.restrictTeamId !== null && appRole !== null && appRole !== "GUEST") {
      if (roleToCheck !== null) {
        const subjectTeamMemberships =
          subject === "self"
            ? (currentUser?.teamMemberships ?? [])
            : (selectedChild?.teamMemberships ?? []);
        if (subjectTeamMemberships.length === 0) return null; // nessuna squadra → bypass
        if (!subjectTeamMemberships.some((m) => m.teamId === restrictions.restrictTeamId)) {
          const teamName = restrictions.restrictTeamName
            ? `"${restrictions.restrictTeamName}"`
            : "una squadra specifica";
          return t("restrictionTeam", { team: teamName });
        }
      }
    }
    return null;
  })();

  const restrictionInfo = (() => {
    if (!restrictions || !hasRestrictions(restrictions)) return null;
    const parts: string[] = [];
    if (restrictions.allowedRoles.length > 0) {
      const roleNames = restrictions.allowedRoles.map((r) => roleLabel(r)).join(", ");
      const teamName = restrictions.restrictTeamName ?? "una squadra specifica";
      parts.push(
        restrictions.restrictTeamId
          ? t("restrictionInfoRolesTeam", { roles: roleNames, team: teamName })
          : t("restrictionInfoRoles", { roles: roleNames })
      );
    } else if (restrictions.restrictTeamId) {
      parts.push(
        t("restrictionInfoTeam", { team: restrictions.restrictTeamName ?? "una squadra specifica" })
      );
    }
    if (restrictions.openRoles.length > 0) {
      parts.push(
        t("restrictionInfoOpen", {
          roles: restrictions.openRoles.map((r) => roleLabel(r)).join(", "),
        })
      );
    }
    return parts.join("\n");
  })();

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t("register")}
      </Typography>

      {/* Toggle Atleta / Allenatore (solo per COACH) */}
      {isCoach && subject === "self" && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            display="block"
            sx={{ mb: 0.75 }}
          >
            {t("registerAs")}
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={coachMode}
            onChange={(_, val) => {
              if (val) setCoachMode(val as "athlete" | "coach");
            }}
            size="small"
          >
            <ToggleButton value="athlete" sx={{ fontWeight: 600, fontSize: "0.8rem", px: 2 }}>
              {t("athlete")}
            </ToggleButton>
            <ToggleButton value="coach" sx={{ fontWeight: 600, fontSize: "0.8rem", px: 2 }}>
              {t("coachRole")}
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
          {restrictionInfo}
        </Alert>
      )}

      {/* ── Selettore soggetto (solo genitori) ── */}
      {isParent && (
        <RegistrationSubjectSelector
          selfName={currentUser?.name ?? t("registerSelf")}
          selfRegistered={selfRegistered}
          parentChildren={parentChildren}
          subject={subject}
          effectiveRegisteredChildIds={effectiveRegisteredChildIds}
          onSelect={setSubject}
        />
      )}

      {/* Form semplificato per iscrizione come allenatore */}
      {isCoach && coachMode === "coach" && !currentSubjectRegistered && (
        <>
          <Divider sx={{ mb: 2 }} />
          <TextField
            label={t("notes")}
            placeholder={t("notesPlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 300 } }}
            disabled={loading}
            helperText={note.length > 0 ? `${note.length}/300` : t("notesEmpty")}
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? t("registering") : t("registerAsCoach")}
          </Button>
        </>
      )}

      {/* Form atleta (nascosto in modalità allenatore) */}
      {(!isCoach || coachMode === "athlete") &&
        (currentSubjectRegistered ? (
          <Box sx={{ textAlign: "center", py: 1.5 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
            <Typography variant="body2" fontWeight={600}>
              {subject === "self"
                ? t("alreadyRegistered")
                : t("alreadyRegisteredChild", { name: selectedChild?.name ?? "" })}
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
                  <Typography variant="body2" fontWeight={600}>
                    {currentUser.name ?? "Utente"}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">
                      {currentUser.appRole === "GUEST"
                        ? t("roleGuest")
                        : currentUser.appRole === "PARENT"
                          ? t("roleParent")
                          : currentUser.appRole === "COACH"
                            ? t("coachRole")
                            : t("athlete")}
                    </Typography>
                    {currentUser.teamMemberships
                      .filter((m) => m.teamSeason === getCurrentSeason())
                      .map((m) => (
                        <Chip
                          key={m.teamId}
                          label={m.teamName}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            bgcolor: m.teamColor ?? "primary.main",
                            color: "#fff",
                            "& .MuiChip-label": { px: 0.75 },
                          }}
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
                  <Typography variant="body2" fontWeight={600}>
                    {selectedChild.name}
                  </Typography>
                  {selectedChild.teamMemberships.filter((m) => m.teamSeason === getCurrentSeason())
                    .length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                      {selectedChild.teamMemberships
                        .filter((m) => m.teamSeason === getCurrentSeason())
                        .map((m) => (
                          <Chip
                            key={m.teamId}
                            label={m.teamName}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: m.teamColor ?? "primary.main",
                              color: "#fff",
                              "& .MuiChip-label": { px: 0.75 },
                            }}
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
                  label={t("fullName")}
                  value={anonymousName}
                  onChange={(e) => setAnonymousName(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 60 } }}
                  sx={{ mb: 1.5 }}
                  disabled={loading}
                  error={isDuplicateName}
                  helperText={isDuplicateName ? t("duplicateName") : ""}
                />
                <TextField
                  label={t("emailOptional")}
                  type="email"
                  value={anonymousEmail}
                  onChange={(e) => setAnonymousEmail(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                  sx={{ mb: 2 }}
                  disabled={loading}
                  helperText={
                    <Box
                      component="span"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
                    >
                      <span>{t("hasGoogle")}</span>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => signIn("google", { callbackUrl: window.location.href })}
                        sx={{
                          color: "primary.main",
                          fontWeight: 600,
                          textDecoration: "none",
                          background: "none",
                          border: "none",
                          p: 0,
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: "inherit",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {t("loginEasier")}
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
                      {subject !== "self"
                        ? t("staffRolePromptChild", { name: selectedChild?.name ?? "" })
                        : t("staffRolePromptSelf")}
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
                            border: "1px solid !important",
                            borderColor: "divider !important",
                            "&.Mui-selected": {
                              backgroundColor: ROLE_COLORS[r],
                              color: "#fff",
                              borderColor: `${ROLE_COLORS[r]} !important`,
                              "&:hover": { backgroundColor: ROLE_COLORS[r], opacity: 0.9 },
                            },
                          }}
                        >
                          {roleLabel(r)}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {subject !== "self"
                        ? t("questionnairePromptChild", { name: selectedChild?.name ?? "" })
                        : t("questionnairePromptSelf")}
                    </Typography>
                    <SportRoleQuestionnaire
                      onResult={handleQuestionnaireResult}
                      initialSuggested={
                        subject === "self" && currentUser?.sportRoleSuggested
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
                    {hasConfirmedRole ? t("roleLabel") : t("roleSuggested")}
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

                {!hasConfirmedRole && subject === "self" && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setChosenRole(null);
                        setPhase("questionnaire");
                      }}
                      sx={{ fontSize: "0.78rem", px: 0, color: "primary.main" }}
                    >
                      {t("redoQuestionnaire")}
                    </Button>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.5 }}
                    >
                      {t("roleConfirmNote")}
                    </Typography>
                  </Box>
                )}
                {!hasConfirmedRole && subject !== "self" && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setChosenRole(null);
                        setPhase("questionnaire");
                      }}
                      sx={{ fontSize: "0.78rem", px: 0, color: "primary.main" }}
                    >
                      {t("changeRole")}
                    </Button>
                  </Box>
                )}

                {restrictionBlock ? (
                  <Box sx={{ textAlign: "center", py: 1 }}>
                    <LockIcon sx={{ fontSize: 32, color: "error.main", mb: 0.5 }} />
                    <Typography variant="body2" color="error.main" fontWeight={600}>
                      {t("cannotRegister")}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <TextField
                      label={t("notes")}
                      placeholder={t("notesPlaceholder")}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      slotProps={{ htmlInput: { maxLength: 300 } }}
                      disabled={loading}
                      helperText={note.length > 0 ? `${note.length}/300` : t("notesEmpty")}
                      sx={{ mb: 1.5 }}
                    />
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSubmit}
                      disabled={
                        loading || isDuplicateName || (!currentUser && !anonymousName.trim())
                      }
                      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {loading
                        ? t("registering")
                        : subject !== "self"
                          ? t("registerChild", { name: selectedChild?.name ?? "" })
                          : t("registerSelf")}
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

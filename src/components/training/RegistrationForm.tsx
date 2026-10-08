"use client";
import InlineError from "@/components/common/InlineError";
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
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import { ROLES } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import { teamColor, teamFill } from "@/lib/teamColors";
import SportRoleQuestionnaire from "@/components/training/SportRoleQuestionnaire";
import { hasRestrictions, type SessionRestrictions } from "@/lib/registrationRestrictions";
import { useState } from "react";
import { usePathname } from "next/navigation";
import LoginIcon from "@mui/icons-material/Login";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { loginHref } from "@/lib/loginReturn";
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
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  /** Stagione in corso (flag dello staff, o calendario): filtra il badge squadra. */
  currentSeason: string;
}

/**
 * Chip della squadra agonistica: riempimento nella tinta con etichetta bianca;
 * senza tinta nessun segno di colore (chip contornato neutro), mai l'arancio.
 */
function teamChipSx(raw: string | null) {
  const f = teamFill(raw);
  return {
    ...(f ? { bgcolor: f.bg, color: f.fg } : { color: "text.primary" }),
    "& .MuiChip-label": { px: 0.75 },
  };
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
  currentSeason,
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
    needsOwnName,
    anonymousEmail,
    setAnonymousEmail,
    note,
    setNote,
    loading,
    submitError,
    clearSubmitError,
    selectedChild,
    confirmedRole,
    hasConfirmedRole,
    effectiveRegisteredChildIds,
    subjectChildren,
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
  // Chi non ha fatto l'accesso sceglie prima come iscriversi (UX-34): il form
  // da ospite compare solo dopo "Continua senza account".
  const [continueAsGuest, setContinueAsGuest] = useState(false);

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
    hasChildren && subjectChildren.every((c) => effectiveRegisteredChildIds.includes(c.id));
  if (isParent && hasChildren && allChildrenRegistered && selfRegistered) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
          {subjectChildren.length === 1
            ? t("alreadyRegisteredParentAndChild", { name: subjectChildren[0].name })
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
        <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
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
      <Typography component="h2" variant="h6" gutterBottom>
        {t("register")}
      </Typography>

      {/* Toggle Atleta / Allenatore (solo per COACH) */}
      {isCoach && subject === "self" && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={FONT_WEIGHT.semibold}
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
            <ToggleButton
              value="athlete"
              sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs, px: 2 }}
            >
              {t("athlete")}
            </ToggleButton>
            <ToggleButton
              value="coach"
              sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs, px: 2 }}
            >
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
          sx={{ mb: 2, fontSize: TYPE_SCALE.xs, "& .MuiAlert-message": { whiteSpace: "pre-line" } }}
        >
          {restrictionInfo}
        </Alert>
      )}

      {/* ── Selettore soggetto (solo genitori) ── */}
      {isParent && subjectChildren.length > 0 && (
        <RegistrationSubjectSelector
          selfName={currentUser?.name ?? null}
          selfRegistered={selfRegistered}
          parentChildren={subjectChildren}
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
          {submitError && (
            <InlineError
              title={t("registrationNotSaved")}
              message={submitError}
              onRetry={handleSubmit}
              onClose={clearSubmitError}
              retrying={loading}
            />
          )}
          <Button
            size="large"
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
        (!currentUser && !continueAsGuest ? (
          <SignInOrGuestChoice onGuest={() => setContinueAsGuest(true)} />
        ) : currentSubjectRegistered ? (
          <Box sx={{ textAlign: "center", py: 1.5 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
            <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
              {subject === "self"
                ? t("alreadyRegistered")
                : t("alreadyRegisteredChild", { name: selectedChild?.name ?? "" })}
            </Typography>
          </Box>
        ) : hasConfirmedRole && restrictionBlock ? (
          /* Pre-check: ruolo già confermato e bloccato dalle restrizioni → niente form */
          <RegistrationBlocked reason={restrictionBlock} />
        ) : (
          <>
            {/* Intestazione soggetto */}
            {currentUser && !hasChildren && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                {/* Stessa foto dell'header: quella caricata, altrimenti quella di Google. */}
                <Avatar
                  src={currentUser.customImage ?? currentUser.image ?? undefined}
                  alt=""
                  sx={{ width: 32, height: 32, fontSize: TYPE_SCALE.sm }}
                >
                  {(currentUser.name ?? "?")[0].toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                    {currentUser.name ?? t("unnamedUser")}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">
                      {currentUser.appRole === "GUEST"
                        ? t("roleGuest")
                        : currentUser.appRole === "PARENT"
                          ? t("roleParent")
                          : currentUser.appRole === "DIRECTOR"
                            ? t("roleDirector")
                            : currentUser.appRole === "COACH"
                              ? t("coachRole")
                              : t("athlete")}
                    </Typography>
                    {currentUser.teamMemberships
                      .filter((m) => m.teamSeason === currentSeason)
                      .map((m) => (
                        <Chip
                          key={m.teamId}
                          label={m.teamName}
                          size="small"
                          variant={teamColor(m.teamColor) ? "filled" : "outlined"}
                          sx={{ height: 20, fontSize: TYPE_SCALE.xs, ...teamChipSx(m.teamColor) }}
                        />
                      ))}
                  </Box>
                </Box>
              </Box>
            )}
            {/* Intestazione figlio selezionato (genitore) */}
            {selectedChild && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: TYPE_SCALE.sm }}>
                  <PersonIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                    {selectedChild.name}
                  </Typography>
                  {selectedChild.teamMemberships.filter((m) => m.teamSeason === currentSeason)
                    .length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                      {selectedChild.teamMemberships
                        .filter((m) => m.teamSeason === currentSeason)
                        .map((m) => (
                          <Chip
                            key={m.teamId}
                            label={m.teamName}
                            size="small"
                            variant={teamColor(m.teamColor) ? "filled" : "outlined"}
                            sx={{ height: 20, fontSize: TYPE_SCALE.xs, ...teamChipSx(m.teamColor) }}
                          />
                        ))}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Account senza nome (magic link): senza, la rotta rifiuterebbe
                l'iscrizione. Il nome finisce anche nel profilo. */}
            {currentUser && needsOwnName && (
              <TextField
                label={t("fullName")}
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                fullWidth
                size="small"
                autoComplete="name"
                slotProps={{ htmlInput: { maxLength: 60 } }}
                sx={{ mb: 2 }}
                disabled={loading}
                helperText={t("ownNameHelper")}
              />
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
                  autoComplete="name"
                  // Compare dopo il clic su "Continua senza account": il fuoco
                  // va al primo campo, non resta su un bottone che non c'è più.
                  autoFocus
                  slotProps={{ htmlInput: { maxLength: 60 } }}
                  sx={{ mb: 1.5 }}
                  disabled={loading}
                  error={isDuplicateName}
                  helperText={isDuplicateName ? t("duplicateName") : ""}
                />
                <TextField
                  label={t("emailOptional")}
                  type="email"
                  autoComplete="email"
                  value={anonymousEmail}
                  onChange={(e) => setAnonymousEmail(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                  sx={{ mb: 2 }}
                  disabled={loading}
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
                            fontWeight: FONT_WEIGHT.semibold,
                            fontSize: TYPE_SCALE.xs,
                            py: 0.5,
                            px: 1.5,
                            borderRadius: `${RADIUS.sm} !important`,
                            border: "1px solid !important",
                            borderColor: "divider !important",
                            // Selezionato = arancio (stato attivo), non la tinta
                            // del ruolo: il numero e' gia' l'informazione (UX-29).
                            "&.Mui-selected, &.Mui-selected:hover": {
                              bgcolor: "primary.fill",
                              color: "common.white",
                              borderColor: "primary.fill !important",
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
                    {/* L'introduzione la dà il questionario stesso (UX-34):
                        qui un secondo testo la ripeterebbe. */}
                    <SportRoleQuestionnaire
                      onResult={handleQuestionnaireResult}
                      subjectName={subject !== "self" ? selectedChild?.name : undefined}
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
                  <RoleBadge role={chosenRole.role} variant={chosenRole.variant} />
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
                      sx={{ fontSize: TYPE_SCALE.xs, px: 0, color: "primary.onLight" }}
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
                      sx={{ fontSize: TYPE_SCALE.xs, px: 0, color: "primary.onLight" }}
                    >
                      {t("changeRole")}
                    </Button>
                  </Box>
                )}

                {restrictionBlock ? (
                  <RegistrationBlocked reason={restrictionBlock} />
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
                    {submitError && (
                      <InlineError
                        title={t("registrationNotSaved")}
                        message={submitError}
                        onRetry={handleSubmit}
                        onClose={clearSubmitError}
                        retrying={loading}
                      />
                    )}
                    <Button
                      size="large"
                      variant="contained"
                      fullWidth
                      onClick={handleSubmit}
                      disabled={
                        loading || isDuplicateName || (needsOwnName && !anonymousName.trim())
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

/**
 * Iscrizione non consentita (UX-05): il motivo in testo leggibile, non in
 * didascalia grigia, e una via d'uscita verso lo staff invece di un vicolo cieco.
 */
function RegistrationBlocked({ reason }: { reason: string }) {
  const t = useTranslations("trainings");
  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <LockIcon sx={{ fontSize: 32, color: "error.main", mb: 0.5 }} />
      <Typography variant="body1" color="error.main" fontWeight={FONT_WEIGHT.semibold}>
        {t("cannotRegister")}
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ mt: 0.75 }}>
        {reason}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {t("cannotRegisterHelp")}
      </Typography>
      <Button href="/contatti" variant="outlined" size="small" sx={{ mt: 1 }}>
        {t("askStaff")}
      </Button>
    </Box>
  );
}

/**
 * Due strade di pari peso per chi non ha fatto l'accesso (UX-34): accedere,
 * con ritorno a questa pagina, o iscriversi come ospite. È l'unico invito ad
 * accedere della pagina.
 */
function SignInOrGuestChoice({ onGuest }: { onGuest: () => void }) {
  const t = useTranslations("trainings");
  const pathname = usePathname();
  const optionSx = {
    justifyContent: "flex-start",
    textAlign: "left",
    textTransform: "none",
    py: 1.25,
    px: 2,
    gap: 0.5,
  } as const;
  return (
    <Box>
      <Typography
        id="registration-choice"
        variant="body2"
        fontWeight={FONT_WEIGHT.semibold}
        sx={{ mb: 1.5 }}
      >
        {t("signInChoiceTitle")}
      </Typography>
      <Box
        role="group"
        aria-labelledby="registration-choice"
        sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <Button
          href={loginHref(pathname)}
          variant="outlined"
          fullWidth
          startIcon={<LoginIcon />}
          sx={optionSx}
        >
          <Box component="span" sx={{ display: "flex", flexDirection: "column" }}>
            <Box component="span" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
              {t("signInChoiceLogin")}
            </Box>
            <Box component="span" sx={{ typography: "caption", color: "text.secondary" }}>
              {t("signInChoiceLoginHint")}
            </Box>
          </Box>
        </Button>
        <Button
          onClick={onGuest}
          variant="outlined"
          fullWidth
          startIcon={<PersonOutlineIcon />}
          sx={optionSx}
        >
          <Box component="span" sx={{ display: "flex", flexDirection: "column" }}>
            <Box component="span" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
              {t("signInChoiceGuest")}
            </Box>
            <Box component="span" sx={{ typography: "caption", color: "text.secondary" }}>
              {t("signInChoiceGuestHint")}
            </Box>
          </Box>
        </Button>
      </Box>
    </Box>
  );
}

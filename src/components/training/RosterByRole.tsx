"use client";
import React, { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import InlineError from "@/components/common/InlineError";
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Skeleton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Link from "next/link";
import { ROLES, roleColor } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { readError } from "@/lib/fetchJson";
import QueryErrorState from "@/components/common/QueryErrorState";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface Registration {
  id: string;
  name: string;
  role: number;
  note?: string | null;
  createdAt: string | Date;
  sessionId: string;
  userId: string | null;
  childId?: string | null;
  registeredAsCoach?: boolean;
  userSlug?: string | null;
  attended?: boolean | null;
}

interface Props {
  registrations: Registration[];
  currentUserId?: string | null;
  linkedChildId?: string | null;
  parentChildIds?: string[];
  childUserIds?: string[];
  isStaff?: boolean;
  isEnded?: boolean;
  onUnregistered?: () => void;
  onAttendanceChanged?: () => void;
  /** La lettura degli iscritti è fallita: senza questo, `registrations` vuoto
   *  verrebbe reso come "nessun iscritto", che è un'affermazione diversa. */
  loadFailed?: boolean;
  onRetry?: () => void;
  /** Visitatore non autenticato: i nomi non gli vengono serviti, ma il numero
   *  di iscritti sì, perché è l'informazione utile e non identifica nessuno. */
  restricted?: false | "anonymous" | "guest";
  /** Non si sa ancora chi guarda, o la rosa sta arrivando: nessuno stato vuoto. */
  loading?: boolean;
  totalCount?: number;
  /** Solo staff: apre la gestione iscritti (aggiungi/togli, anche a posteriori). */
  onManage?: () => void;
}

// ── Icona stato presenza ──────────────────────────────────────────────────────

// Tempo per annullare una disiscrizione (UX-05): 10 s, non 3, cosi' anche chi
// legge lentamente fa in tempo a leggere l'avviso e a toccare "Annulla".
const UNDO_MS = 10_000;

function AttendanceIcon({ attended }: { attended: boolean | null | undefined }) {
  if (attended === true) return <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />;
  if (attended === false) return <CancelIcon sx={{ fontSize: 14, color: "error.main" }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: "text.secondary" }} />;
}

function nextAttended(current: boolean | null | undefined): boolean | null {
  if (current == null) return true;
  if (current === true) return false;
  return null;
}

// attendedLabel is defined inside the component to access t()

// ── Pill atleta ───────────────────────────────────────────────────────────────

interface PillProps {
  reg: Registration;
  roleColor: string;
  highlighted: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  isPendingDelete: boolean;
  isStaff: boolean;
  showAttendance: boolean;
  isToggling: boolean;
  onDelete: () => void;
  onToggleAttended: () => void;
  attendedLabel: (attended: boolean | null | undefined) => string;
  removeLabel: string;
}

function AthletePill({
  reg,
  roleColor,
  highlighted,
  canDelete,
  isDeleting,
  isPendingDelete,
  isStaff,
  showAttendance,
  isToggling,
  onDelete,
  onToggleAttended,
  attendedLabel,
  removeLabel,
}: PillProps) {
  const initial = reg.name[0]?.toUpperCase() ?? "?";
  const hasNote = !!reg.note;

  const pill = (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: "1.5px solid",
        borderColor: highlighted ? roleColor : "divider",
        borderRadius: RADIUS.pill,
        overflow: "hidden",
        bgcolor: highlighted ? `${roleColor}1A` : "background.paper",
        opacity: isDeleting || isPendingDelete ? 0.45 : 1,
        transition: "border-color 0.15s, opacity 0.15s",
      }}
    >
      {/* Avatar colorato */}
      <Box
        sx={{
          width: 28,
          height: 28,
          bgcolor: roleColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            color: "common.white",
            fontWeight: FONT_WEIGHT.bold,
            fontSize: TYPE_SCALE.xs,
            lineHeight: 1,
          }}
        >
          {initial}
        </Typography>
      </Box>

      {/* Nome (link se ha slug, altrimenti testo) */}
      <Box sx={{ px: 1, display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
        {reg.userSlug ? (
          <Box
            component={Link}
            href={`/giocatori/${reg.userSlug}`}
            sx={{
              color: "inherit",
              textDecoration: "none",
              fontWeight: highlighted ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
              fontSize: TYPE_SCALE.sm,
              whiteSpace: "nowrap",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {reg.name}
          </Box>
        ) : (
          <Typography
            sx={{
              fontWeight: highlighted ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
              fontSize: TYPE_SCALE.sm,
              whiteSpace: "nowrap",
            }}
          >
            {reg.name}
          </Typography>
        )}
        {hasNote && (
          <ChatBubbleOutlineIcon
            sx={{ fontSize: "0.68rem", color: "text.secondary", flexShrink: 0 }}
          />
        )}
      </Box>

      {/* Toggle presenza — solo staff su sessione terminata */}
      {showAttendance && (
        <Tooltip title={attendedLabel(reg.attended)} arrow placement="top">
          <span>
            <IconButton
              size="small"
              onClick={onToggleAttended}
              disabled={isToggling}
              aria-label={attendedLabel(reg.attended)}
              sx={{ p: "3px", color: "inherit", "&:hover": { bgcolor: "transparent" } }}
            >
              {isToggling ? (
                <CircularProgress size={12} />
              ) : (
                <AttendanceIcon attended={reg.attended} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      )}

      {/* Pulsante rimozione */}
      {canDelete && !isDeleting && !isPendingDelete && !showAttendance && (
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label={removeLabel}
          sx={{
            p: "3px",
            mr: 0.5,
            color: "text.secondary",
            "&:hover": { color: "error.main", bgcolor: "transparent" },
          }}
        >
          <CloseIcon sx={{ fontSize: 13 }} />
        </IconButton>
      )}
      {isDeleting && (
        <Box sx={{ px: 0.75, display: "flex", alignItems: "center" }}>
          <CircularProgress size={12} sx={{ color: roleColor }} />
        </Box>
      )}
    </Box>
  );

  if (hasNote && !isStaff) {
    return (
      <Tooltip title={reg.note!} arrow placement="top">
        <span>{pill}</span>
      </Tooltip>
    );
  }

  return (
    <Box>
      {pill}
      {hasNote && isStaff && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            px: 1,
            mt: 0.25,
            fontSize: TYPE_SCALE.xs,
            fontStyle: "italic",
            color: "text.secondary",
            wordBreak: "break-word",
            lineHeight: 1.3,
          }}
        >
          {reg.note}
        </Typography>
      )}
    </Box>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function RosterByRole({
  registrations,
  currentUserId,
  linkedChildId,
  parentChildIds = [],
  childUserIds = [],
  isStaff,
  isEnded,
  onUnregistered,
  onAttendanceChanged,
  loadFailed = false,
  onRetry,
  restricted = false,
  loading = false,
  totalCount = 0,
  onManage,
}: Props) {
  const t = useTranslations("trainings");
  const tCommon = useTranslations("common");
  const { roleLabel } = useEntityLabels();

  function attendedLabel(attended: boolean | null | undefined): string {
    if (attended === true) return t("attendancePresent");
    if (attended === false) return t("attendanceAbsent");
    return t("attendanceUnmarked");
  }

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Optimistic attendance overrides while API call is in flight
  const [attendedOverrides, setAttendedOverrides] = useState<Record<string, boolean | null>>({});
  const autoMarkedRef = useRef(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRegRef = useRef<Registration | null>(null);
  const { showToast } = useToast();
  // Ultimo errore su un iscritto: resta in testa alla lista, con il nome e
  // "Riprova", finche' non si riprova o si chiude (UX-25).
  const [rowError, setRowError] = useState<{
    title: string;
    message: string;
    retry?: () => void;
  } | null>(null);

  const showAttendance = !!(isStaff && isEnded);

  // Cancel timer on unmount to avoid acting on an unmounted component
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (reg: Registration) => {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
    },
    onSuccess: () => onUnregistered?.(),
    onError: (err, reg) =>
      setRowError({
        title: t("unregisterFailed", { name: reg.name }),
        message: err instanceof Error ? err.message : tCommon("networkError"),
        retry: () => void executeDeletion(reg),
      }),
  });

  async function executeDeletion(reg: Registration) {
    setRowError(null);
    setDeletingId(reg.id);
    try {
      await deleteMutation.mutateAsync(reg);
    } catch {
      // L'errore lo mostra `onError` accanto alla lista.
    } finally {
      setDeletingId(null);
    }
  }

  function handleUnregister(reg: Registration) {
    // Commit any in-flight pending deletion before starting a new one
    if (pendingDeleteRegRef.current && deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
      void executeDeletion(pendingDeleteRegRef.current);
    }

    const isOwnChild =
      (!!reg.childId && (parentChildIds.includes(reg.childId) || reg.childId === linkedChildId)) ||
      (!!reg.userId && childUserIds.includes(reg.userId));
    const aboutSomeoneElse =
      (isStaff && reg.userId !== currentUserId && !isOwnChild) ||
      (isOwnChild && reg.childId !== linkedChildId);
    const msg = aboutSomeoneElse
      ? t("rosterUnregisteredOther", { name: reg.name })
      : t("rosterUnregisteredSelf");

    pendingDeleteRegRef.current = reg;
    setPendingDeleteId(reg.id);

    function cancelPending() {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
      pendingDeleteRegRef.current = null;
      setPendingDeleteId(null);
    }

    deleteTimerRef.current = setTimeout(() => {
      deleteTimerRef.current = null;
      pendingDeleteRegRef.current = null;
      setPendingDeleteId(null);
      void executeDeletion(reg);
    }, UNDO_MS);

    showToast({
      message: msg,
      severity: "success",
      duration: UNDO_MS,
      progressMs: UNDO_MS,
      action: (
        <Button
          size="small"
          onClick={cancelPending}
          sx={{ color: "common.white", ml: 0.5, minWidth: 0, p: "2px 8px" }}
        >
          {t("rosterUndo")}
        </Button>
      ),
    });
  }

  async function handleToggleAttended(reg: Registration) {
    const currentAttended = reg.id in attendedOverrides ? attendedOverrides[reg.id] : reg.attended;
    const next = nextAttended(currentAttended);

    setTogglingId(reg.id);
    setRowError(null);
    setAttendedOverrides((prev) => ({ ...prev, [reg.id]: next }));
    const failed = (message: string) =>
      setRowError({
        title: t("attendanceFailed", { name: reg.name }),
        message,
        retry: () => void handleToggleAttended(reg),
      });

    try {
      const res = await fetch(`/api/registrations/${reg.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended: next }),
      });
      if (res.ok) {
        onAttendanceChanged?.();
      } else {
        // Rollback
        setAttendedOverrides((prev) => ({ ...prev, [reg.id]: currentAttended ?? null }));
        failed(t("attendanceUpdateError"));
      }
    } catch {
      setAttendedOverrides((prev) => ({ ...prev, [reg.id]: currentAttended ?? null }));
      failed(tCommon("networkError"));
    } finally {
      setTogglingId(null);
    }
  }

  const athleteRegs = registrations.filter((r) => !r.registeredAsCoach);
  const coachRegs = registrations.filter((r) => r.registeredAsCoach);

  useEffect(() => {
    if (!showAttendance || autoMarkedRef.current) return;
    const unmarked = athleteRegs.filter((r) => r.attended == null);
    if (unmarked.length === 0) return;

    autoMarkedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttendedOverrides((prev) => ({
      ...prev,
      ...Object.fromEntries(unmarked.map((r) => [r.id, true as boolean | null])),
    }));

    Promise.allSettled(
      unmarked.map((r) =>
        fetch(`/api/registrations/${r.id}/attendance`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attended: true }),
        })
      )
    ).then((results) => {
      const anyFailed = results.some(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      );
      if (anyFailed) {
        setAttendedOverrides((prev) => {
          const rollback = { ...prev };
          unmarked.forEach((r) => {
            rollback[r.id] = null;
          });
          return rollback;
        });
        setRowError({ title: t("attendanceAutoError"), message: "" });
      } else {
        onAttendanceChanged?.();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAttendance]);
  const activeRoles = ROLES.filter((role) => athleteRegs.some((r) => r.role === role));

  // Counts for the attendance summary header
  const presentCount = showAttendance
    ? athleteRegs.filter((r) => {
        const val = r.id in attendedOverrides ? attendedOverrides[r.id] : r.attended;
        return val === true;
      }).length
    : null;

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          px: 2,
          py: 1.5,
          // Per chi non è tesserato la card è solo questa riga (UX-34).
          borderBottom: restricted && !loading ? "none" : "1px solid",
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.grey[50],
        }}
      >
        <Typography component="h2" variant="h6" sx={{ lineHeight: 1 }}>
          {t("roster")}
        </Typography>
        {/* Nessun conteggio se la lettura è fallita: "0 atleti" accanto al
            messaggio di errore sarebbe una contraddizione, e il numero è
            proprio l'informazione che non abbiamo. */}
        {!loadFailed && !loading && (
          <Chip
            label={t("athletes", { count: restricted ? totalCount : athleteRegs.length })}
            size="small"
          />
        )}
        {restricted && !loading && (
          <Typography variant="body2" color="text.secondary">
            {t("rosterPrivateShort")}
          </Typography>
        )}
        {!loadFailed && !restricted && coachRegs.length > 0 && (
          <Chip
            label={t("coachCount", { count: coachRegs.length })}
            size="small"
            variant="outlined"
          />
        )}
        {showAttendance && presentCount !== null && (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important" }} />}
            label={t("presentCount", { count: presentCount })}
            size="small"
            color="success"
            variant="outlined"
            sx={{ ml: onManage ? 0 : "auto" }}
          />
        )}
        {isStaff && onManage && !loading && !restricted && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ManageAccountsIcon />}
            onClick={onManage}
            sx={{ ml: "auto", minHeight: 36 }}
          >
            {t("manageRoster")}
          </Button>
        )}
      </Box>
      {rowError && (
        <InlineError
          title={rowError.title}
          message={rowError.message}
          onRetry={rowError.retry}
          onClose={() => setRowError(null)}
          sx={{ mx: 2, mt: 1.5, mb: 0 }}
        />
      )}

      {/* Body */}
      {loading ? (
        <Box sx={{ px: 2, py: 2.5 }}>
          <Skeleton variant="text" width="55%" />
          <Skeleton variant="text" width="35%" />
        </Box>
      ) : restricted ? null : loadFailed ? (
        <QueryErrorState message={t("rosterLoadError")} onRetry={onRetry} compact />
      ) : registrations.length === 0 ? (
        <Typography color="text.secondary" sx={{ px: 2, py: 2.5 }}>
          {t("noAthletes")}
        </Typography>
      ) : (
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          {/* Sezioni per ruolo */}
          {activeRoles.map((role) => {
            const group = athleteRegs.filter((r) => r.role === role);
            return (
              <Box key={role} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: roleColor(role),
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="overline"
                    // Il colore del ruolo sta nel pallino: come testo, in scuro, i ruoli
                    // più scuri scendevano sotto 2:1 (UX-22).
                    sx={{ color: "text.primary", lineHeight: 1 }}
                  >
                    {roleLabel(role)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={FONT_WEIGHT.semibold}
                  >
                    {group.length}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {group.map((reg) => {
                    const isOwn =
                      !!currentUserId &&
                      (reg.userId === currentUserId ||
                        (!!linkedChildId && reg.childId === linkedChildId));
                    const isOwnChild =
                      (!!reg.childId && parentChildIds.includes(reg.childId)) ||
                      (!!reg.userId && childUserIds.includes(reg.userId));
                    const highlighted = isOwn || isOwnChild;
                    const canDelete = isOwn || isOwnChild || !!isStaff;

                    const effectiveReg =
                      reg.id in attendedOverrides
                        ? { ...reg, attended: attendedOverrides[reg.id] }
                        : reg;

                    return (
                      <AthletePill
                        key={reg.id}
                        reg={effectiveReg}
                        roleColor={roleColor(role) ?? "grey.500"}
                        highlighted={highlighted}
                        canDelete={canDelete}
                        isDeleting={deletingId === reg.id}
                        isPendingDelete={pendingDeleteId === reg.id}
                        isStaff={!!isStaff}
                        showAttendance={showAttendance}
                        isToggling={togglingId === reg.id}
                        onDelete={() => handleUnregister(reg)}
                        onToggleAttended={() => handleToggleAttended(reg)}
                        attendedLabel={attendedLabel}
                        removeLabel={t("removeRegistrationOf", { name: reg.name })}
                      />
                    );
                  })}
                </Box>
              </Box>
            );
          })}

          {/* Sezione allenatori */}
          {coachRegs.length > 0 && (
            <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5, mt: 0.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={FONT_WEIGHT.semibold}
                display="block"
                sx={{ mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {t("coachesPresent")}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {coachRegs.map((reg) => {
                  const isOwn = !!currentUserId && reg.userId === currentUserId;
                  const canDelete = isOwn || !!isStaff;
                  const isDeleting = deletingId === reg.id;
                  const isPending = pendingDeleteId === reg.id;
                  return (
                    <Box
                      key={reg.id}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1.5px solid",
                        borderColor: isOwn ? "text.secondary" : "divider",
                        borderRadius: RADIUS.pill,
                        overflow: "hidden",
                        bgcolor: isOwn ? "grey.800" : "background.paper",
                        opacity: isDeleting || isPending ? 0.45 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: "grey.600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "common.white",
                            fontWeight: FONT_WEIGHT.bold,
                            fontSize: TYPE_SCALE.xs,
                          }}
                        >
                          {reg.name[0]?.toUpperCase() ?? "?"}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          px: 1,
                          fontSize: TYPE_SCALE.sm,
                          fontWeight: isOwn ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                          color: isOwn ? "common.white" : "text.primary",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {reg.name}
                      </Typography>
                      {canDelete && !isDeleting && !isPending && (
                        <IconButton
                          size="small"
                          onClick={() => handleUnregister(reg)}
                          aria-label={t("removeRegistrationOf", { name: reg.name })}
                          sx={{
                            p: "3px",
                            mr: 0.5,
                            color: isOwn ? "rgba(255,255,255,0.6)" : "text.secondary",
                            "&:hover": {
                              color: isOwn ? "common.white" : "error.main",
                              bgcolor: "transparent",
                            },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      )}
                      {isDeleting && (
                        <Box sx={{ px: 0.75, display: "flex", alignItems: "center" }}>
                          <CircularProgress size={12} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
              {coachRegs.some((r) => r.note) && (
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {coachRegs
                    .filter((r) => r.note)
                    .map((reg) => (
                      <Typography
                        key={reg.id}
                        variant="caption"
                        sx={{
                          display: "block",
                          px: 1,
                          mt: 0.25,
                          fontSize: TYPE_SCALE.xs,
                          fontStyle: "italic",
                          color: "text.secondary",
                          wordBreak: "break-word",
                          lineHeight: 1.3,
                        }}
                      >
                        {reg.note}
                      </Typography>
                    ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

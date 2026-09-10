"use client";
import React, { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Link from "next/link";
import { ROLE_COLORS, ROLES } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { readError } from "@/lib/fetchJson";

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
}

// ── Icona stato presenza ──────────────────────────────────────────────────────

function AttendanceIcon({ attended }: { attended: boolean | null | undefined }) {
  if (attended === true) return <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />;
  if (attended === false) return <CancelIcon sx={{ fontSize: 14, color: "error.main" }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: "text.disabled" }} />;
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
        borderRadius: "20px",
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
        <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.68rem", lineHeight: 1 }}>
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
              fontWeight: highlighted ? 700 : 500,
              fontSize: "0.82rem",
              whiteSpace: "nowrap",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {reg.name}
          </Box>
        ) : (
          <Typography
            sx={{ fontWeight: highlighted ? 700 : 500, fontSize: "0.82rem", whiteSpace: "nowrap" }}
          >
            {reg.name}
          </Typography>
        )}
        {hasNote && (
          <ChatBubbleOutlineIcon
            sx={{ fontSize: "0.68rem", color: "text.disabled", flexShrink: 0 }}
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
            color: "text.disabled",
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
            fontSize: "0.65rem",
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
}: Props) {
  const t = useTranslations("trainings");
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
    onError: (err) =>
      showToast({
        message: err instanceof Error ? err.message : "Errore di rete, riprova",
        severity: "error",
      }),
  });

  async function executeDeletion(reg: Registration) {
    setDeletingId(reg.id);
    try {
      await deleteMutation.mutateAsync(reg);
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
    const msg =
      isStaff && reg.userId !== currentUserId && !isOwnChild
        ? `${reg.name} rimosso dall'allenamento`
        : isOwnChild && reg.childId !== linkedChildId
          ? `${reg.name} disiscritto/a`
          : "Disiscrizione effettuata";

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
    }, 3000);

    showToast({
      message: msg,
      severity: "success",
      duration: 3000,
      progressMs: 3000,
      action: (
        <Button
          size="small"
          onClick={cancelPending}
          sx={{ color: "#fff", fontWeight: 700, ml: 0.5, minWidth: 0, p: "2px 8px" }}
        >
          Annulla
        </Button>
      ),
    });
  }

  async function handleToggleAttended(reg: Registration) {
    const currentAttended = reg.id in attendedOverrides ? attendedOverrides[reg.id] : reg.attended;
    const next = nextAttended(currentAttended);

    setTogglingId(reg.id);
    setAttendedOverrides((prev) => ({ ...prev, [reg.id]: next }));

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
        showToast({ message: "Errore nell'aggiornamento della presenza", severity: "error" });
      }
    } catch {
      setAttendedOverrides((prev) => ({ ...prev, [reg.id]: currentAttended ?? null }));
      showToast({ message: "Errore di rete, riprova", severity: "error" });
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
        showToast({
          message: "Errore nell'aggiornamento automatico delle presenze",
          severity: "error",
        });
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
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.grey[50],
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
          {t("roster")}
        </Typography>
        <Chip
          label={t("athletes", { count: athleteRegs.length })}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        {coachRegs.length > 0 && (
          <Chip
            label={t("coachCount", { count: coachRegs.length })}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        )}
        {showAttendance && presentCount !== null && (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important" }} />}
            label={t("presentCount", { count: presentCount })}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600, ml: "auto" }}
          />
        )}
      </Box>

      {/* Body */}
      {registrations.length === 0 ? (
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
                      bgcolor: ROLE_COLORS[role],
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="overline"
                    fontWeight={700}
                    sx={{ color: ROLE_COLORS[role], letterSpacing: "0.08em", lineHeight: 1 }}
                  >
                    {roleLabel(role)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" fontWeight={600}>
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
                        roleColor={ROLE_COLORS[role]}
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
                        removeLabel={t("removeRegistration")}
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
                fontWeight={700}
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
                        borderRadius: "20px",
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
                        <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "0.68rem" }}>
                          {reg.name[0]?.toUpperCase() ?? "?"}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          px: 1,
                          fontSize: "0.82rem",
                          fontWeight: isOwn ? 700 : 500,
                          color: isOwn ? "#fff" : "text.primary",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {reg.name}
                      </Typography>
                      {canDelete && !isDeleting && !isPending && (
                        <IconButton
                          size="small"
                          onClick={() => handleUnregister(reg)}
                          aria-label={t("removeRegistration")}
                          sx={{
                            p: "3px",
                            mr: 0.5,
                            color: isOwn ? "rgba(255,255,255,0.6)" : "text.disabled",
                            "&:hover": {
                              color: isOwn ? "#fff" : "error.main",
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
                          fontSize: "0.65rem",
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

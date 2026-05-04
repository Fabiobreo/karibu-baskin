"use client";
import React, { useState } from "react";
import {
  Box, Typography, Paper, Chip, CircularProgress,
  Divider, IconButton, Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Link from "next/link";
import { ROLE_LABELS, ROLE_COLORS, ROLES } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

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
  if (attended === true)  return <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />;
  if (attended === false) return <CancelIcon      sx={{ fontSize: 14, color: "error.main" }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: "text.disabled" }} />;
}

function nextAttended(current: boolean | null | undefined): boolean | null {
  if (current == null)   return true;
  if (current === true)  return false;
  return null;
}

function attendedLabel(attended: boolean | null | undefined): string {
  if (attended === true)  return "Presente — clicca per segnare assente";
  if (attended === false) return "Assente — clicca per resettare";
  return "Non marcato — clicca per segnare presente";
}

// ── Pill atleta ───────────────────────────────────────────────────────────────

interface PillProps {
  reg: Registration;
  roleColor: string;
  highlighted: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  isStaff: boolean;
  showAttendance: boolean;
  isToggling: boolean;
  onDelete: () => void;
  onToggleAttended: () => void;
}

function AthletePill({
  reg, roleColor, highlighted, canDelete, isDeleting, isStaff,
  showAttendance, isToggling, onDelete, onToggleAttended,
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
        opacity: isDeleting ? 0.5 : 1,
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
          <Typography sx={{ fontWeight: highlighted ? 700 : 500, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
            {reg.name}
          </Typography>
        )}
        {hasNote && (
          <ChatBubbleOutlineIcon sx={{ fontSize: "0.68rem", color: "text.disabled", flexShrink: 0 }} />
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
              sx={{ p: "3px", color: "inherit", "&:hover": { bgcolor: "transparent" } }}
            >
              {isToggling
                ? <CircularProgress size={12} />
                : <AttendanceIcon attended={reg.attended} />}
            </IconButton>
          </span>
        </Tooltip>
      )}

      {/* Pulsante rimozione */}
      {canDelete && !isDeleting && !showAttendance && (
        <IconButton
          size="small"
          onClick={onDelete}
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Optimistic attendance overrides while API call is in flight
  const [attendedOverrides, setAttendedOverrides] = useState<Record<string, boolean | null>>({});
  const { showToast } = useToast();

  const showAttendance = !!(isStaff && isEnded);

  async function handleUnregister(reg: Registration) {
    setDeletingId(reg.id);
    try {
      const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
      if (res.ok) {
        const isOwnChild =
          (!!reg.childId && (parentChildIds.includes(reg.childId) || reg.childId === linkedChildId)) ||
          (!!reg.userId && childUserIds.includes(reg.userId));
        const msg =
          isStaff && reg.userId !== currentUserId && !isOwnChild
            ? `${reg.name} rimosso dall'allenamento`
            : isOwnChild && reg.childId !== linkedChildId
              ? `${reg.name} disiscritto/a`
              : "Disiscrizione effettuata";
        showToast({ message: msg, severity: "success" });
        onUnregistered?.();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore durante la disiscrizione", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setDeletingId(null);
    }
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
          bgcolor: "grey.50",
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
          Iscritti
        </Typography>
        <Chip
          label={`${athleteRegs.length} atlet${athleteRegs.length !== 1 ? "i" : "a"}`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        {coachRegs.length > 0 && (
          <Chip
            label={`${coachRegs.length} allenator${coachRegs.length !== 1 ? "i" : "e"}`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        )}
        {showAttendance && presentCount !== null && (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important" }} />}
            label={`${presentCount} present${presentCount !== 1 ? "i" : "e"}`}
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
          Nessun atleta iscritto ancora.
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
                    {ROLE_LABELS[role]}
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

                    const effectiveReg = reg.id in attendedOverrides
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
                        isStaff={!!isStaff}
                        showAttendance={showAttendance}
                        isToggling={togglingId === reg.id}
                        onDelete={() => handleUnregister(reg)}
                        onToggleAttended={() => handleToggleAttended(reg)}
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
                Allenatori presenti
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {coachRegs.map((reg) => {
                  const isOwn = !!currentUserId && reg.userId === currentUserId;
                  const canDelete = isOwn || !!isStaff;
                  const isDeleting = deletingId === reg.id;
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
                        opacity: isDeleting ? 0.5 : 1,
                      }}
                    >
                      <Box sx={{ width: 28, height: 28, bgcolor: "grey.600", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                      {canDelete && !isDeleting && (
                        <IconButton
                          size="small"
                          onClick={() => handleUnregister(reg)}
                          sx={{ p: "3px", mr: 0.5, color: isOwn ? "rgba(255,255,255,0.6)" : "text.disabled", "&:hover": { color: isOwn ? "#fff" : "error.main", bgcolor: "transparent" } }}
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
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

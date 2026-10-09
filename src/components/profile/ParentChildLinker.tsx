"use client";
import { useState } from "react";
import RoleBadge from "@/components/common/RoleBadge";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { useToast } from "@/context/ToastContext";

import { teamColor, teamFill } from "@/lib/teamColors";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import {
  formatBirthDate,
  type ChildData,
  type PendingLink,
} from "@/components/profile/childLinkerShared";
import ChildAddDialog from "@/components/profile/dialogs/ChildAddDialog";
import ChildEditDialog from "@/components/profile/dialogs/ChildEditDialog";
import ChildLinkDialog from "@/components/profile/dialogs/ChildLinkDialog";

// Re-export per i consumer esistenti (es. pagina profilo)
export type { ChildData } from "@/components/profile/childLinkerShared";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface ParentChildLinkerProps {
  initialChildren: ChildData[];
  /** Richieste inviate a figli con account, ancora senza risposta. */
  initialPendingLinks?: PendingLink[];
  /** Stagione in corso (flag dello staff, o calendario), per le squadre dei figli. */
  currentSeason: string;
}

/** Lista figli del genitore + azioni: aggiungi, modifica, collega/scollega account, elimina. */
export default function ParentChildLinker({
  initialChildren,
  initialPendingLinks = [],
  currentSeason,
}: ParentChildLinkerProps) {
  const [children, setChildren] = useState<ChildData[]>(initialChildren);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>(initialPendingLinks);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChildData | null>(null);
  const [linkTarget, setLinkTarget] = useState<ChildData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { showToast } = useToast();
  const t = useTranslations("childLinker");
  const tCommon = useTranslations("common");
  const dateLocale = useActiveDateLocale();
  const { sportRoleLabel, genderLabel } = useEntityLabels();

  async function handleUnlink(child: ChildData) {
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlinkAccount: true }),
      });
      if (!res.ok) {
        showToast({ message: t("unlinkError"), severity: "error" });
        return;
      }
      setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, userId: null } : c)));
      showToast({ message: t("accountUnlinkedFrom", { name: child.name }), severity: "info" });
    } catch {
      showToast({ message: tCommon("networkError"), severity: "error" });
    }
  }

  async function handleCancelRequest(pending: PendingLink) {
    setCancellingId(pending.requestId);
    try {
      const res = await fetch(`/api/link-requests/${pending.requestId}`, { method: "DELETE" });
      // 404 e 409: la richiesta non è più in attesa, la riga non ha più senso.
      if (!res.ok && res.status !== 404 && res.status !== 409) throw new Error("cancel failed");
      setPendingLinks((prev) => prev.filter((p) => p.requestId !== pending.requestId));
      showToast({ message: t("requestCancelled"), severity: "info" });
    } catch {
      showToast({ message: t("cancelRequestError"), severity: "error" });
    } finally {
      setCancellingId(null);
    }
  }

  async function handleDelete(child: ChildData) {
    setDeletingId(child.id);
    try {
      // Con altri genitori il server toglie solo il nostro collegamento: il
      // figlio resta a loro, con iscrizioni e statistiche.
      const res = await fetch(`/api/children/${child.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      const others = child.otherGuardians ?? [];
      showToast({
        message:
          others.length > 0
            ? t("childRemovedFromMe", { name: child.name, names: others.join(", ") })
            : t("childRemoved", { name: child.name }),
        severity: "info",
      });
    } catch {
      showToast({ message: t("removeError"), severity: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Box>
      {children.length > 0 || pendingLinks.length > 0 ? (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {children.map((child) => (
            <Paper key={child.id} variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <Avatar
                  src={child.user?.image ?? undefined}
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    // Non si tocca: niente arancio (UX-29). Con account: nero del marchio.
                    bgcolor: child.userId ? "secondary.main" : "grey.400",
                    color: child.userId ? "secondary.contrastText" : undefined,
                    fontSize: TYPE_SCALE.lg,
                    mt: 0.25,
                  }}
                >
                  {child.name[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                    {child.name}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    <Chip label={t("athlete")} size="small" sx={{ fontSize: TYPE_SCALE.xs }} />
                    {child.sportRole && (
                      <RoleBadge role={child.sportRole} variant={child.sportRoleVariant} />
                    )}
                    {child.teamMemberships
                      ?.filter((m) => m.team.season === currentSeason)
                      .map((m, i) => (
                        <Chip
                          key={i}
                          label={m.team.name}
                          size="small"
                          // Tinta squadra come riempimento; senza tinta chip
                          // contornato neutro, mai l'arancio (UX-29).
                          variant={teamColor(m.team.color) ? "filled" : "outlined"}
                          sx={{
                            ...(teamFill(m.team.color)
                              ? {
                                  bgcolor: teamFill(m.team.color)?.bg,
                                  color: teamFill(m.team.color)?.fg,
                                }
                              : { color: "text.primary" }),
                            fontSize: TYPE_SCALE.xs,
                          }}
                        />
                      ))}
                    {child.gender && (
                      <Chip
                        label={genderLabel(child.gender)}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: TYPE_SCALE.xs }}
                      />
                    )}
                    {child.userId ? (
                      <Chip
                        label={t("accountLinked")}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: TYPE_SCALE.xs }}
                      />
                    ) : child.pendingRequestId ? (
                      // Attendere non e' un avviso (UX-29): neutro con la clessidra.
                      <Chip
                        icon={<HourglassEmptyIcon />}
                        label={t("pendingConfirm")}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: TYPE_SCALE.xs }}
                      />
                    ) : (
                      <Chip
                        label={t("noAccount")}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: TYPE_SCALE.xs,
                          color: "text.secondary",
                          borderColor: "divider",
                        }}
                      />
                    )}
                  </Box>
                  {child.birthDate && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      {t("bornOn", {
                        date: formatBirthDate(
                          typeof child.birthDate === "string"
                            ? child.birthDate
                            : (child.birthDate as Date).toISOString(),
                          dateLocale
                        ),
                      })}
                    </Typography>
                  )}
                  {child.otherGuardians && child.otherGuardians.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.25 }}
                    >
                      {t("sharedWith", { names: child.otherGuardians.join(", ") })}
                    </Typography>
                  )}
                  {child.userId && child.user?.email && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.25 }}
                    >
                      {child.user.email}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
                  {child.userId ? (
                    <IconButton
                      size="small"
                      onClick={() => handleUnlink(child)}
                      title={t("unlinkAccount")}
                      aria-label={t("unlinkAccount")}
                    >
                      <LinkOffIcon fontSize="small" />
                    </IconButton>
                  ) : child.pendingRequestId ? null : (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setLinkTarget(child)}
                      title={t("linkAccount", { name: child.name })}
                      aria-label={t("linkAccount", { name: child.name })}
                    >
                      <LinkIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => setEditTarget(child)}
                    aria-label={tCommon("edit")}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(child)}
                    disabled={deletingId === child.id}
                    aria-label={
                      child.otherGuardians?.length ? t("removeFromMe") : tCommon("delete")
                    }
                    title={child.otherGuardians?.length ? t("removeFromMe") : undefined}
                  >
                    {deletingId === child.id ? (
                      <CircularProgress size={16} />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
          {/* Figli con account che non hanno ancora risposto: nessuna scheda finché non accettano */}
          {pendingLinks.map((pending) => (
            <Paper key={pending.requestId} variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Avatar
                  src={pending.image ?? undefined}
                  sx={{ width: 44, height: 44, flexShrink: 0, fontSize: TYPE_SCALE.lg }}
                >
                  {(pending.name ?? "?")[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                    {pending.name ?? "?"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                      color: "text.secondary",
                    }}
                  >
                    <HourglassEmptyIcon fontSize="inherit" />
                    <Typography variant="caption">{t("pendingConfirm")}</Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  onClick={() => handleCancelRequest(pending)}
                  disabled={cancellingId === pending.requestId}
                  sx={{ flexShrink: 0 }}
                >
                  {t("cancelRequest")}
                </Button>
              </Box>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("noChildren")}
        </Typography>
      )}

      <Button
        variant="outlined"
        startIcon={<PersonAddIcon />}
        onClick={() => setAddOpen(true)}
        size="small"
      >
        {t("addChild")}
      </Button>

      {/* Dialog montati solo quando aperti → stato interno sempre fresco */}
      {linkTarget && (
        <ChildLinkDialog
          child={linkTarget}
          onClose={() => setLinkTarget(null)}
          onRequestSent={(requestId) =>
            setChildren((prev) =>
              prev.map((c) => (c.id === linkTarget.id ? { ...c, pendingRequestId: requestId } : c))
            )
          }
          onLinked={(userId) =>
            setChildren((prev) => prev.map((c) => (c.id === linkTarget.id ? { ...c, userId } : c)))
          }
        />
      )}

      {editTarget && (
        <ChildEditDialog
          child={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) =>
            setChildren((prev) => prev.map((c) => (c.id === editTarget.id ? updated : c)))
          }
        />
      )}

      {addOpen && (
        <ChildAddDialog
          onClose={() => setAddOpen(false)}
          onChildAdded={(child) => setChildren((prev) => [...prev, child])}
          onRequestSent={(pending) =>
            setPendingLinks((prev) =>
              prev.some((p) => p.requestId === pending.requestId) ? prev : [...prev, pending]
            )
          }
        />
      )}
    </Box>
  );
}

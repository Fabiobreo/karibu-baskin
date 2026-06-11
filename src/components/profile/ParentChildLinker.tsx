"use client";
import { useState } from "react";
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
import { useToast } from "@/context/ToastContext";
import { ROLE_COLORS } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { getCurrentSeason } from "@/lib/seasonUtils";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { formatBirthDate, type ChildData } from "@/components/profile/childLinkerShared";
import ChildAddDialog from "@/components/profile/dialogs/ChildAddDialog";
import ChildEditDialog from "@/components/profile/dialogs/ChildEditDialog";
import ChildLinkDialog from "@/components/profile/dialogs/ChildLinkDialog";

// Re-export per i consumer esistenti (es. pagina profilo)
export type { ChildData } from "@/components/profile/childLinkerShared";

/** Lista figli del genitore + azioni: aggiungi, modifica, collega/scollega account, elimina. */
export default function ParentChildLinker({ initialChildren }: { initialChildren: ChildData[] }) {
  const [children, setChildren] = useState<ChildData[]>(initialChildren);

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

  async function handleDelete(child: ChildData) {
    setDeletingId(child.id);
    try {
      await fetch(`/api/children/${child.id}`, { method: "DELETE" });
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      showToast({ message: t("childRemoved", { name: child.name }), severity: "info" });
    } catch {
      showToast({ message: t("removeError"), severity: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  const currentSeason = getCurrentSeason();

  return (
    <Box>
      {children.length > 0 ? (
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
                    bgcolor: child.userId ? "primary.main" : "grey.400",
                    fontSize: 17,
                    mt: 0.25,
                  }}
                >
                  {child.name[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {child.name}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    <Chip
                      label={t("athlete")}
                      size="small"
                      color="primary"
                      sx={{ fontSize: "0.7rem", fontWeight: 600 }}
                    />
                    {child.sportRole && (
                      <Chip
                        label={sportRoleLabel(child.sportRole, child.sportRoleVariant)}
                        size="small"
                        sx={{
                          bgcolor: ROLE_COLORS[child.sportRole],
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                        }}
                      />
                    )}
                    {child.teamMemberships
                      ?.filter((m) => m.team.season === currentSeason)
                      .map((m, i) => (
                        <Chip
                          key={i}
                          label={m.team.name}
                          size="small"
                          sx={{
                            bgcolor: m.team.color ?? "primary.main",
                            color: contrastText(m.team.color),
                            fontWeight: 700,
                            fontSize: "0.7rem",
                          }}
                        />
                      ))}
                    {child.gender && (
                      <Chip
                        label={genderLabel(child.gender)}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    )}
                    {child.userId ? (
                      <Chip
                        label={t("accountLinked")}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    ) : child.pendingRequestId ? (
                      <Chip
                        label={t("pendingConfirm")}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    ) : (
                      <Chip
                        label={t("noAccount")}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", color: "text.disabled", borderColor: "divider" }}
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
                    aria-label={tCommon("delete")}
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
        />
      )}
    </Box>
  );
}

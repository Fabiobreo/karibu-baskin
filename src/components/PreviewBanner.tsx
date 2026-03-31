"use client";
import { useState } from "react";
import { Box, Select, MenuItem, Button, Typography, Chip, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import type { AppRole } from "@prisma/client";
import { ROLE_LABELS_IT } from "@/lib/authRoles";
import { useRouter } from "next/navigation";

const ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];

const ROLE_COLORS: Record<AppRole, string> = {
  GUEST: "#757575",
  ATHLETE: "#1565C0",
  PARENT: "#2E7D32",
  COACH: "#E65100",
  ADMIN: "#C62828",
};

export default function PreviewBanner({ initialRole }: { initialRole: AppRole | null }) {
  const [previewRole, setPreviewRole] = useState<AppRole | null>(initialRole);
  const [selecting, setSelecting] = useState<AppRole>(initialRole ?? "GUEST");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function activate(role: AppRole) {
    setLoading(true);
    await fetch("/api/admin/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setPreviewRole(role);
    setLoading(false);
    router.refresh();
  }

  async function deactivate() {
    setLoading(true);
    await fetch("/api/admin/preview", { method: "DELETE" });
    setPreviewRole(null);
    setLoading(false);
    router.refresh();
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        bgcolor: "#1A1A1A",
        borderTop: previewRole
          ? `2px solid ${ROLE_COLORS[previewRole]}`
          : "1px solid rgba(255,255,255,0.1)",
        px: 2,
        py: 0.5,
        display: "flex",
        alignItems: "center",
        gap: 1,
        minHeight: 44,
      }}
    >
      {/* Icona — sempre visibile */}
      <Tooltip title="Modalità preview admin">
        <VisibilityIcon sx={{ color: previewRole ? ROLE_COLORS[previewRole] : "rgba(255,255,255,0.4)", fontSize: 18, flexShrink: 0 }} />
      </Tooltip>

      {/* Label — nascosta su mobile se preview attiva */}
      <Typography
        variant="caption"
        sx={{
          color: "rgba(255,255,255,0.45)",
          fontWeight: 600,
          whiteSpace: "nowrap",
          display: { xs: previewRole ? "none" : "block", sm: "block" },
        }}
      >
        Preview:
      </Typography>

      {/* Select ruolo */}
      <Select
        size="small"
        value={selecting}
        onChange={(e) => setSelecting(e.target.value as AppRole)}
        sx={{
          fontSize: "0.75rem",
          color: "#fff",
          height: 30,
          minWidth: { xs: 100, sm: 130 },
          ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.15)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
          ".MuiSvgIcon-root": { color: "rgba(255,255,255,0.4)", fontSize: 18 },
          ".MuiSelect-select": { py: "4px !important" },
        }}
      >
        {ROLES.map((r) => (
          <MenuItem key={r} value={r} sx={{ fontSize: "0.8rem" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: ROLE_COLORS[r], flexShrink: 0 }} />
              {ROLE_LABELS_IT[r]}
            </Box>
          </MenuItem>
        ))}
      </Select>

      {/* Bottone attiva */}
      <Button
        size="small"
        variant="contained"
        disabled={loading}
        onClick={() => activate(selecting)}
        sx={{
          bgcolor: ROLE_COLORS[selecting],
          "&:hover": { bgcolor: ROLE_COLORS[selecting], filter: "brightness(1.2)" },
          fontSize: "0.7rem",
          fontWeight: 700,
          height: 28,
          px: { xs: 1, sm: 1.5 },
          minWidth: 0,
          whiteSpace: "nowrap",
        }}
      >
        {/* Testo completo su desktop, icona su mobile */}
        <Box sx={{ display: { xs: "none", sm: "block" } }}>Attiva</Box>
        <Box sx={{ display: { xs: "block", sm: "none" } }}>▶</Box>
      </Button>

      {/* Stato preview attiva */}
      {previewRole && (
        <>
          <Chip
            label={ROLE_LABELS_IT[previewRole]}
            size="small"
            sx={{
              bgcolor: ROLE_COLORS[previewRole],
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.7rem",
              height: 22,
              ml: 0.5,
            }}
          />
          <Button
            size="small"
            onClick={deactivate}
            disabled={loading}
            sx={{
              color: "rgba(255,255,255,0.5)",
              minWidth: 0,
              px: 0.5,
              height: 28,
              "&:hover": { color: "#fff" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </Button>
        </>
      )}
    </Box>
  );
}

"use client";
import { useState } from "react";
import {
  Box, Chip, Select, MenuItem, Button, Typography, Collapse,
} from "@mui/material";
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
        bgcolor: previewRole ? "#1A1A1A" : "rgba(26,26,26,0.92)",
        backdropFilter: "blur(8px)",
        borderTop: previewRole
          ? `2px solid ${ROLE_COLORS[previewRole]}`
          : "1px solid rgba(255,255,255,0.1)",
        px: { xs: 2, md: 4 },
        py: 0.75,
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <VisibilityIcon sx={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, whiteSpace: "nowrap" }}>
          Visualizza come:
        </Typography>
      </Box>

      <Select
        size="small"
        value={selecting}
        onChange={(e) => setSelecting(e.target.value as AppRole)}
        sx={{
          fontSize: "0.8rem",
          color: "#fff",
          minWidth: 140,
          ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.5)" },
          ".MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
        }}
      >
        {ROLES.map((r) => (
          <MenuItem key={r} value={r}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: ROLE_COLORS[r] }} />
              {ROLE_LABELS_IT[r]}
            </Box>
          </MenuItem>
        ))}
      </Select>

      <Button
        size="small"
        variant="contained"
        disabled={loading}
        onClick={() => activate(selecting)}
        sx={{
          bgcolor: ROLE_COLORS[selecting],
          "&:hover": { bgcolor: ROLE_COLORS[selecting], filter: "brightness(1.2)" },
          fontSize: "0.75rem",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        Attiva preview
      </Button>

      <Collapse in={!!previewRole} orientation="horizontal">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={`Preview attiva: ${previewRole ? ROLE_LABELS_IT[previewRole] : ""}`}
            size="small"
            sx={{
              bgcolor: previewRole ? ROLE_COLORS[previewRole] : "transparent",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.72rem",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.7 },
              },
            }}
          />
          <Button
            size="small"
            onClick={deactivate}
            disabled={loading}
            startIcon={<CloseIcon sx={{ fontSize: "14px !important" }} />}
            sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", minWidth: 0 }}
          >
            Esci
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}

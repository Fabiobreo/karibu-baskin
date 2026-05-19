import { Box, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { Button } from "@mui/material";
import AuditLogClient from "@/components/AuditLogClient";

export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Link href="/admin">
          <Button startIcon={<ArrowBackIcon />} size="small" variant="text" color="inherit">
            Admin
          </Button>
        </Link>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <HistoryIcon sx={{ color: "#37474F" }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Registro Attività
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tutte le azioni effettuate da coach e admin sul pannello.
          </Typography>
        </Box>
      </Box>

      <AuditLogClient />
    </Box>
  );
}

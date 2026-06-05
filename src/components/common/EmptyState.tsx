import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      {icon && <Box sx={{ mb: 2 }}>{icon}</Box>}
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      {message && (
        <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
          {message}
        </Typography>
      )}
      {action && <Box sx={{ mt: 3 }}>{action}</Box>}
    </Box>
  );
}

import { Box, Typography, Breadcrumbs, Link as MuiLink } from "@mui/material";
import type { ReactNode } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export default function AdminPageHeader({
  title,
  subtitle,
  icon,
  action,
  breadcrumb,
}: AdminPageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          {breadcrumb.slice(0, -1).map((item) =>
            item.href ? (
              <MuiLink
                key={item.label}
                href={item.href}
                underline="hover"
                color="text.secondary"
                variant="body2"
              >
                {item.label}
              </MuiLink>
            ) : (
              <Typography key={item.label} variant="body2" color="text.secondary">
                {item.label}
              </Typography>
            )
          )}
          <Typography variant="body2" color="text.primary">
            {breadcrumb[breadcrumb.length - 1].label}
          </Typography>
        </Breadcrumbs>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: icon && !subtitle ? "center" : "flex-start",
          justifyContent: action ? "space-between" : "flex-start",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: icon ? "center" : "flex-start",
            gap: icon ? 1.5 : 0,
          }}
        >
          {icon}
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action}
      </Box>
    </Box>
  );
}

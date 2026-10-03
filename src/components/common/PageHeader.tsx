import { Box, Typography, Breadcrumbs, Link as MuiLink } from "@mui/material";
import type { ReactNode, Ref } from "react";
import { TYPE_SCALE } from "@/lib/typeScale";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";

/**
 * Intestazione senza fascia (UX-32): breadcrumb, titolo h1 nel contenitore e
 * un'azione facoltativa. La usano l'area utente (`/profilo`, `/profilo/*`,
 * `/notifiche`) e l'admin.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /**
   * Azione principale della pagina (UX-51): sulla riga del titolo, al bordo
   * destro. Su telefono va sempre sulla riga sotto il titolo, sempre a destra,
   * cosi' sta alla stessa altezza in tutte le pagine admin.
   */
  action?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  /**
   * Solo dai Client Component: rende l'h1 un punto fisso per il focus (dopo
   * un'eliminazione la riga, e il suo "⋯", non ci sono più).
   */
  titleRef?: Ref<HTMLHeadingElement>;
}

export default function PageHeader({
  title,
  subtitle,
  action,
  breadcrumb,
  titleRef,
}: PageHeaderProps) {
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
      {/* Niente icona davanti al titolo: il titolo parte sempre al filo del
          breadcrumb (UX-51). */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          columnGap: 2,
          rowGap: 1.5,
        }}
      >
        {/* Su mobile un gradino sotto: i titoli lunghi (una partita con
            l'avversaria per esteso) andavano su quattro righe. */}
        <Typography
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: TYPE_SCALE.xl3, sm: TYPE_SCALE.xl4 },
            overflowWrap: "anywhere",
            minWidth: 0,
            ...(titleRef && { outline: "none" }),
          }}
        >
          {title}
        </Typography>
        {action && (
          <Box
            sx={{
              ml: "auto",
              flexBasis: { xs: "100%", sm: "auto" },
              display: "flex",
              justifyContent: "flex-end",
              // Una taglia sola: 40 px dal tema, 44 su telefono. Non con
              // TOUCH_TARGET_ON_PHONE, che da `sm` azzera il minimo e il bottone
              // scenderebbe a 37 px. Media query per esteso: lo `sx` arriva anche
              // da Server Component.
              "& .MuiButton-root": {
                "@media (max-width:599.95px)": { minHeight: TOUCH_TARGET_SIZE },
              },
            }}
          >
            {action}
          </Box>
        )}
      </Box>
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: { xs: action ? 1.5 : 0.5, sm: 0.5 } }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

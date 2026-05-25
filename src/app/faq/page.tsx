import {
  Container,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { FAQS } from "@/lib/faqs";

export const metadata = { title: "FAQ — Karibu Baskin" };

export default function FaqPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 6, md: 9 },
          px: 2,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06),
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip
            label="Hai una domanda?"
            color="primary"
            size="small"
            sx={{ mb: 2, fontWeight: 700 }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}
          >
            Domande frequenti
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.65)",
              fontWeight: 400,
              maxWidth: 520,
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.1rem" },
            }}
          >
            Le risposte alle domande più comuni su Karibu Baskin, allenamenti e iscrizioni.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Non trovi la risposta che cerchi?{" "}
          <Link href="/contatti" style={{ color: "inherit" }}>
            <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
              Scrivici
            </Box>
          </Link>
          .
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {FAQS.map((section) => (
            <Box key={section.category}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontWeight: 700, mb: 1, display: "block" }}
              >
                {section.category}
              </Typography>
              <Box>
                {section.items.map((item, i) => (
                  <Accordion
                    key={i}
                    disableGutters
                    elevation={0}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      "&:not(:last-child)": { borderBottom: 0 },
                      "&::before": { display: "none" },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight={500}>{item.q}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {item.a}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </>
  );
}

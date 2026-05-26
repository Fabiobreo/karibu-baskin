import {
  Container,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageHero from "@/components/PageHero";
import { FAQS } from "@/lib/faqs";

export const metadata = { title: "FAQ — Karibu Baskin" };

export default function FaqPage() {
  return (
    <>
      <SiteHeader />

      <PageHero
        chip="Hai una domanda?"
        title="Domande frequenti"
        subtitle="Le risposte alle domande più comuni su Karibu Baskin, allenamenti e iscrizioni."
        subtitleMaxWidth={520}
      />

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

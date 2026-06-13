"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslations } from "next-intl";
import type { FaqCategory } from "@/lib/content/faqs";

interface FaqAccordionProps {
  faqs: FaqCategory[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const t = useTranslations("pages");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [faqs, query]);

  const hasResults = filtered.length > 0;

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("faq.searchPlaceholder")}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 4 }}
      />

      {hasResults ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((section) => (
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
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          {t("faq.noResults")}
        </Typography>
      )}
    </Box>
  );
}

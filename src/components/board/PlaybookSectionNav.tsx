import { Box, ButtonBase } from "@mui/material";
import { useTranslations } from "next-intl";
import { heroText } from "@/lib/heroStyles";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { categoryPath, type DrillCategory } from "@/lib/board/category";

const SECTIONS: { key: DrillCategory; label: "tabExercises" | "tabPlays" }[] = [
  { key: "exercises", label: "tabExercises" },
  { key: "plays", label: "tabPlays" },
];

/**
 * Le due pagine del Playbook (UX-72) nello slot `nav` di `PageHero`, come la
 * sezione Partite (UX-36): link a pagine, la voce corrente con
 * `aria-current="page"` e il filo arancio. Le vedono tutti: chi non e'
 * tesserato, negli schemi, trova l'avviso con "Accedi".
 */
export default function PlaybookSectionNav({ current }: { current: DrillCategory }) {
  const t = useTranslations("board");
  return (
    <Box
      component="nav"
      aria-label={t("navLabel")}
      sx={{ display: "flex", mx: { xs: -0.75, sm: -2 } }}
    >
      {SECTIONS.map((section) => {
        const active = section.key === current;
        return (
          <ButtonBase
            key={section.key}
            href={categoryPath(section.key)}
            aria-current={active ? "page" : undefined}
            sx={{
              flex: "0 0 auto",
              alignItems: "stretch",
              minHeight: 44,
              px: { xs: 0.75, sm: 2 },
              typography: "body2",
              fontWeight: FONT_WEIGHT.semibold,
              whiteSpace: "nowrap",
              color: active ? heroText.primary : heroText.muted,
              "&:hover": { color: heroText.primary, bgcolor: heroText.surface },
              "&:focus-visible": { outlineOffset: -3, boxShadow: "none" },
            }}
          >
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: "3px solid",
                borderBottomColor: active ? "primary.main" : "transparent",
              }}
            >
              {t(section.label)}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

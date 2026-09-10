"use client";

import { Box, Typography, Stack } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { useTranslations } from "next-intl";
import { MAX_ROLE_SUM, type LineupChecks } from "@/lib/rating/lineupRules";

/**
 * Checklist live dei vincoli formazione Baskin per un lato della sfida.
 * Verde = soddisfatto, grigio = ancora da soddisfare.
 */
export default function SimulatorChecklist({ checks }: { checks: LineupChecks }) {
  const t = useTranslations("simulator");

  const rows: { ok: boolean; label: string }[] = [
    { ok: checks.full, label: t("ruleSix", { count: checks.count }) },
    { ok: checks.oneGuard, label: t("ruleGuard") },
    { ok: checks.hasThree, label: t("ruleThree") },
    { ok: checks.twoFives, label: t("ruleFive") },
    { ok: checks.roleSumOk, label: t("ruleSum", { sum: checks.roleSum, max: MAX_ROLE_SUM }) },
    { ok: checks.genderMix, label: t("ruleGenderMix") },
  ];

  return (
    <Stack spacing={0.4} sx={{ mt: 1.25 }}>
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {r.ok ? (
            <CheckCircleIcon sx={{ fontSize: 15, color: "success.main" }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
          )}
          <Typography
            variant="caption"
            sx={{ color: r.ok ? "text.primary" : "text.secondary", lineHeight: 1.3 }}
          >
            {r.label}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

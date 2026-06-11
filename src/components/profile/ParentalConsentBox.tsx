"use client";
import { Checkbox, FormControlLabel, Paper, Typography } from "@mui/material";
import { useTranslations } from "next-intl";

/** Checkbox di consenso genitoriale richiesta per creare/collegare un figlio. */
export default function ParentalConsentBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTranslations("childLinker");
  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            size="small"
            sx={{ alignSelf: "flex-start", mt: -0.5 }}
          />
        }
        sx={{ alignItems: "flex-start", m: 0 }}
        label={
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {t("consent")}
          </Typography>
        }
      />
    </Paper>
  );
}

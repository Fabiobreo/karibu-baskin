"use client";
import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslations } from "next-intl";
import type { ChildInfo } from "@/hooks/useRegistrationForm";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface Props {
  /** Nome di chi guarda: sta sotto "Io", null se l'account non ha un nome. */
  selfName: string | null;
  selfRegistered: boolean;
  parentChildren: ChildInfo[];
  subject: string;
  effectiveRegisteredChildIds: (string | null)[];
  onSelect: (subject: string) => void;
}

interface Option {
  value: string;
  primary: string;
  secondary: string | null;
  registered: boolean;
}

/**
 * "Per chi ti iscrivi?" (UX-42): una scelta singola con radio veri (frecce e
 * lettura dello stato gratis), una voce per persona. La propria voce dice "Io",
 * così non si confonde con un figlio omonimo; chi è già iscritto resta in
 * elenco, ma non si sceglie.
 */
export default function RegistrationSubjectSelector({
  selfName,
  selfRegistered,
  parentChildren,
  subject,
  effectiveRegisteredChildIds,
  onSelect,
}: Props) {
  const t = useTranslations("trainings");

  const options: Option[] = [
    { value: "self", primary: t("subjectSelf"), secondary: selfName, registered: selfRegistered },
    ...parentChildren.map((child) => ({
      value: child.id,
      primary: child.name,
      secondary: null,
      registered: effectiveRegisteredChildIds.includes(child.id),
    })),
  ];

  return (
    <>
      <FormControl component="fieldset" sx={{ display: "block", mb: 2 }}>
        <FormLabel
          component="legend"
          sx={{
            typography: "caption",
            fontWeight: FONT_WEIGHT.semibold,
            color: "text.secondary",
            mb: 1,
            "&.Mui-focused": { color: "text.secondary" },
          }}
        >
          {t("subjectLegend")}
        </FormLabel>
        <RadioGroup
          value={subject}
          onChange={(e) => onSelect(e.target.value)}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(200px, 1fr))" },
            gap: 1,
          }}
        >
          {options.map((o) => {
            const selected = subject === o.value && !o.registered;
            return (
              <FormControlLabel
                key={o.value}
                value={o.value}
                disabled={o.registered}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={FONT_WEIGHT.semibold}
                      sx={{ color: "text.primary", overflowWrap: "anywhere" }}
                    >
                      {o.primary}
                    </Typography>
                    {o.secondary && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", overflowWrap: "anywhere" }}
                      >
                        {o.secondary}
                      </Typography>
                    )}
                    {o.registered && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                        {t("subjectRegistered")}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{
                  m: 0,
                  pr: 1.5,
                  py: 0.5,
                  minHeight: 48,
                  alignItems: "center",
                  border: "1px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  borderRadius: RADIUS.md,
                  bgcolor: selected ? "action.selected" : "transparent",
                  // Il testo resta leggibile anche per chi è già iscritto: è
                  // un'informazione, non una voce spenta.
                  "& .MuiFormControlLabel-label.Mui-disabled": { color: "text.primary" },
                }}
              />
            );
          })}
        </RadioGroup>
      </FormControl>
      <Divider sx={{ mb: 2 }} />
    </>
  );
}

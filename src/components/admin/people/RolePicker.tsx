"use client";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { ROLE_COLORS } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";

interface RolePickerProps {
  value: number | null;
  onChange: (role: number | null) => void;
  /** Mostra "Non so" come prima scelta, per i campi facoltativi. */
  allowNone?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * Ruolo Baskin 1-5 come cinque pulsanti larghi quanto la riga: sul telefono
 * si sceglie col pollice, senza aprire un menu a tendina.
 */
export default function RolePicker({
  value,
  onChange,
  allowNone = false,
  disabled,
  "aria-label": ariaLabel = "Ruolo Baskin",
}: RolePickerProps) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={value ?? (allowNone ? 0 : null)}
      onChange={(_, v: number | null) => {
        // Un secondo tocco sul ruolo scelto lo deseleziona: con `allowNone`
        // torna a "Non so", altrimenti resta com'era.
        if (v === null) return allowNone ? onChange(null) : undefined;
        onChange(v === 0 ? null : v);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{ "& .MuiToggleButton-root": { minHeight: 44, fontWeight: 800 } }}
    >
      {allowNone && (
        <ToggleButton value={0} sx={{ fontWeight: 600, fontSize: "0.75rem", flex: 1.4 }}>
          Non so
        </ToggleButton>
      )}
      {[1, 2, 3, 4, 5].map((r) => (
        <ToggleButton
          key={r}
          value={r}
          aria-label={`Ruolo ${r}`}
          sx={{
            "&.Mui-selected, &.Mui-selected:hover": {
              bgcolor: ROLE_COLORS[r],
              color: contrastText(ROLE_COLORS[r]),
            },
          }}
        >
          {r}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

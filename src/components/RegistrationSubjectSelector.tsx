"use client";
import { Box, Chip, Divider, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import type { ChildInfo } from "@/hooks/useRegistrationForm";

interface Props {
  parentChildren: ChildInfo[];
  subject: string;
  effectiveRegisteredChildIds: (string | null)[];
  onSelectChild: (childId: string) => void;
}

export default function RegistrationSubjectSelector({
  parentChildren,
  subject,
  effectiveRegisteredChildIds,
  onSelectChild,
}: Props) {
  return (
    <>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
        Per chi ti iscrivi?
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
        {parentChildren.map((child) => {
          const alreadyIn = effectiveRegisteredChildIds.includes(child.id);
          const isSelected = subject === child.id;
          return (
            <Chip
              key={child.id}
              label={alreadyIn ? `${child.name} · già iscritto/a` : child.name}
              icon={
                alreadyIn
                  ? <CheckCircleIcon sx={{ fontSize: "1rem !important" }} />
                  : <ChildCareIcon sx={{ fontSize: "1rem !important" }} />
              }
              onClick={alreadyIn ? undefined : () => onSelectChild(child.id)}
              variant="outlined"
              sx={alreadyIn ? {
                color: "success.main",
                borderColor: "success.main",
                "& .MuiChip-icon": { color: "success.main" },
                cursor: "default",
                fontWeight: 500,
              } : {
                fontWeight: isSelected ? 700 : 400,
                borderColor: isSelected ? "primary.main" : undefined,
                bgcolor: isSelected ? "primary.main" : undefined,
                color: isSelected ? "#fff" : undefined,
                "& .MuiChip-icon": { color: isSelected ? "#fff" : undefined },
              }}
            />
          );
        })}
      </Box>
      <Divider sx={{ mb: 2 }} />
    </>
  );
}

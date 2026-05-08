"use client";
import { Box, Chip, Divider, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PersonIcon from "@mui/icons-material/Person";
import type { ChildInfo } from "@/hooks/useRegistrationForm";

interface Props {
  selfName: string;
  selfRegistered: boolean;
  parentChildren: ChildInfo[];
  subject: string;
  effectiveRegisteredChildIds: (string | null)[];
  onSelect: (subject: string) => void;
}

export default function RegistrationSubjectSelector({
  selfName,
  selfRegistered,
  parentChildren,
  subject,
  effectiveRegisteredChildIds,
  onSelect,
}: Props) {
  return (
    <>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
        Per chi ti iscrivi?
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
        {/* Chip "Io stesso" */}
        <Chip
          label={selfRegistered ? `${selfName} · già iscritto/a` : selfName}
          icon={
            selfRegistered
              ? <CheckCircleIcon sx={{ fontSize: "1rem !important" }} />
              : <PersonIcon sx={{ fontSize: "1rem !important" }} />
          }
          onClick={selfRegistered ? undefined : () => onSelect("self")}
          variant="outlined"
          sx={selfRegistered ? {
            color: "success.main",
            borderColor: "success.main",
            "& .MuiChip-icon": { color: "success.main" },
            cursor: "default",
            fontWeight: 500,
          } : {
            fontWeight: subject === "self" ? 700 : 400,
            borderColor: subject === "self" ? "primary.main" : undefined,
            bgcolor: subject === "self" ? "primary.main" : undefined,
            color: subject === "self" ? "#fff" : undefined,
            "& .MuiChip-icon": { color: subject === "self" ? "#fff" : undefined },
          }}
        />
        {/* Chip figli */}
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
              onClick={alreadyIn ? undefined : () => onSelect(child.id)}
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

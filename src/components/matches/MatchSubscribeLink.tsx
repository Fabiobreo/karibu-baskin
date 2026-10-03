"use client";

import { useState } from "react";
import { Link as MuiLink } from "@mui/material";
import SubscribeCalendarDialog from "@/components/calendar/SubscribeCalendarDialog";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

interface MatchSubscribeLinkProps {
  label: string;
}

/**
 * Link testuale secondario sotto "Aggiungi al calendario" (UX-50): apre la
 * stessa finestra di abbonamento al calendario del club che c'e' in /calendario.
 */
export default function MatchSubscribeLink({ label }: MatchSubscribeLinkProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MuiLink
        component="button"
        type="button"
        variant="body2"
        onClick={() => setOpen(true)}
        sx={{ ...TOUCH_TARGET_ON_PHONE, textAlign: "left" }}
      >
        {label}
      </MuiLink>
      <SubscribeCalendarDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

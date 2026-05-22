"use client";
import { useState } from "react";
import { Button } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SubscribeCalendarDialog from "./SubscribeCalendarDialog";

export default function SubscribeCalendarButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="small"
        variant="outlined"
        startIcon={<CalendarMonthIcon />}
        sx={{ fontWeight: 600 }}
      >
        Aggiungi al calendario
      </Button>
      <SubscribeCalendarDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

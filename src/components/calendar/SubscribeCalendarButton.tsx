"use client";
import { useState } from "react";
import { Button } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SubscribeCalendarDialog from "./SubscribeCalendarDialog";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";

export default function SubscribeCalendarButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outlined"
        startIcon={<CalendarMonthIcon />}
        sx={{ ...TOUCH_TARGET_MIN, fontWeight: 600 }}
      >
        Aggiungi al calendario
      </Button>
      <SubscribeCalendarDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SubscribeCalendarDialog from "./SubscribeCalendarDialog";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";

export default function SubscribeCalendarButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("calendarSub");
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outlined"
        startIcon={<CalendarMonthIcon />}
        sx={{ ...TOUCH_TARGET_MIN, fontWeight: 600 }}
      >
        {t("button")}
      </Button>
      <SubscribeCalendarDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

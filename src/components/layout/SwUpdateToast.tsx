"use client";

import { useEffect, useState } from "react";
import { Snackbar, Button } from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { useTranslations } from "next-intl";

export default function SwUpdateToast() {
  const t = useTranslations("sw");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => setShow(true);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  function handleReload() {
    setShow(false);
    window.location.reload();
  }

  return (
    <Snackbar
      open={show}
      message={t("updateAvailable")}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <Button
          size="small"
          color="primary"
          startIcon={<SystemUpdateAltIcon fontSize="small" />}
          onClick={handleReload}
          sx={{ fontWeight: 700 }}
        >
          {t("update")}
        </Button>
      }
    />
  );
}

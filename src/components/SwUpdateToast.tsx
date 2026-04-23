"use client";

import { useEffect, useState } from "react";
import { Snackbar, Button } from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

export default function SwUpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => setShow(true);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  function handleReload() {
    setShow(false);
    window.location.reload();
  }

  return (
    <Snackbar
      open={show}
      message="Nuova versione disponibile"
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <Button
          size="small"
          color="primary"
          startIcon={<SystemUpdateAltIcon fontSize="small" />}
          onClick={handleReload}
          sx={{ fontWeight: 700 }}
        >
          Aggiorna
        </Button>
      }
    />
  );
}

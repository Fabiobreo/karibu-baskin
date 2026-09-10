"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Snackbar, Button } from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { useTranslations } from "next-intl";

/**
 * Aggiornamento del service worker, deciso dall'utente.
 *
 * Il worker non chiama più `skipWaiting()` da solo: una nuova versione resta in
 * attesa finché non si preme "Aggiorna". Prendere il controllo a metà sessione
 * significherebbe servire i chunk di una build a una pagina renderizzata da
 * un'altra, che è il modo classico per far comparire un ChunkLoadError.
 *
 * Prima l'avviso era agganciato a `controllerchange`, che scatta anche alla
 * prima installazione: un visitatore al primo accesso si vedeva proporre
 * l'aggiornamento di un'applicazione che stava aprendo in quel momento. Ora la
 * condizione è esplicita — esiste un worker in attesa *e* uno che già
 * controlla la pagina — quindi c'è davvero qualcosa da aggiornare.
 */
export default function SwUpdateToast() {
  const t = useTranslations("sw");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    /** Segnala solo un aggiornamento vero, non la prima installazione. */
    function offerUpdate(worker: ServiceWorker | null) {
      if (cancelled || !worker || !navigator.serviceWorker.controller) return;
      setWaiting(worker);
    }

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration || cancelled) return;

      offerUpdate(registration.waiting);

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") offerUpdate(installing);
        });
      });
    });

    // Il worker nuovo ha preso il controllo: ricarichiamo solo se il cambio
    // l'abbiamo chiesto noi, per non ricaricare la pagina sotto i piedi
    // dell'utente in altri scenari.
    const onControllerChange = () => {
      if (reloadingRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const handleUpdate = useCallback(() => {
    reloadingRef.current = true;
    setWaiting(null);
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      // Se per qualche motivo `controllerchange` non arriva, ricarichiamo
      // comunque: restare su una versione vecchia dopo aver premuto "Aggiorna"
      // è peggio di un reload in più.
      setTimeout(() => {
        if (reloadingRef.current) window.location.reload();
      }, 2000);
    } else {
      window.location.reload();
    }
  }, [waiting]);

  return (
    <Snackbar
      open={!!waiting}
      message={t("updateAvailable")}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <Button
          size="small"
          color="primary"
          startIcon={<SystemUpdateAltIcon fontSize="small" />}
          onClick={handleUpdate}
          sx={{ fontWeight: 700 }}
        >
          {t("update")}
        </Button>
      }
    />
  );
}

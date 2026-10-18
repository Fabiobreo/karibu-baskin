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
 *
 * Un worker già in attesa all'apertura della pagina si attiva da solo, senza
 * avviso: ricaricare non basta al browser per attivarlo (lo fa solo quando
 * tutte le schede sono chiuse, e l'app installata su Android non si chiude
 * quasi mai), quindi l'avviso tornava a ogni apertura anche dopo aver
 * ricaricato. La pagina appena aperta è già quella nuova: attivare il worker
 * ora non mescola build. L'avviso resta per l'aggiornamento trovato mentre la
 * pagina è aperta, quando è la pagina a essere vecchia.
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

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!registration || cancelled) return;

        // Attesa ereditata da una visita precedente: si attiva senza ricaricare.
        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") offerUpdate(installing);
          });
        });
      })
      // Il browser può negare il service worker (Firefox con i cookie
      // bloccati, navigazione privata): "Failed to get a
      // ServiceWorkerRegistration". Senza worker non c'è niente da aggiornare;
      // senza catch era un rifiuto non gestito su ogni pagina (Sentry).
      .catch(() => {});

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

  const handleUpdate = useCallback(async () => {
    reloadingRef.current = true;
    setWaiting(null);
    // Il worker in attesa si rilegge adesso: quello dell'avviso può essere stato
    // sostituito da uno più nuovo (un altro deploy) e non risponderebbe più.
    const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
    const current = registration?.waiting ?? waiting;
    if (current) {
      current.postMessage({ type: "SKIP_WAITING" });
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
        >
          {t("update")}
        </Button>
      }
    />
  );
}

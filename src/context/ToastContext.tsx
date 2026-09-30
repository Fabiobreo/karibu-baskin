"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Snackbar, Alert, AlertColor, Box, LinearProgress } from "@mui/material";
import { RADIUS } from "@/lib/radius";

interface ToastOptions {
  message: string;
  severity?: AlertColor;
  /** Durata in ms. Mai sotto `MIN_TOAST_MS`; ignorata per gli errori. */
  duration?: number;
  /** Optional action button rendered inside the toast (e.g. "Annulla"). */
  action?: ReactNode;
  /** If set, renders a countdown progress bar that empties in this many ms. */
  progressMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

// Linee guida W3C COGA (UX-05): niente limiti di tempo sulle informazioni
// importanti. Gli errori restano finche' l'utente non li chiude; gli altri
// avvisi almeno 6 s, abbastanza per chi legge lentamente.
const MIN_TOAST_MS = 6000;

/** `null` = l'avviso non si chiude da solo. */
export function toastAutoHideMs(options: Pick<ToastOptions, "severity" | "duration">) {
  if (options.severity === "error") return null;
  return Math.max(options.duration ?? MIN_TOAST_MS, MIN_TOAST_MS);
}

export const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({ message: "", severity: "success" });
  const [progress, setProgress] = useState(100);
  const [progressKey, setProgressKey] = useState(0);

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
    setOpen(true);
    if (options.progressMs) {
      setProgress(100);
      setProgressKey((k) => k + 1);
    }
  }, []);

  // Anima la progress bar: 100 → 0 in progressMs.
  useEffect(() => {
    if (!toast.progressMs || !open) return;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.progressMs!) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [progressKey, toast.progressMs, open]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toastAutoHideMs(toast)}
        onClose={(_, reason) => {
          // Un tocco altrove non deve far sparire un errore non ancora letto.
          if (reason === "clickaway" && toast.severity === "error") return;
          setOpen(false);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity ?? "success"}
          onClose={() => setOpen(false)}
          action={toast.action}
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: RADIUS.md,
            position: "relative",
            overflow: "hidden",
            pb: toast.progressMs ? 1.25 : undefined,
          }}
        >
          {toast.message}
          {toast.progressMs && (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                px: 0,
              }}
            >
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 3,
                  bgcolor: "rgba(255,255,255,0.2)",
                  "& .MuiLinearProgress-bar": { bgcolor: "rgba(255,255,255,0.85)" },
                }}
              />
            </Box>
          )}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

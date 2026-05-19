"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";

interface ToastOptions {
  message: string;
  severity?: AlertColor;
  duration?: number;
  /** Optional action button rendered inside the toast (e.g. "Annulla"). */
  action?: ReactNode;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({ message: "", severity: "success" });

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
    setOpen(true);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast.duration ?? 3500}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity ?? "success"}
          onClose={() => setOpen(false)}
          action={toast.action}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

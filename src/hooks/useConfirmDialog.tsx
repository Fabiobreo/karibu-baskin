"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: "primary" | "error";
  onConfirm: () => void;
};

const EMPTY: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Conferma",
  confirmColor: "error",
  onConfirm: () => {},
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(EMPTY);

  const openConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      opts?: { confirmLabel?: string; confirmColor?: "primary" | "error" }
    ) => {
      setState({
        open: true,
        title,
        message,
        confirmLabel: opts?.confirmLabel ?? "Elimina",
        confirmColor: opts?.confirmColor ?? "error",
        onConfirm,
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const ConfirmDialog = (
    <Dialog
      open={state.open}
      onClose={closeConfirm}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{state.title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">{state.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeConfirm}>Annulla</Button>
        <Button
          color={state.confirmColor}
          variant="contained"
          onClick={() => {
            closeConfirm();
            state.onConfirm();
          }}
        >
          {state.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { openConfirm, ConfirmDialog };
}

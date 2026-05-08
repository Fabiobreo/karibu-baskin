"use client";
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface State { hasError: boolean; }

export default class SectionErrorBoundary extends React.Component<
  React.PropsWithChildren<{ label?: string }>,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[SectionErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          p: 3, textAlign: "center",
          border: "1px dashed", borderColor: "error.light", borderRadius: 2,
        }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {this.props.label ?? "Questa sezione"} non è disponibile al momento.
          </Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={() => this.setState({ hasError: false })}>
            Riprova
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

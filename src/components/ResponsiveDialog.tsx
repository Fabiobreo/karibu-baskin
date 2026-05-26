"use client";
import { Dialog, DialogProps, useMediaQuery, useTheme } from "@mui/material";

export default function ResponsiveDialog(props: DialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  return <Dialog fullScreen={fullScreen} {...props} />;
}

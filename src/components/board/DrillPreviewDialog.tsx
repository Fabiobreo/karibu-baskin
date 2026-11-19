"use client";
import { Box, Button, DialogContent, DialogTitle } from "@mui/material";
import { useTranslations } from "next-intl";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import DrillPlayer from "./DrillPlayer";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import type { DrillContent } from "@/lib/board/content";

/** Anteprima animata del disegno che si sta modificando (UX-72, UX-73). */
export default function DrillPreviewDialog({
  title,
  court,
  content,
  onClose,
}: {
  title: string;
  court: "FULL" | "HALF";
  content: DrillContent;
  onClose: () => void;
}) {
  const t = useTranslations("board.editor");
  return (
    <ResponsiveDialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>{t("previewTitle", { title })}</DialogTitle>
      <DialogContent>
        <DrillPlayer title={title} court={court} content={content} initialStep={0} />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button onClick={onClose}>{t("close")}</Button>
        </Box>
      </DialogContent>
    </ResponsiveDialog>
  );
}

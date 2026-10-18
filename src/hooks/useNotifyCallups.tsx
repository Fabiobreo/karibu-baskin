"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";

/**
 * "Avvisa i convocati": chiede conferma, poi rimanda l'avviso di convocazione
 * a tutta la lista salvata (`POST /api/matches/[matchId]/callups/notify`).
 * Lo usano la pagina partita e la pagina convocazioni del pannello.
 */
export function useNotifyCallups(matchId: string, count: number) {
  const t = useTranslations("matches");
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/matches/${matchId}/callups/notify`, { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as { count: number };
    },
    onSuccess: (data) =>
      showToast({ message: t("callupsNotified", { count: data.count }), severity: "success" }),
    onError: (err) =>
      showToast({
        message: err instanceof Error ? err.message : t("callupsNotifyError"),
        severity: "error",
      }),
  });

  function requestNotify() {
    openConfirm(
      t("callupsNotifyTitle"),
      t("callupsNotifyBody", { count }),
      () => mutation.mutate(),
      { confirmLabel: t("callupsNotifyConfirm"), confirmColor: "primary" }
    );
  }

  return { requestNotify, isPending: mutation.isPending, ConfirmDialog };
}

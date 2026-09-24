"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  parseRowsPerPage,
  readRowsPerPageCookie,
  writeRowsPerPageCookie,
  type RowsPerPageTable,
} from "@/lib/rowsPerPage";

// Il cookie cambia solo da qui: niente a cui iscriversi.
const noopSubscribe = () => () => {};

/**
 * Righe per pagina di una tabella, ricordate tra una visita e l'altra.
 *
 * Sul server e durante l'idratazione vale `fallback` (il server non conosce
 * la preferenza di una tabella paginata nel browser); subito dopo React passa
 * al valore salvato nel cookie. Cambiarla la salva.
 */
export function useRowsPerPage(
  table: RowsPerPageTable,
  options: readonly number[],
  fallback: number
): [number, (value: number) => void] {
  const saved = useSyncExternalStore(
    noopSubscribe,
    () => readRowsPerPageCookie(table) ?? null,
    () => null
  );
  const [chosen, setChosen] = useState<number | null>(null);

  const update = useCallback(
    (value: number) => {
      setChosen(value);
      writeRowsPerPageCookie(table, value);
    },
    [table]
  );

  return [chosen ?? parseRowsPerPage(saved, options, fallback), update];
}

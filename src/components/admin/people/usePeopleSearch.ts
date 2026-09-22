"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { readError } from "@/lib/fetchJson";
import type { AdminPerson } from "@/app/api/admin/people/route";

export type { AdminPerson };

/**
 * Ricerca persone per i picker dello staff (`GET /api/admin/people`), con
 * debounce: si digita un cognome sul telefono, e una richiesta per lettera
 * sarebbe solo rumore. Sotto i 2 caratteri non parte.
 */
export function usePeopleSearch(query: string, kind: "user" | "child" | "all") {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debounced.length >= 2;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["admin-people", kind, debounced],
    queryFn: async () => {
      const res = await fetch(`/api/admin/people?kind=${kind}&q=${encodeURIComponent(debounced)}`);
      if (!res.ok) throw new Error(await readError(res));
      return ((await res.json()) as { people: AdminPerson[] }).people;
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    people: enabled ? (data ?? []) : [],
    // Anche l'attesa del debounce conta come ricerca in corso: senza, per un
    // quarto di secondo compare "nessun risultato".
    searching: query.trim().length >= 2 && (isFetching || query.trim() !== debounced),
    enabled: query.trim().length >= 2,
    isError,
  };
}

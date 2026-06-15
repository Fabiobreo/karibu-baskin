"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Autocomplete, TextField, Button, CircularProgress } from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Option {
  label: string;
  slug: string;
}
interface ComparePickerProps {
  initialA?: { slug: string; label: string } | null;
  initialB?: { slug: string; label: string } | null;
}

function usePlayerSearch(query: string): { options: Option[]; loading: boolean } {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    const id = setTimeout(
      async () => {
        if (q.length < 2) {
          setOptions([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (!res.ok) throw new Error(`search ${res.status}`);
          const data = await res.json();
          if (cancelled) return;
          const players = (data.players ?? []) as { name: string; href: string }[];
          setOptions(players.map((p) => ({ label: p.name, slug: p.href.split("/").pop() ?? "" })));
        } catch (err) {
          if (!cancelled) {
            console.error("[ComparePicker] search failed", err);
            setOptions([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      q.length < 2 ? 0 : 250
    );
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);
  return { options, loading };
}

function PlayerField({
  value,
  onChange,
  placeholder,
}: {
  value: Option | null;
  onChange: (o: Option | null) => void;
  placeholder: string;
}) {
  const t = useTranslations("search");
  const [input, setInput] = useState("");
  const { options, loading } = usePlayerSearch(input);
  // Deduplica per slug e tiene il valore selezionato sempre tra le opzioni.
  const merged = useMemo(() => {
    const seen = new Set<string>();
    const list: Option[] = [];
    for (const o of value ? [value, ...options] : options) {
      if (o.slug && !seen.has(o.slug)) {
        seen.add(o.slug);
        list.push(o);
      }
    }
    return list;
  }, [value, options]);

  return (
    <Autocomplete
      sx={{ flex: 1, minWidth: 200 }}
      options={merged}
      value={value}
      onChange={(_, o) => onChange(o)}
      onInputChange={(_, v) => setInput(v)}
      isOptionEqualToValue={(o, v) => o.slug === v.slug}
      getOptionLabel={(o) => o.label}
      filterOptions={(x) => x}
      loading={loading}
      noOptionsText={input.trim().length < 2 ? t("hint") : t("noResults")}
      renderOption={(props, option) => (
        <li {...props} key={option.slug}>
          {option.label}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder={placeholder}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}

export default function ComparePicker({ initialA, initialB }: ComparePickerProps) {
  const t = useTranslations("players");
  const router = useRouter();
  const [a, setA] = useState<Option | null>(initialA ?? null);
  const [b, setB] = useState<Option | null>(initialB ?? null);

  return (
    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 4 }}>
      <PlayerField value={a} onChange={setA} placeholder={`${t("compare")} 1`} />
      <PlayerField value={b} onChange={setB} placeholder={`${t("compare")} 2`} />
      <Button
        variant="contained"
        startIcon={<CompareArrowsIcon />}
        disabled={!a || !b}
        onClick={() =>
          router.push(
            `/giocatori/confronta?a=${encodeURIComponent(a!.slug)}&b=${encodeURIComponent(b!.slug)}`
          )
        }
        sx={{ fontWeight: 700, borderRadius: 2 }}
      >
        {t("compare")}
      </Button>
    </Box>
  );
}

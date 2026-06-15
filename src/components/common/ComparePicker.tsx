"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Autocomplete, TextField, Button } from "@mui/material";
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

function usePlayerSearch(query: string): Option[] {
  const [options, setOptions] = useState<Option[]>([]);
  useEffect(() => {
    const q = query.trim();
    const id = setTimeout(
      async () => {
        if (q.length < 2) {
          setOptions([]);
          return;
        }
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (!res.ok) return;
          const data = await res.json();
          setOptions(
            (data.players as { name: string; href: string }[]).map((p) => ({
              label: p.name,
              slug: p.href.split("/").pop() ?? "",
            }))
          );
        } catch {
          /* ignore */
        }
      },
      q.length < 2 ? 0 : 250
    );
    return () => clearTimeout(id);
  }, [query]);
  return options;
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
  const [input, setInput] = useState("");
  const options = usePlayerSearch(input);
  const merged = useMemo(
    () => (value && !options.some((o) => o.slug === value.slug) ? [value, ...options] : options),
    [value, options]
  );
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
      renderInput={(params) => <TextField {...params} size="small" placeholder={placeholder} />}
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

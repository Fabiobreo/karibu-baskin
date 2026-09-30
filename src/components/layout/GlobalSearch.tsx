"use client";

import { useEffect, useState } from "react";
import {
  IconButton,
  Dialog,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Avatar,
  List,
  ListItemButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TOUCH_TARGET } from "@/lib/touchTarget";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface ResultItem {
  name: string;
  href: string;
  image?: string | null;
  sportRole?: number | null;
}
interface SearchResults {
  players: ResultItem[];
  teams: ResultItem[];
  opponents: ResultItem[];
  news: ResultItem[];
  events: ResultItem[];
}

const EMPTY: SearchResults = { players: [], teams: [], opponents: [], news: [], events: [] };

export default function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const enabled = debounced.length >= 2;
  const { data = EMPTY, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as SearchResults;
    },
    enabled,
    staleTime: 30_000,
  });

  function go(href: string) {
    setOpen(false);
    setQ("");
    setDebounced("");
    router.push(href);
  }

  const groups: { key: keyof SearchResults; label: string }[] = [
    { key: "players", label: t("players") },
    { key: "teams", label: t("teams") },
    { key: "opponents", label: t("opponents") },
    { key: "news", label: t("news") },
    { key: "events", label: t("events") },
  ];
  const total = groups.reduce((n, g) => n + data[g.key].length, 0);

  return (
    <>
      <Tooltip title={t("open")}>
        <IconButton
          onClick={() => setOpen(true)}
          aria-label={t("open")}
          color="inherit"
          sx={TOUCH_TARGET}
        >
          <SearchIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { position: "fixed", top: 24, m: 0, borderRadius: RADIUS.lg } } }}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            autoFocus
            fullWidth
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("placeholder")}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: isFetching ? (
                  <InputAdornment position="end">
                    <CircularProgress size={18} />
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          <Box sx={{ mt: 1.5, maxHeight: "60vh", overflowY: "auto" }}>
            {!enabled ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                {t("hint")}
              </Typography>
            ) : total === 0 && !isFetching ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                {t("noResults")}
              </Typography>
            ) : (
              groups.map((g) =>
                data[g.key].length === 0 ? null : (
                  <Box key={g.key} sx={{ mb: 1 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
                      {g.label}
                    </Typography>
                    <List dense disablePadding>
                      {data[g.key].map((item, i) => (
                        <ListItemButton
                          key={`${g.key}-${i}`}
                          onClick={() => go(item.href)}
                          sx={{ borderRadius: RADIUS.md, gap: 1.25 }}
                        >
                          {g.key === "players" || g.key === "opponents" ? (
                            <Avatar
                              src={item.image ?? undefined}
                              sx={{ width: 28, height: 28, fontSize: TYPE_SCALE.sm }}
                            >
                              {item.name[0]}
                            </Avatar>
                          ) : null}
                          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                            {item.name}
                          </Typography>
                          {item.sportRole ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: "auto" }}
                            >
                              R{item.sportRole}
                            </Typography>
                          ) : null}
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                )
              )
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}

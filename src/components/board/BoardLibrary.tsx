"use client";
import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslations } from "next-intl";
import EmptyState from "@/components/common/EmptyState";
import { interpolateStep } from "@/lib/board/animation";
import type { PublicDrill } from "@/lib/board/loadBoard";
import { RADIUS } from "@/lib/radius";
import { TOUCH_FIELD_ON_PHONE } from "@/lib/touchTarget";
import BoardSvg from "./BoardSvg";

/** Riga sotto il titolo: tipo, campo, durata, passi. */
export function useDrillMeta() {
  const t = useTranslations("board");
  return (d: Pick<PublicDrill, "kind" | "court" | "durationMin" | "content">) =>
    [
      t(`kinds.${d.kind}`),
      t(`courts.${d.court}`),
      d.durationMin ? t("minutes", { n: d.durationMin }) : null,
      t("steps", { n: d.content.steps.length }),
    ]
      .filter(Boolean)
      .join(" · ");
}

/**
 * Libreria della lavagna per i tesserati (UX-72): card con la miniatura del
 * primo passo, filtri per tipo, campo e squadra di riferimento, ricerca.
 * Tutti i tesserati vedono tutti gli schemi pubblicati: la squadra e' solo un filtro.
 */
export default function BoardLibrary({ drills }: { drills: PublicDrill[] }) {
  const t = useTranslations("board");
  const meta = useDrillMeta();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [court, setCourt] = useState("");
  const [team, setTeam] = useState("");

  const teams = useMemo(() => {
    const byId = new Map<string, NonNullable<PublicDrill["team"]>>();
    for (const d of drills) if (d.team) byId.set(d.team.id, d.team);
    return [...byId.values()].sort(
      (a, b) => b.season.localeCompare(a.season) || a.name.localeCompare(b.name)
    );
  }, [drills]);
  const kinds = useMemo(() => [...new Set(drills.map((d) => d.kind))], [drills]);

  const shown = drills.filter(
    (d) =>
      (!search.trim() || d.title.toLowerCase().includes(search.trim().toLowerCase())) &&
      (!kind || d.kind === kind) &&
      (!court || d.court === court) &&
      (!team || d.team?.id === team)
  );

  if (drills.length === 0) return <EmptyState title={t("empty")} />;

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "2fr 1fr 1fr 1fr" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={TOUCH_FIELD_ON_PHONE}
          slotProps={{
            htmlInput: { "aria-label": t("search") },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Filter
          id="board-kind"
          label={t("filterKind")}
          value={kind}
          onChange={setKind}
          all={t("all")}
        >
          {kinds.map((k) => (
            <MenuItem key={k} value={k}>
              {t(`kinds.${k}`)}
            </MenuItem>
          ))}
        </Filter>
        <Filter
          id="board-court"
          label={t("filterCourt")}
          value={court}
          onChange={setCourt}
          all={t("all")}
        >
          <MenuItem value="HALF">{t("courts.HALF")}</MenuItem>
          <MenuItem value="FULL">{t("courts.FULL")}</MenuItem>
        </Filter>
        {teams.length > 0 && (
          <Filter
            id="board-team"
            label={t("filterTeam")}
            value={team}
            onChange={setTeam}
            all={t("allTeams")}
          >
            {teams.map((tm) => (
              <MenuItem key={tm.id} value={tm.id}>
                {tm.name} ({tm.season})
              </MenuItem>
            ))}
          </Filter>
        )}
      </Box>

      {shown.length === 0 ? (
        <EmptyState title={t("emptyFiltered")} />
      ) : (
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {shown.map((d) => (
            <li key={d.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderRadius: RADIUS.lg,
                  transition: "border-color .15s",
                  "&:hover": { borderColor: "primary.main" },
                  "&:hover .board-arrow": { color: "primary.main" },
                }}
              >
                <CardActionArea
                  href={`/lavagna/${d.slug}`}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                  }}
                >
                  <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} aria-hidden>
                    <BoardSvg
                      court={d.court}
                      pieces={d.content.pieces}
                      frame={interpolateStep(d.content, 0)}
                      title={t("courtAlt", { title: d.title })}
                      framed={false}
                    />
                  </Box>
                  <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" component="h2">
                        {d.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {meta(d)}
                      </Typography>
                    </Box>
                    <ArrowForwardIcon
                      className="board-arrow"
                      sx={{ color: "text.secondary", mt: 0.5 }}
                      aria-hidden
                    />
                  </Box>
                </CardActionArea>
              </Card>
            </li>
          ))}
        </Box>
      )}
    </>
  );
}

function Filter({
  id,
  label,
  value,
  onChange,
  all,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  all: string;
  children: React.ReactNode;
}) {
  return (
    <FormControl size="small" sx={TOUCH_FIELD_ON_PHONE}>
      <InputLabel id={id} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={id}
        label={label}
        value={value}
        displayEmpty
        notched
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">{all}</MenuItem>
        {children}
      </Select>
    </FormControl>
  );
}

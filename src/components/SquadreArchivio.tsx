"use client";

import { useState } from "react";
import {
  Box, Typography, Paper, Chip, Grid2 as Grid, Collapse, Button, Divider,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArchiveIcon from "@mui/icons-material/Archive";
import Link from "next/link";
import { slugify } from "@/lib/slugUtils";

type Team = {
  id: string;
  name: string;
  season: string;
  championship: string | null;
  color: string | null;
  _count: { memberships: number; matches: number };
};

type Props = {
  seasons: string[];
  bySeason: Record<string, Team[]>;
};

export default function SquadreArchivio({ seasons, bySeason }: Props) {
  const [open, setOpen] = useState(false);

  if (seasons.length === 0) return null;

  return (
    <Box sx={{ mt: 8 }}>
      <Divider sx={{ mb: 4 }} />

      <Button
        onClick={() => setOpen((v) => !v)}
        startIcon={<ArchiveIcon />}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          fontSize: "0.9rem",
          textTransform: "none",
          px: 0,
          "&:hover": { backgroundColor: "transparent", color: "text.primary" },
        }}
      >
        Archivio stagioni precedenti ({seasons.length})
      </Button>

      <Collapse in={open}>
        <Box sx={{ mt: 3 }}>
          {seasons.map((season, i) => (
            <Box key={season} sx={{ mb: i < seasons.length - 1 ? 4 : 0 }}>
              <Typography
                variant="overline"
                fontWeight={700}
                sx={{ color: "text.disabled", letterSpacing: "0.1em", display: "block", mb: 1.5 }}
              >
                Stagione {season}
              </Typography>
              <Grid container spacing={2}>
                {bySeason[season].map((team) => (
                  <Grid key={team.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Link
                      href={`/squadre/${team.season.replace("-", "")}/${slugify(team.name)}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                          border: "1px solid rgba(0,0,0,0.07)",
                          opacity: 0.75,
                          transition: "opacity 0.15s",
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        {/* Strip colorata laterale */}
                        <Box sx={{ width: 5, alignSelf: "stretch", flexShrink: 0, backgroundColor: team.color ?? "#757575" }} />
                        <Box sx={{ px: 1.5, py: 1.5, flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {team.name}
                          </Typography>
                          {team.championship && (
                            <Typography variant="caption" color="text.disabled" noWrap sx={{ display: "block" }}>
                              {team.championship}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                              <GroupsIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                              <Typography variant="caption" color="text.disabled">{team._count.memberships}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                              <SportsSoccerIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                              <Typography variant="caption" color="text.disabled">{team._count.matches}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    </Link>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

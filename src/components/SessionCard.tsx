"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Box,
  Button,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { format } from "date-fns";
import Link from "next/link";
import Countdown from "@/components/Countdown";
import TeamsModal from "@/components/TeamsModal";

interface Athlete {
  id: string;
  name: string;
  role: number;
}

interface TeamsData {
  teamA: Athlete[];
  teamB: Athlete[];
  teamC?: Athlete[];
}

interface SessionWithCount {
  id: string;
  title: string;
  date: string | Date;
  teams: TeamsData | null;
  _count: { registrations: number };
}

export default function SessionCard({ session }: { session: SessionWithCount }) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const date = new Date(session.date);
  const count = session._count.registrations;
  const chipColor = count < 20 ? "success" : count < 35 ? "warning" : "error";
  const hasTeams = !!session.teams;

  return (
    <>
      <Card elevation={0} sx={{ position: "relative" }}>
        <CardActionArea component={Link} href={`/allenamento/${session.id}`} sx={{ borderRadius: "14px" }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, pb: hasTeams ? "0 !important" : undefined }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, mb: 1.5, fontSize: { xs: "1rem", sm: "1.1rem" }, lineHeight: 1.3 }}
            >
              {session.title}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                  Ore {format(date, "HH:mm")}
                </Typography>
              </Box>
              <Countdown date={session.date} />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PeopleAltIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem" }}>
                  {count} iscritti
                </Typography>
              </Box>
              <Chip
                label={count === 0 ? "Iscriviti" : `${count} atleti`}
                color={count === 0 ? "primary" : chipColor}
                size="small"
                sx={{ fontSize: "0.72rem" }}
              />
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Bottone Vedi squadre — fuori dalla CardActionArea per evitare conflitti */}
        {hasTeams && (
          <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 1.5, sm: 2 }, pt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<SportsBasketballIcon sx={{ fontSize: "0.9rem !important" }} />}
              onClick={(e) => { e.stopPropagation(); setTeamsOpen(true); }}
              fullWidth
              sx={{ fontSize: "0.78rem", py: 0.5 }}
            >
              Vedi squadre
            </Button>
          </Box>
        )}
      </Card>

      {hasTeams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={session.title}
          teamA={session.teams!.teamA}
          teamB={session.teams!.teamB}
          teamC={session.teams!.teamC}
        />
      )}
    </>
  );
}

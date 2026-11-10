import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { StandingEntry } from "@/lib/season/standings";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface GironeStandingsTableProps {
  standings: StandingEntry[];
}

const NUM = { fontVariantNumeric: "tabular-nums", px: { xs: 0.75, sm: 1.5 } } as const;

/** Classifica del girone, calcolata da tutte le partite con il punteggio. */
export default function GironeStandingsTable({ standings }: GironeStandingsTableProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Classifica
      </Typography>
      {standings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          La classifica compare con il primo risultato.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Classifica del girone">
            <TableHead>
              <TableRow>
                <TableCell sx={NUM}>#</TableCell>
                <TableCell>Squadra</TableCell>
                <TableCell align="right" sx={NUM}>
                  Pt
                </TableCell>
                <TableCell align="right" sx={NUM}>
                  G
                </TableCell>
                <TableCell align="right" sx={NUM}>
                  V
                </TableCell>
                <TableCell align="right" sx={NUM}>
                  P
                </TableCell>
                <TableCell align="right" sx={NUM}>
                  S
                </TableCell>
                <TableCell align="right" sx={{ ...NUM, display: { xs: "none", sm: "table-cell" } }}>
                  Diff.
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {standings.map((s, i) => {
                const diff = s.goalsFor - s.goalsAgainst;
                const weight = s.isOurs ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular;
                return (
                  <TableRow key={s.id} selected={s.isOurs}>
                    <TableCell sx={NUM}>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: weight }}>{s.name}</TableCell>
                    <TableCell align="right" sx={{ ...NUM, fontWeight: FONT_WEIGHT.semibold }}>
                      {s.points}
                    </TableCell>
                    <TableCell align="right" sx={NUM}>
                      {s.played}
                    </TableCell>
                    <TableCell align="right" sx={NUM}>
                      {s.won}
                    </TableCell>
                    <TableCell align="right" sx={NUM}>
                      {s.drawn}
                    </TableCell>
                    <TableCell align="right" sx={NUM}>
                      {s.lost}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...NUM, display: { xs: "none", sm: "table-cell" } }}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

"use client";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { roleColor } from "@/lib/constants";
import { wavyPath } from "./BoardSvg";

/**
 * Legenda della lavagna (UX-72): le frecce si distinguono per la forma della
 * linea, le pedine per pieno e contornato. Le frecce sono neutre: niente
 * colore da imparare.
 */
export default function BoardLegend() {
  const t = useTranslations("board");
  const theme = useTheme();
  const ink = theme.palette.text.primary;
  const tint = roleColor(3);
  const W = 36;
  const H = 14;
  const line = (extra: React.SVGProps<SVGLineElement>) => (
    <line x1={2} y1={H / 2} x2={W - 6} y2={H / 2} stroke={ink} strokeWidth={1.6} {...extra} />
  );
  const head = (filled: boolean) =>
    filled ? (
      <path d={`M${W - 8},${H / 2 - 4} L${W - 1},${H / 2} L${W - 8},${H / 2 + 4} z`} fill={ink} />
    ) : (
      <path
        d={`M${W - 8},${H / 2 - 4} L${W - 2},${H / 2} L${W - 8},${H / 2 + 4}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.6}
      />
    );

  const items: { key: string; icon: React.ReactNode }[] = [
    {
      key: "legendAttack",
      icon: <circle cx={W / 2} cy={H / 2} r={6} fill={tint} />,
    },
    {
      key: "legendDefense",
      icon: (
        <circle
          cx={W / 2}
          cy={H / 2}
          r={5.5}
          fill={theme.palette.background.paper}
          stroke={tint}
          strokeWidth={2.5}
        />
      ),
    },
    {
      key: "legendMove",
      icon: (
        <>
          {line({})}
          {head(false)}
        </>
      ),
    },
    {
      key: "legendPass",
      icon: (
        <>
          {line({ strokeDasharray: "4 3" })}
          {head(false)}
        </>
      ),
    },
    {
      key: "legendDribble",
      icon: (
        <>
          <path
            d={wavyPath({ x: 2, y: H / 2 }, { x: W - 4, y: H / 2 }, 2.5, 8)}
            fill="none"
            stroke={ink}
            strokeWidth={1.6}
          />
          {head(false)}
        </>
      ),
    },
    {
      key: "legendShot",
      icon: (
        <>
          {line({ strokeDasharray: "4 3", strokeWidth: 2 })}
          {head(true)}
        </>
      ),
    },
    {
      key: "legendScreen",
      icon: (
        <>
          <line x1={2} y1={H / 2} x2={W - 4} y2={H / 2} stroke={ink} strokeWidth={1.6} />
          <line x1={W - 4} y1={1} x2={W - 4} y2={H - 1} stroke={ink} strokeWidth={1.8} />
        </>
      ),
    },
  ];

  return (
    <Box component="section" aria-label={t("legend")} sx={{ mt: 1.5 }}>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: "none",
          display: "flex",
          flexWrap: "wrap",
          columnGap: 2,
          rowGap: 0.75,
        }}
      >
        {items.map((item) => (
          <Box
            component="li"
            key={item.key}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              {item.icon}
            </svg>
            <Typography variant="caption" color="text.secondary">
              {t(item.key)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

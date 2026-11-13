import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO_TEXT, OUTCOME } from "@/lib/palette";
import type { QuizArt } from "@/lib/games/gameArt";

/**
 * Disegni delle card di `/giochi` (UX-68). Stanno sulla testata grafite
 * (`heroGradient.cardHead`), che resta scura nei due temi: per questo i colori
 * sono quelli dei testi sopra gli hero. Il verde della risposta giusta è la
 * valenza "positivo"; le tinte squadra compaiono solo dove c'è una squadra vera.
 * Solo SVG, nessun testo da leggere: per i lettori di schermo è decorativo.
 */

/** Una squadra nel disegno: iniziale e riempimento (`teamFill`), o neutra. */
export interface ArtTeam {
  initial: string;
  fill: { bg: string; fg: string } | null;
}

export type GameArtProps =
  | { kind: "quiz"; art: QuizArt }
  | { kind: "prediction"; left: ArtTeam; right: ArtTeam; when: string }
  | { kind: "prediction-waiting" }
  | { kind: "simulator"; left: ArtTeam; right: ArtTeam };

const VIEW_W = 320;
const VIEW_H = 200;
const LINE = HERO_TEXT.line;
const STRONG = HERO_TEXT.lineStrong;
const SURFACE = HERO_TEXT.surface;
const WIN = OUTCOME.dark.win;
const WIN_BG = OUTCOME.dark.winBg;
const FONT = { fontFamily: "inherit", fontWeight: FONT_WEIGHT.bold } as const;

/** Campo da baskin dall'alto, con le due aree laterali a metà campo. */
function Court() {
  return (
    <g fill="none" stroke={LINE} strokeWidth={1.5} opacity={0.7}>
      <rect x={14} y={14} width={292} height={172} rx={2} />
      <line x1={160} y1={14} x2={160} y2={186} />
      <circle cx={160} cy={100} r={22} />
      <rect x={14} y={70} width={44} height={60} />
      <rect x={262} y={70} width={44} height={60} />
      <path d="M58 70 a30 30 0 0 1 0 60" />
      <path d="M262 70 a30 30 0 0 0 0 60" />
      <path d="M140 14 a20 20 0 0 0 40 0" />
      <path d="M140 186 a20 20 0 0 1 40 0" />
    </g>
  );
}

/** Le tre risposte del quiz, una giusta (`right`: 0, 1 o 2). */
function Answers({ x, right }: { x: number; right: number }) {
  const widths = [70, 56, 80];
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const y = 56 + i * 32;
        const ok = i === right;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={132}
              height={24}
              rx={6}
              fill={ok ? WIN_BG : SURFACE}
              stroke={ok ? WIN : STRONG}
            />
            <rect
              x={x + 14}
              y={y + 10}
              width={widths[i]}
              height={4}
              rx={2}
              fill={ok ? WIN : STRONG}
            />
            {ok && (
              <path
                d={`M${x + 112} ${y + 12} l5 5 9-10`}
                fill="none"
                stroke={WIN}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Il segno grande a sinistra di ogni quiz. */
function QuizGlyph({ art }: { art: QuizArt }) {
  const white = HERO_TEXT.primary;
  switch (art) {
    case "club":
      return (
        <g>
          <path
            d="M92 48 l40 14 v30 c0 26 -18 42 -40 52 c-22 -10 -40 -26 -40 -52 v-30 z"
            fill={SURFACE}
            stroke={white}
            strokeWidth={3}
          />
          <text x={92} y={112} textAnchor="middle" fontSize={46} fill={white} {...FONT}>
            K
          </text>
        </g>
      );
    case "teams":
      // Due maglie, una davanti all'altra.
      return (
        <g strokeLinejoin="round">
          <path
            d="M48 62 l16 -10 h20 l16 10 l-8 16 h-8 v54 h-40 v-54 h-8 z"
            fill={SURFACE}
            stroke={STRONG}
            strokeWidth={2.5}
          />
          <path
            d="M76 70 l16 -10 h20 l16 10 l-8 16 h-8 v54 h-40 v-54 h-8 z"
            fill={BRAND.darkSoft}
            stroke={white}
            strokeWidth={3}
          />
          <text x={102} y={124} textAnchor="middle" fontSize={34} fill={white} {...FONT}>
            5
          </text>
        </g>
      );
    case "history":
      // Clessidra.
      return (
        <g fill="none" stroke={white} strokeWidth={3} strokeLinejoin="round">
          <line x1={58} y1={50} x2={126} y2={50} strokeLinecap="round" />
          <line x1={58} y1={150} x2={126} y2={150} strokeLinecap="round" />
          <path d="M66 50 c0 30 26 34 26 50 c0 16 -26 20 -26 50 M118 50 c0 30 -26 34 -26 50 c0 16 26 20 26 50" />
          <path d="M78 140 q14 -16 28 0 z" fill={white} stroke="none" />
          <path d="M80 72 h24 q-6 12 -12 14 q-6 -2 -12 -14 z" fill={STRONG} stroke="none" />
        </g>
      );
    default:
      return (
        <text x={92} y={136} textAnchor="middle" fontSize={112} fill={white} {...FONT}>
          ?
        </text>
      );
  }
}

/** Una squadra come cerchio pieno nella sua tinta, o neutro senza tinta. */
function TeamDisc({ cx, cy, r, team }: { cx: number; cy: number; r: number; team: ArtTeam }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={team.fill?.bg ?? BRAND.darkSoft}
        stroke={team.fill ? "none" : STRONG}
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy + r * 0.4}
        textAnchor="middle"
        fontSize={r * 1.1}
        fill={team.fill?.fg ?? HERO_TEXT.secondary}
        {...FONT}
      >
        {team.initial}
      </text>
    </g>
  );
}

/** Il tabellone del pronostico: due caselle con "?" (o vuote). */
function Scoreboard({ empty }: { empty?: boolean }) {
  return (
    <g>
      {[128, 164].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y={72}
            width={28}
            height={40}
            rx={6}
            fill={SURFACE}
            stroke={empty ? LINE : STRONG}
          />
          <text
            x={x + 14}
            y={103}
            textAnchor="middle"
            fontSize={30}
            fill={empty ? HERO_TEXT.muted : HERO_TEXT.primary}
            {...FONT}
          >
            {empty ? "–" : "?"}
          </text>
        </g>
      ))}
    </g>
  );
}

export default function GameArt(props: GameArtProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      <Court />
      {props.kind === "quiz" && (
        <>
          <QuizGlyph art={props.art} />
          <Answers x={150} right={props.art === "club" ? 2 : 1} />
        </>
      )}
      {props.kind === "prediction" && (
        <>
          <TeamDisc cx={78} cy={92} r={38} team={props.left} />
          <TeamDisc cx={242} cy={92} r={38} team={props.right} />
          <Scoreboard />
          <rect x={92} y={146} width={136} height={26} rx={13} fill={SURFACE} />
          <text
            x={160}
            y={163}
            textAnchor="middle"
            fontSize={12}
            fill={HERO_TEXT.secondary}
            fontFamily="inherit"
            fontWeight={FONT_WEIGHT.semibold}
          >
            {props.when}
          </text>
        </>
      )}
      {props.kind === "prediction-waiting" && (
        <>
          <circle
            cx={78}
            cy={92}
            r={38}
            fill="none"
            stroke={STRONG}
            strokeWidth={2}
            strokeDasharray="5 6"
          />
          <circle
            cx={242}
            cy={92}
            r={38}
            fill="none"
            stroke={STRONG}
            strokeWidth={2}
            strokeDasharray="5 6"
          />
          <Scoreboard empty />
        </>
      )}
      {props.kind === "simulator" && (
        <>
          <TeamDisc cx={96} cy={86} r={36} team={props.left} />
          <TeamDisc cx={224} cy={86} r={36} team={props.right} />
          <text x={160} y={93} textAnchor="middle" fontSize={18} fill={HERO_TEXT.muted} {...FONT}>
            VS
          </text>
          <rect
            x={60}
            y={144}
            width={104}
            height={10}
            rx={5}
            fill={props.left.fill?.bg ?? STRONG}
          />
          <rect x={166} y={144} width={94} height={10} rx={5} fill={props.right.fill?.bg ?? LINE} />
        </>
      )}
    </svg>
  );
}

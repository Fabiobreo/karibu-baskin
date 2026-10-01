// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from "eslint-config-next/core-web-vitals";

// UX-10: le dimensioni del testo vengono dalla scala del tema
// (variant, o sx={{ typography: "caption" }}). Esclusi i tag *Icon,
// dove fontSize e' la dimensione dell'icona, e "inherit", che non e' una
// dimensione. Dove serve solo la dimensione: TYPE_SCALE (UX-27).
const FONT_SIZE_RULE = {
  selector:
    "JSXOpeningElement:not([name.name=/Icon$/]) > JSXAttribute[name.name=/^(sx|style|InputProps|slotProps|componentsProps|primaryTypographyProps|secondaryTypographyProps)$/] Property[key.name='fontSize'] Literal:not([value='inherit'])",
  message:
    "fontSize letterale: usa variant, sx={{ typography: '…' }} o TYPE_SCALE da @/lib/typeScale",
};

const PALETTE_MESSAGE =
  "Colore scritto a mano: usa un token del tema, teamColor() da @/lib/teamColors o una costante di @/lib/palette (l'unico file con i colori, UX-29).";

const RESTRICTED_SYNTAX = [
  // UX-29: la palette e' chiusa. I colori stanno solo in `@/lib/palette`; il
  // resto usa i token del tema, `@/lib/teamColors` o le costanti di
  // `@/lib/palette` (OG, email, global-error). Le ombre non sono colori con un
  // significato e restano libere.
  {
    selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
    message: PALETTE_MESSAGE,
  },
  {
    selector:
      "TemplateElement[value.raw=/#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})([^0-9a-fA-F]|$)/]:not(Property[key.name=/^(boxShadow|textShadow)$/] TemplateElement)",
    message: PALETTE_MESSAGE,
  },
  {
    selector:
      "Literal[value=/rgba?[(]/]:not(Property[key.name=/^(boxShadow|textShadow|filter)$/] Literal)",
    message: PALETTE_MESSAGE,
  },
  {
    selector:
      "TemplateElement[value.raw=/rgba?[(]/]:not(Property[key.name=/^(boxShadow|textShadow|filter)$/] TemplateElement)",
    message: PALETTE_MESSAGE,
  },
  // Senza colore una squadra non ha nessun segno: mai un ripiego (tanto meno
  // l'arancio, che vuol dire "si tocca").
  {
    selector:
      "LogicalExpression:matches([operator='??'], [operator='||'])[left.property.name=/^(color|teamColor)$/]",
    message:
      "Ripiego sul colore di una squadra: usa teamColor() da @/lib/teamColors, che restituisce null senza colore (nessun segno, mai primary).",
  },
  // Token tolti in UX-29: stati, KPI e statistiche sono neutri. `calendar` e'
  // tornato il 01/10 (tipo di impegno nel calendario, decisione del committente).
  {
    selector: "Literal[value=/^(admin|stats|status)[.]/]",
    message:
      "Token rimosso in UX-29: tipi, stati temporali, KPI e statistiche sono neutri (icona, forma o parola). Vedi CLAUDE.md, Colore = significato.",
  },
  {
    selector:
      "MemberExpression[object.property.name='palette'][property.name=/^(admin|stats|status)$/]",
    message: "Token rimosso in UX-29: vedi CLAUDE.md, Colore = significato.",
  },
  // `info` e' neutro: il blu e' delle squadre.
  {
    selector: "JSXAttribute[name.name='color'] > Literal[value='info']",
    message: "info non e' un colore (UX-29): usa il colore di default del componente.",
  },
  // UX-09: `text.disabled` (#9E9E9E, 2,67:1 su bianco) non e' un colore di
  // testo. Esenti solo le icone grandi degli stati vuoti (fontSize >= 40
  // nello stesso oggetto `sx`): sono decorative. I controlli disabilitati
  // lo prendono gia' da MUI, senza passare di qui.
  {
    selector:
      "ObjectExpression:not(:has(Property[key.name='fontSize'] > Literal[value>=40])) > Property[key.name='color'] Literal[value='text.disabled']",
    message:
      "text.disabled non regge il contrasto come testo (2,67:1): usa text.secondary. Se indica uno stato (non marcato, zero, passato) aggiungi un secondo segnale oltre al colore.",
  },
  {
    selector: "JSXAttribute[name.name='color'] Literal[value='text.disabled']",
    message:
      "text.disabled non regge il contrasto come testo (2,67:1): usa text.secondary. Se indica uno stato (non marcato, zero, passato) aggiungi un secondo segnale oltre al colore.",
  },
  FONT_SIZE_RULE,
  // UX-31: tre pesi (400 testo, 600 etichette, 800 titoli), dalla
  // variante o da FONT_WEIGHT. Vale per qualunque oggetto di stile
  // (sx, style, *TypographyProps, costanti) e per la prop `fontWeight`.
  {
    selector: "Property[key.name='fontWeight'] > Literal:not([value='inherit'])",
    message:
      "fontWeight letterale: usa la variante (h6, subtitle2, overline, stat) o FONT_WEIGHT da @/lib/fontWeight (regular 400, semibold 600, bold 800).",
  },
  {
    selector:
      "Property[key.name='fontWeight'] > ConditionalExpression > Literal:not([value='inherit'])",
    message:
      "fontWeight letterale: usa la variante (h6, subtitle2, overline, stat) o FONT_WEIGHT da @/lib/fontWeight (regular 400, semibold 600, bold 800).",
  },
  {
    selector: "JSXAttribute[name.name='fontWeight'] > Literal",
    message:
      "fontWeight letterale: usa la variante (h6, subtitle2, overline, stat) o FONT_WEIGHT da @/lib/fontWeight (regular 400, semibold 600, bold 800).",
  },
  {
    selector: "JSXAttribute[name.name='fontWeight'] > JSXExpressionContainer > Literal",
    message:
      "fontWeight letterale: usa la variante (h6, subtitle2, overline, stat) o FONT_WEIGHT da @/lib/fontWeight (regular 400, semibold 600, bold 800).",
  },
  {
    selector:
      "JSXAttribute[name.name='fontWeight'] > JSXExpressionContainer > ConditionalExpression > Literal",
    message:
      "fontWeight letterale: usa la variante (h6, subtitle2, overline, stat) o FONT_WEIGHT da @/lib/fontWeight (regular 400, semibold 600, bold 800).",
  },
  // UX-30: i raggi vengono dalla scala RADIUS. Negli `sx` un numero viene
  // moltiplicato per shape.borderRadius (2 faceva 20 px, 3 ne faceva 30):
  // le card del sito avevano cinque raggi diversi. Liberi solo 0 e "50%".
  {
    selector:
      "JSXAttribute[name.name=/^(sx|slotProps|PaperProps|MenuProps|InputProps)$/] Property[key.name=/^border(Top|Bottom)?(Left|Right)?Radius$/] Literal:not([value=0]):not([value='50%'])",
    message:
      'borderRadius letterale: usa RADIUS da @/lib/radius (sm chip, md bottoni ed elementi interni, lg card, pill), oppure 0 / "50%".',
  },
];

export default [
  ...nextConfig,
  {
    rules: {
      // Questi pattern (setState in effect e ordering) sono usati correttamente
      // in tutto il codebase — degradati a warning per non bloccare CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    // Stile dal tema (vedi CLAUDE.md): colori, testo, raggi. Un colore scritto
    // a mano rompe il tema chiaro/scuro e sfugge alle verifiche di contrasto.
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      // In `error` da UX-27 (UX-31 per i pesi, UX-29 per la palette chiusa):
      // colori, text.disabled, fontSize e fontWeight letterali non devono tornare.
      "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX],
    },
  },
  {
    // Eccezioni alla scala delle dimensioni (UX-31): qui il testo non passa dal
    // tema MUI. Email (i client non gestiscono bene i rem), immagini a
    // dimensione fissa (Open Graph, tabellino, squadre per html2canvas): i px
    // sono quelli del disegno. I pesi invece restano sulla scala (FONT_WEIGHT).
    files: [
      "src/emails/**",
      "src/app/**/opengraph-image.tsx",
      "src/app/api/matches/[[]matchId]/tabellino/route.tsx",
      "src/components/training/ShareTeamsButton.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...RESTRICTED_SYNTAX.filter((rule) => rule !== FONT_SIZE_RULE),
      ],
    },
  },
  {
    // L'unico file con i colori, e i test e le storie che li verificano o li
    // usano come dati di prova (UX-29).
    files: [
      "src/lib/palette.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.stories.tsx",
      "src/stories/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...RESTRICTED_SYNTAX.filter((rule) => rule.message !== PALETTE_MESSAGE),
      ],
    },
  },
  ...storybook.configs["flat/recommended"],
];

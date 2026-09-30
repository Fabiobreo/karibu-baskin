// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from "eslint-config-next/core-web-vitals";

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
    // I colori vanno presi dai token del tema (vedi CLAUDE.md): un letterale
    // esadecimale dentro `sx` rompe il tema chiaro/scuro e sfugge alle
    // verifiche di contrasto.
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      // In `error` da UX-27: colori, text.disabled e fontSize letterali sono a
      // zero, e non devono tornare.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='sx'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Colore esadecimale dentro sx: usa un token del tema (primary.main, text.secondary, medal.gold…) invece del letterale.",
        },
        {
          selector: "JSXAttribute[name.name='sx'] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Colore esadecimale dentro sx: usa un token del tema (primary.main, text.secondary, medal.gold…) invece del letterale.",
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
        // UX-10: le dimensioni del testo vengono dalla scala del tema
        // (variant, o sx={{ typography: "caption" }}). Esclusi i tag *Icon,
        // dove fontSize e' la dimensione dell'icona, e "inherit", che non e' una
        // dimensione. Dove serve solo la dimensione: TYPE_SCALE (UX-27).
        {
          selector:
            "JSXOpeningElement:not([name.name=/Icon$/]) > JSXAttribute[name.name=/^(sx|InputProps|slotProps)$/] Property[key.name='fontSize'] Literal:not([value='inherit'])",
          message:
            "fontSize letterale: usa variant, sx={{ typography: '…' }} o TYPE_SCALE da @/lib/typeScale",
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
      ],
    },
  },
  ...storybook.configs["flat/recommended"],
];

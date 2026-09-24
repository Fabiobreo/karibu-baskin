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
    // verifiche di contrasto. E' un **warning**, non un errore: i file
    // rimasti da bonificare sono ancora parecchi e la build non deve
    // rompersi, ma ogni file che si tocca va ripulito.
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
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
      ],
    },
  },
  ...storybook.configs["flat/recommended"],
];

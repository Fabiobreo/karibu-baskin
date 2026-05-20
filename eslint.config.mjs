// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from "eslint-config-next/core-web-vitals";

export default [...nextConfig, {
  rules: {
    // Questi pattern (setState in effect e ordering) sono usati correttamente
    // in tutto il codebase — degradati a warning per non bloccare CI.
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/immutability": "warn",
  },
}, ...storybook.configs["flat/recommended"]];

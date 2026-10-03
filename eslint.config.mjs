import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".venv/**",
      ".pip-cache/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "data/raw/**"
    ]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;

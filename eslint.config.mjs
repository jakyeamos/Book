import nextTypescript from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", ".planning/**", "node_modules/**", "coverage/**"],
  },
];

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** ESLint flat config (Next.js 16 removed `next lint`). Run with `npm run lint`. */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Existing code uses `any` for loosely typed Supabase rows; flag it without
      // failing the lint so it can be tightened gradually.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow intentionally unused names when prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "handoff/**", "next-env.d.ts", "coverage/**"],
  },
];

export default config;

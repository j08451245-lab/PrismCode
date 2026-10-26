import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig([
  { ignores: ["**/dist/**", "**/node_modules/**", "**/generated/**", "**/.next/**", "**/next-env.d.ts", "**/.bun/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  prettier,
]);

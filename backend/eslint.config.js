// ──────────────────────────────────────────────
// ESLint Flat Config - MedConnect India Backend
// ──────────────────────────────────────────────
// ESLint v9+ flat config for NestJS/TypeScript
// Uses CommonJS require() syntax for compatibility
// with the project's CommonJS module system.
// ──────────────────────────────────────────────

const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  // Global ignore patterns
  {
    ignores: [
      "dist/",
      "node_modules/",
      "coverage/",
      ".keploy/",
      "keploy/",
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Project-specific overrides
  {
    rules: {
      // Allow decorators (NestJS uses them extensively)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",

      // NestJS best practices
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
);

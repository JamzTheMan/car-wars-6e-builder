import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Add Prettier plugin and config
  ...compat.extends("prettier"),
  {
    ignores: [
      ".next",
      "node_modules", 
      "public", 
      "build",
      "dist"
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      // Prettier integration
      "prettier/prettier": "error",
    },
    plugins: {
      prettier: require("eslint-plugin-prettier"),
    },
  },
];

export default eslintConfig;
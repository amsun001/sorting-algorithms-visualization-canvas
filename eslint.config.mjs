import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 0. IGNORE compiled folders and node_modules
  {
    ignores: ["build/**", "dist/**", "node_modules/**"]
  },

  // 1. Apply standard JS recommended rules
  js.configs.recommended,
  
  // 2. Apply TypeScript recommended rules
  ...tseslint.configs.recommended,
  
  // 3. Add your specific thesis rules for TypeScript files only
  {
    files: ["**/*.ts"],
    rules: {
      // Enforce your thesis constraint: NO 'any' types allowed!
      "@typescript-eslint/no-explicit-any": "error",
      
      // Optional but good for quality: warn on unused variables
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
);
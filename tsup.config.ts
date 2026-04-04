// tsup.config.ts
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"], // đổi từ esm sang cjs
  target: "node18",
  outDir: "dist",
  clean: true,
});
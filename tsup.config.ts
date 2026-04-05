import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/cli.ts"],
	format: ["cjs"], // dùng CommonJS để Node18 chạy tốt
	target: "node18",
	outDir: "dist",
	clean: true,
	bundle: true,
	minify: true,
	sourcemap: false,
	platform: "node",
});

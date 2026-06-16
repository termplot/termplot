// @ts-check
import { readFileSync } from "node:fs";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeShellTabs from "./plugins/rehype-shell-tabs.mjs";

// Tokyo Night Day is not a bundled Shiki theme (only `tokyo-night` is), so the
// light theme is vendored from the upstream VS Code theme. Read via fs so the
// config loader needs no JSON import attributes.
const tokyoNightDay = JSON.parse(
  readFileSync(new URL("./src/shiki/tokyo-night-day.json", import.meta.url), "utf8"),
);

export default defineConfig({
  output: "static",
  site: "https://termplot.com",
  // The dev toolbar is dev-server-only (never in builds), and unwanted
  // even there.
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      // /docs renders the same content as /docs/getting-started/ (which
      // carries the canonical); only the slug URL belongs in the sitemap.
      // No /docs page exists yet (experiment 1) — future-proofing.
      filter: (page) => page !== "https://termplot.com/docs/",
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    // Fenced markdown blocks (content collections). The CodeBlock wrapper
    // passes the same themes explicitly for page-level <Code> blocks.
    shikiConfig: {
      themes: { light: tokyoNightDay, dark: "tokyo-night" },
    },
    // Runs after Shiki: pairs adjacent bash+nu fences into shell tabs.
    rehypePlugins: [rehypeShellTabs],
  },
});

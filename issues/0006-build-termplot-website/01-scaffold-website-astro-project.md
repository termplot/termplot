# Experiment 1: Scaffold the website Astro project

## Description

Stand up the `website/` project that the rest of Issue 6 builds on, mirroring
the NuTorch website's stack (researched from `~/dev/nutorch/website`): Astro 6
static output, Tailwind CSS 4 configured inline via `@tailwindcss/vite`, Pagefind
search, `@astrojs/sitemap`, the Space Grotesk + JetBrains Mono fonts, the
paired-fence shell-tabs rehype plugin, and the brand-token CSS-variable theme
scaffold.

This experiment delivers only the scaffold: project config, the global stylesheet
with a placeholder TermPlot palette, a minimal `Base` layout carrying the
pre-paint theme/shell scripts, a placeholder home page, and the static assets
needed for a clean build. It deliberately does **not** include the logo
(Experiment 2), the full site chrome — Header/Footer/ThemeToggle/DocNav
(Experiment 3) — the real home page (Experiment 4), or the documentation
(Experiments 5–6). The goal is a project that installs, runs `dev`, and `build`s
cleanly so later experiments have a stable foundation.

### Toolchain decision

The website uses **bun** for install/scripts, matching NuTorch (which ships a
`bun.lock` and uses `bun run` scripts). This also keeps the site isolated from
the repo's pnpm root: the root `pnpm-workspace.yaml` defines no `packages:` glob,
so `website/` is not a pnpm workspace member, and bun ignores pnpm entirely. The
website carries its own `bun.lock` and `node_modules`.

### Deviations from NuTorch (intentional)

- Brand identity is TermPlot, not NuTorch: palette, wordmark colors, prose class
  name (`prose-termplot`), and site URL (`https://termplot.com`, placeholder for
  a not-yet-published site).
- The palette in this experiment is a **placeholder** TermPlot scheme; Experiment
  2 finalizes brand colors alongside the logo and rewrites these tokens.
- NuTorch-specific check/codegen scripts (`gen-ops-reference`, `check-mirror`,
  ops docs, etc.) are not ported; they describe NuTorch's tensor-ops domain.
- The logo/image pipeline (`scripts/process-images.ts`) is deferred to Experiment
  2, since it needs the SVG source. `Base` does not reference a favicon yet.

## Changes

New directory `website/` at the repo root.

### Project config

- `website/package.json` — `type: module`, private. Dependencies mirror NuTorch:
  `astro ^6.1.1`, `tailwindcss ^4.2.1`, `@tailwindcss/vite ^4.2.1`,
  `@astrojs/sitemap ^3.7.3`, `@fontsource/space-grotesk ^5.2.8`,
  `@fontsource/jetbrains-mono ^5.2.8`. Dev dependencies: `pagefind ^1.5.2`,
  `sharp ^0.34.5`, `png-to-ico ^3.0.1`, `wrangler ^4.100.0` (sharp/png-to-ico
  land now so Experiment 2's image pipeline needs no dependency change). Scripts:
  - `dev`: `astro dev`
  - `build`: `rm -rf node_modules/.astro .astro && astro build && pagefind --site dist`
  - `preview`: `astro preview`
  - `deploy`: `bun run build && wrangler pages deploy dist` (present for a future
    publish issue; not run here)
  - `build:images`: `bun run scripts/process-images.ts` — pre-declared here
    pointing at the image pipeline script that Experiment 2 creates. The script
    file does not exist yet and `build:images` is not part of `build`, so it is
    never invoked in this experiment; it is staged now so Experiment 2 adds only
    the script file, not a package.json change. (Added during completion review
    for record accuracy.)
- `website/astro.config.mjs` — imports the plugin at the top
  (`import rehypeShellTabs from "./plugins/rehype-shell-tabs.mjs";`) and the
  `@astrojs/sitemap` and `@tailwindcss/vite` integrations. Config:
  `output: "static"`, `site: "https://termplot.com"`,
  `devToolbar: { enabled: false }`, `sitemap({ filter })` removing the
  `https://termplot.com/docs/` index page (a no-op in this experiment since no
  `/docs/` page exists yet — future-proofing copied from NuTorch),
  `vite.plugins: [tailwindcss()]`, and `markdown` config with Shiki dual themes
  (`vitesse-light`/`vitesse-dark`) plus `rehypePlugins: [rehypeShellTabs]`.
- `website/tsconfig.json` — extends `astro/tsconfigs/strict`.
- `website/wrangler.toml` — `name = "termplot"`, `pages_build_output_dir = "dist"`.
- `website/.gitignore` — `node_modules/`, `dist/`, `.astro/`.
- `website/src/content.config.ts` — the `docs` collection (glob loader over
  `src/content/docs`, schema `{ title, description, order, section? }`), copied
  from NuTorch unchanged (domain-agnostic). The collection **definition** is in
  place but matches **zero markdown files** in this experiment; Astro's glob
  loader tolerates an empty match. No docs route file
  (`src/pages/docs/[...slug].astro`, which owns `getStaticPaths`) is created
  here — docs routes are deferred to Experiment 3. (`src/content.config.ts` is
  the modern Astro config path NuTorch already builds with.)

### Plugin

- `website/plugins/rehype-shell-tabs.mjs` — copied verbatim from NuTorch. It is
  generic (pairs adjacent `bash` + `nu` fences) with no project-specific content.

### Styles

- `website/src/styles/global.css` — adapted from NuTorch:
  - `@import "tailwindcss";`
  - `:root` and `:root[data-theme="dark"]` brand tokens with a **placeholder
    TermPlot palette** (finalized in Experiment 2).
  - `@theme inline` mapping tokens to Tailwind color/font utilities.
  - base `html`/`body`/`::selection` rules.
  - Shiki dual-theme glue, `.prose-termplot` documentation typography (renamed
    from `.prose-nutorch`), `.shell-tab*` classes, `.hero-glow`, Pagefind UI
    theming, theme-toggle icon visibility rules, and the Astrohacker footer
    light/dark variant rules. Selectors that referenced `.prose-nutorch` become
    `.prose-termplot`; all other rules are brand-agnostic.

### Layout and pages (minimal, placeholder)

- `website/src/layouts/Base.astro` — **must import** the fonts and global
  stylesheet at the top of the frontmatter, exactly as NuTorch does, so tokens
  and fonts actually apply:
  ```astro
  import "@fontsource/space-grotesk/500.css";
  import "@fontsource/space-grotesk/700.css";
  import "@fontsource/jetbrains-mono/400.css";
  import "../styles/global.css";
  ```
  Head contains `<title>`, `<meta name="description">`, and the OpenGraph/Twitter
  tags `og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`
  (`"TermPlot"`), and `twitter:card`. **`og:image` and the favicon `<link>` are
  omitted in this experiment** because their raster assets are produced in
  Experiment 2; both are added once the logo pipeline exists. Head also carries
  the two `is:inline` pre-paint scripts (theme setting/resolved-mode with live
  `matchMedia` tracking; shell preference). Body renders `<slot />` plus the
  delegated shell-tabs runtime `<script>`. **No** Header/Footer yet (added in
  Experiment 3). This keeps the theme foundation in place from the start while
  leaving chrome to later experiments.
- `website/src/pages/index.astro` — a minimal placeholder home page using `Base`
  with a single heading and paragraph, enough for a non-empty build. Replaced
  wholesale by Experiment 4.
- `website/public/robots.txt` — `User-agent: * / Allow: /` plus the
  `https://termplot.com/sitemap-index.xml` sitemap line.
- `src/pages/404.astro` — **deferred to Experiment 3** (needs the logo and
  chrome); not created here.

No documentation pages or docs routes are created in this experiment. The `docs`
collection definition exists but matches no files, and no `src/pages/docs/*`
route exists yet; both the docs routes and `getStaticPaths` arrive in Experiment
3/5, so the empty collection cannot break this build.

## Verification

Run from `website/`:

1. **Install:** `bun install` completes without error and writes `bun.lock`.
2. **Build:** `bun run build` completes without error; Astro builds and Pagefind
   indexes `dist` without failing.
3. **Build output present:** `dist/index.html` exists and contains the
   placeholder home heading; `dist/sitemap-index.xml` exists; `dist/pagefind/`
   exists.
4. **Theme script present:** `dist/index.html` contains the pre-paint theme
   `is:inline` script (grep for `prefers-color-scheme`), confirming the theme
   foundation ships in built output.
5. **Dev server smoke:** `astro dev` starts and serves the home page (bounded
   check: start the dev server in the background, poll the local URL for HTTP
   200, then stop it; attribute and clean up only the dev-server process this
   step launched).
6. **No stray processes:** the dev-server smoke leaves no test-owned process
   running.

**Pass criteria:** install, build, and the dev smoke all succeed; `dist/`
contains the expected files; the theme script is present in built HTML.
**Fail:** any install/build error, missing build artifacts, or a dev server that
never serves 200.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill. The reviewer read
`AGENTS.md`, the issue README, this experiment file, and the NuTorch reference
stack.

**Initial verdict:** REJECT, with 2 Major and 5 Minor findings (no Blockers). The
findings flagged under-specification, not technical defects:

- Major 1: Base.astro did not explicitly list the font/global-CSS imports, so an
  implementer could ship an unstyled site.
- Major 2 / Minor 1: the empty-docs-collection wording overstated certainty and
  conflated a non-existent `getStaticPaths` with the deferred docs route.
- Minor 2: sitemap `/docs/` filter is a no-op this stage (note as future-proofing).
- Minor 3: OG meta tags unenumerated; `og:image` referenced a not-yet-built asset.
- Minor 4: 404.astro deferral not stated.
- Minor 5: astro.config plugin import not made explicit.

The reviewer confirmed the bun-vs-pnpm isolation reasoning is sound, the scope is
appropriately narrow for stage 1, workflow compliance is correct, and the
verification criteria are adequate.

**Fixes applied:** the Changes section now spells out the Base.astro font +
`global.css` imports, enumerates the OG/Twitter tags and explicitly defers
`og:image` and the favicon to Experiment 2, clarifies that the docs collection is
empty with its route deferred to Experiment 3, makes the astro.config plugin
import explicit, notes the sitemap filter as future-proofing, and records the
404.astro deferral. No Blockers were raised; with the Major findings addressed
the design is approved for implementation.

## Result

**Result:** Pass

Scaffolded `website/` and verified end to end:

- `website/` created with `package.json`, `astro.config.mjs`, `tsconfig.json`,
  `wrangler.toml`, `.gitignore`, `src/content.config.ts`,
  `plugins/rehype-shell-tabs.mjs` (verbatim copy), `src/styles/global.css`
  (TermPlot placeholder palette + `prose-termplot`), `src/layouts/Base.astro`
  (theme/shell pre-paint scripts, no chrome), `src/pages/index.astro`
  (placeholder), and `public/robots.txt`.
- **Install:** `bun install` resolved 311 packages and wrote `bun.lock`.
  Resolved versions floated up within the declared ranges (Astro 6.4.7,
  Tailwind 4.3.1, sitemap 3.7.3, fonts 5.2.x, Pagefind 1.5.2) — all compatible.
- **Build:** `bun run build` succeeded — Astro built `/index.html`, the sitemap
  integration emitted `sitemap-index.xml`, and Pagefind indexed `dist` without
  error. (Pagefind warned "Did not find a data-pagefind-body element" and
  indexed the whole `<body>`; expected at this stage — the `data-pagefind-body`
  marker arrives with the docs layout in Experiment 3.)
- **Artifacts:** `dist/index.html`, `dist/sitemap-index.xml`, and
  `dist/pagefind/` all present.
- **Theme foundation ships:** `dist/index.html` contains the pre-paint theme
  `is:inline` script (grep for `prefers-color-scheme` matched), and the
  placeholder `TermPlot` heading is in the built HTML.
- **Dev smoke:** `astro dev` on port 4329 served HTTP 200 (after ~4 polls); the
  test killed only the dev-server process tree it launched, and the port was
  confirmed clear afterward with no stray `astro dev` process remaining.

All pass criteria met; no fail conditions hit.

## Conclusion

The NuTorch stack ports cleanly to TermPlot: Astro 6 static + Tailwind 4 inline
theme + Pagefind + sitemap + the shell-tabs rehype plugin all build with bun,
fully isolated from the repo's pnpm root (no `packages:` glob captured
`website/`). The empty docs collection built without issue, confirming docs
routes can safely be deferred. The two-layer theme foundation is in built output
from the start.

Next, **Experiment 2** designs the TermPlot SVG logo and final brand palette,
then builds it to PNG for the favicon (`favicon.ico` may be a PNG), the favicon
sizes, and the OG image, and replaces the placeholder tokens in `global.css`.
The `sharp` + `png-to-ico` dev dependencies are already installed so the image
pipeline needs no dependency change. Experiment 2 also adds the `og:image` and
favicon `<link>` to `Base.astro` that were intentionally deferred here.

## Completion Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill. The reviewer read
`AGENTS.md`, the issue README, this experiment file, and the scaffold under
`website/`, and independently re-ran `bun run build` and grepped the built HTML.

**Verdict:** APPROVE — no Blockers, no Majors. One Minor finding: the
`build:images` script in `package.json` was not listed in the plan's Changes
section. Fixed by documenting it above (it is pre-declared, points at the
Experiment 2 script, and is never invoked here). The reviewer independently
confirmed the build succeeds, the theme script ships in `dist/index.html`,
branding is TermPlot (`prose-termplot`, `termplot.com`, placeholder palette, no
NuTorch strings), deferred items (logo/chrome/docs/404) are correctly absent,
`git diff --check` passes, and no result commit existed at review time.

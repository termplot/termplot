# Experiment 3: Site chrome and docs infrastructure

## Description

Build the shared site chrome and the documentation infrastructure on top of the
Experiment 1 scaffold and the Experiment 2 logo/brand. This is Stage 3 of the
Issue 6 roadmap. After this experiment the site has a real header, footer, theme
toggle, and a working `/docs/` system with a sidebar, per-page search, and
prev/next navigation — ready for the home page (Experiment 4) and the full
documentation content (Experiments 5–6).

This experiment ports NuTorch's chrome and docs components, rebranded for
TermPlot, and adds a single placeholder docs entry so the docs routes build. The
real documentation content is deliberately deferred to Experiments 5–6; the
placeholder entry exists only to exercise the route and search wiring.

### Branding / external links

- GitHub link target: `https://github.com/astrohacker/termplot` (the project's
  declared `homepage`/`repository` in the repo's `package.json`).
- Footer attribution: **"An Astrohacker Project"** linking to
  `https://astrohacker.com`, mirroring NuTorch, using the shared Astrohacker
  brand marks.

## Changes

### Astrohacker footer assets

- Copy the four shared Astrohacker brand marks from NuTorch into
  `website/public/images/`, explicitly from
  `/Users/astrohacker/dev/nutorch/website/public/images/astrohacker-6-{light,dark}-{32,64}.webp`:
  `astrohacker-6-light-32.webp`, `astrohacker-6-light-64.webp`,
  `astrohacker-6-dark-32.webp`, `astrohacker-6-dark-64.webp`. These are the same
  Astrohacker identity used by
  sibling projects; the footer CSS already added in Experiment 1
  (`.astrohacker-light` / `.astrohacker-dark` visibility rules keyed on
  `data-theme`) consumes them.

### Components

- `website/src/components/ThemeToggle.astro` — the system/light/dark cycle button
  with three inline `currentColor` SVG icons (monitor/sun/moon) and the cycling
  click script that updates `data-theme-setting`, resolves `data-theme`, and
  persists to `localStorage`. Ported from NuTorch unchanged (brand-agnostic).
- `website/src/components/Header.astro` — sticky top bar: the TermPlot mark
  (`/images/termplot-mark-64.png` with a 2x srcset to `-128.png`) + the wordmark,
  and a nav with **Docs**, **GitHub** (the URL above), and `<ThemeToggle />`.
  **Wordmark colors:** "Term" uses `text-primary` (teal) and "Plot" uses
  `text-plot` (amber) — matching the logo and OG card. (Do **not** use
  `text-accent`: `--accent` is the warmer rust used for hover/UI, not the amber
  plot color. `--color-plot` is already exposed as the `text-plot` utility via
  `@theme inline` in `global.css`, so no palette change is needed.)
- `website/src/components/Footer.astro` — TermPlot · MIT + mark, a GitHub link,
  and the **"An Astrohacker Project"** row linking to `https://astrohacker.com`
  with the light/dark Astrohacker marks and a copyright line. Adapted from
  NuTorch with TermPlot name/URL.
- `website/src/components/CodeBlock.astro` — the Shiki `<Code>` wrapper baking in
  the dual `vitesse-light`/`vitesse-dark` themes (ported unchanged from NuTorch;
  brand-agnostic). Used by the home page (Experiment 4) and any page-level code
  fences; included now so the component set is complete.
- `website/src/components/DocNav.astro` — the docs sidebar: sections (by
  first-appearance order) with per-entry links, `aria-current` on the active
  page (ported unchanged; brand-agnostic).
- `website/src/components/DocPage.astro` — the docs layout: wraps `Base`, builds
  the section tree from the `docs` collection, renders the `DocNav` (mobile
  `<details>` + desktop block), the Pagefind search mount (`#docs-search`,
  `data-pagefind-body` on the article), the page `<h1>` + `<slot/>`, and
  prev/next links. Adapted from NuTorch; the page title suffix becomes
  "— TermPlot docs" and the `.prose-nutorch` class becomes `.prose-termplot`.

### Pages

- `website/src/pages/docs/[...slug].astro` — dynamic docs route; `getStaticPaths`
  over the `docs` collection, renders each entry through `DocPage` (ported
  unchanged).
- `website/src/pages/docs/index.astro` — renders the `getting-started` entry
  directly with `canonical="/docs/getting-started/"` (ported unchanged).
- `website/src/pages/404.astro` — a TermPlot-themed 404 using `Base` and the
  mark `<img src="/images/termplot-mark-192.png">`, with Home/Docs links (adapted
  from NuTorch; TermPlot copy; wordmark/accent per the same token rules above).

### Content (placeholder, replaced in Experiments 5–6)

- `website/src/content/docs/getting-started.md` — a minimal placeholder entry
  with valid frontmatter (`title: "Getting started"`, a `description`,
  `order: 1`, `section: "Start"`) and a few lines of body. Exists so the docs
  route, `docs/index.astro` (`getEntry("docs", "getting-started")`), DocNav, and
  Pagefind all have something to render. Real content lands in Experiments 5–6.

### Layout wiring

- `website/src/layouts/Base.astro` — import and render `<Header />` above the
  `<main>` slot and `<Footer />` below it (the body already has the shell-tabs
  runtime script). No other changes.

## Verification

Run from `website/`:

1. **Build:** `bun run build` succeeds; Pagefind now finds a `data-pagefind-body`
   element (the docs article) and indexes the docs page without the
   "Did not find a data-pagefind-body" warning escalating to an error.
2. **Routes built:** `dist/docs/getting-started/index.html` and
   `dist/docs/index.html` exist; `dist/404.html` exists.
3. **Chrome present in output:** `dist/index.html` contains the header mark, the
   `theme-toggle` button (grep `id="theme-toggle"`), and the footer string
   **"An Astrohacker Project"** with a link to `https://astrohacker.com`; the
   GitHub link points to `https://github.com/astrohacker/termplot`.
4. **Docs chrome present:** `dist/docs/getting-started/index.html` contains the
   `DocNav` sidebar links and the `#docs-search` Pagefind mount.
5. **Astrohacker assets present:** the four `astrohacker-6-*.webp` files exist in
   `dist/images/`.
6. **Theme toggle visual (both themes):** start the website dev server from
   `website/` (bounded, attributed cleanup as in Experiment 1). Then run a
   **throwaway screenshot script from the repo root**
   (`/Users/astrohacker/dev/termplot`, cwd = root, where Playwright 1.60.0 +
   Firefox 150 resolve from the root `node_modules` — verified available; the
   website's bun project does **not** get Playwright added to it). The script
   launches Firefox (Chromium can't launch in this macOS automation session per
   Issue 5), and for each of the home page and the docs page, forces the theme by
   setting `localStorage.theme` to `light` then `dark` via `addInitScript` before
   navigation (the pre-paint script reads `localStorage`), and writes the four
   screenshots to `/tmp`. **Visually inspect** them to confirm the header, footer
   ("An Astrohacker Project"), theme toggle, logo, and docs sidebar render
   correctly and legibly in both themes. The throwaway script lives at the repo
   root (so module resolution works) and is **deleted** afterward — it is never
   committed.
7. **No stray processes / files:** stop the dev-server and ensure no Firefox/
   browser process this step launched remains; delete the `/tmp` shots and the
   root screenshot script; confirm `git status` shows only the intended
   experiment outputs (no stray scripts or artifacts).

**Pass criteria:** build succeeds with all routes; the chrome and docs infra are
present in built HTML; the four Astrohacker assets ship; the visual check shows a
correct, legible header/footer/toggle/sidebar in both light and dark; cleanup
leaves no stray processes or files.
**Fail:** build error, a missing route/asset, broken chrome in either theme, or
stray artifacts/processes.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, against `AGENTS.md`,
the issue README, this design, prior experiments, the NuTorch component
reference, and the current scaffold.

**Initial verdict:** REJECT — 2 Blockers, 2 Major, 2 Minor. The reviewer
confirmed the route/collection wiring is sound (the placeholder `getting-started`
entry satisfies both `getStaticPaths` and `docs/index.astro`'s `getEntry`), the
rebrand is correct, and the footer CSS already in `global.css` matches the
planned markup classes.

- Blocker 1: the Header wordmark used `text-primary`/`text-accent`, but `--accent`
  is rust (`#d9610f`), not the amber `--plot` — the wordmark would render
  off-brand.
- Blocker 2: the visual step said to use the root Playwright from the bun-isolated
  website context, which is ambiguous; Playwright isn't a website dependency.
- Major 1: the 404 image path wasn't specified.
- Major 2: CodeBlock was named but not given its own Changes bullet.
- Minor 1/2: cleanup wording for the screenshot script was vague; the Astrohacker
  asset copy lacked explicit source paths.

**Fixes applied:** the Header wordmark now uses `text-primary` (teal) + `text-plot`
(amber) with an explicit note that no palette change is needed (`text-plot` is
already exposed via `@theme inline`); the visual step now runs a throwaway
screenshot script **from the repo root** where Playwright 1.60 + Firefox 150
resolve (verified launchable — `firefox launch OK 150.0.2`) and forces the theme
via `localStorage` + `addInitScript`, with explicit deletion and process cleanup;
the 404 image path (`termplot-mark-192.png`) is specified; CodeBlock has its own
bullet; and the Astrohacker copy names exact source paths. With both Blockers
resolved the design is approved for implementation.

## Result

**Result:** Pass

- **Components:** added `Header.astro` (mark + "Term"/"Plot" wordmark in
  `text-primary`/`text-plot`, Docs/GitHub nav, ThemeToggle), `Footer.astro`
  ("An Astrohacker Project" → astrohacker.com with light/dark marks, TermPlot ·
  MIT, GitHub link, copyright), `DocPage.astro` (`prose-termplot`, "— TermPlot
  docs" title, DocNav + Pagefind mount + prev/next), and copied the
  brand-agnostic `ThemeToggle.astro`, `CodeBlock.astro`, `DocNav.astro` from
  NuTorch.
- **Pages:** `src/pages/docs/[...slug].astro` and `docs/index.astro` (ported),
  `404.astro` (TermPlot copy, `termplot-mark-192.png`). Wired `<Header/>` +
  `<Footer/>` into `Base.astro`.
- **Assets:** the four `astrohacker-6-{light,dark}-{32,64}.webp` copied into
  `public/images/`.
- **Content:** placeholder `getting-started.md` (Start, order 1).
- **Build:** `bun run build` succeeds; Pagefind now reports "Found a
  data-pagefind-body element" and indexes the docs page (59 words). Routes
  `dist/index.html`, `dist/docs/index.html`,
  `dist/docs/getting-started/index.html`, and `dist/404.html` all built.
- **Structural checks:** home HTML has the `theme-toggle` button, "An Astrohacker
  Project" + the astrohacker.com link, the GitHub link
  (`github.com/astrohacker/termplot`), the header mark, and the teal+amber
  wordmark; the docs page has the `#docs-search` mount and DocNav links; the four
  astrohacker webp ship in `dist/images/`.
- **Visual check (both themes):** started the website dev server (port 4330) and
  ran a throwaway Firefox screenshot script **from the repo root** (root
  Playwright 1.60 + Firefox 150), forcing `localStorage.theme` to light then dark
  via `addInitScript`, capturing the home and docs pages. Inspected all four: the
  header (logo + teal/amber wordmark), the theme toggle (sun in light, moon in
  dark), the docs sidebar ("START / Getting started", active in teal), the prose,
  and the footer ("An Astrohacker Project" with the correct light/dark Astrohacker
  mark variant) all render correctly and legibly in both themes. The toggle icon
  and the Astrohacker mark variant both track `data-theme` as intended.
- **Hygiene:** stopped the dev server, removed the root `shot.mjs` and the `/tmp`
  shots; no stray `astro dev`/Firefox process and port 4330 clear; `git status`
  shows only intended outputs; `git diff --check` clean.

All pass criteria met; no fail conditions hit.

## Conclusion

The site now has full chrome and a working docs system: header, theme toggle
(system/light/dark, persisted, pre-paint), footer with Astrohacker attribution,
and a `/docs/` route with sidebar, Pagefind search, and prev/next — all verified
legible in both themes via real Firefox screenshots. The brand wordmark renders
teal+amber consistent with the logo.

Next, **Experiment 4** replaces the placeholder `index.astro` with the real home
page: hero (logo + pitch + a terminal-rendered example using the shell-tabs +
CodeBlock components), an install section (aspirational Homebrew, finalized in
Experiment 6), and a feature grid — mirroring NuTorch's `index.astro` shape with
TermPlot content. The placeholder home's `text-accent` wordmark is corrected to
`text-plot` there.

## Completion Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill. The reviewer read
`AGENTS.md`, the issue README, this experiment file, and the implementation;
independently re-ran `bun run build`; and grepped the components for leaked
NuTorch strings.

**Verdict:** APPROVE — no Blockers, no Majors, no Minors. The reviewer confirmed
the build succeeds with all routes, Pagefind reports "Found a data-pagefind-body
element" (59 words indexed), the four Astrohacker webp assets ship to
`dist/images/`, the Header wordmark uses `text-primary` + `text-plot` (no
`text-accent`), the Footer attribution and links are correct, DocPage uses
`prose-termplot` + the "— TermPlot docs" title, there are zero `nutorch`/
`NuTorch`/`prose-nutorch` strings in `website/src`, `git status` shows only
intended outputs with no stray `shot.mjs` or `/tmp` artifacts, `git diff --check`
is clean, and the exp 3 plan commit exists with no result commit yet.

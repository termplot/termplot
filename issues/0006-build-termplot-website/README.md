+++
status = "open"
opened = "2026-06-16"
+++

# Issue 6: Build the TermPlot website

## Goal

Build a complete documentation and marketing website for TermPlot that mirrors
the NuTorch website's tech stack, supports light/dark/system themes, ships a
purpose-designed SVG logo that works in both themes, fully documents TermPlot,
and carries an "An Astrohacker Project" footer. The site is built and verified
locally only; it is not deployed or published in this issue.

## Background

TermPlot v1 shipped in Issue 5 as a macOS-focused TypeScript/Node tool:

- `termplotd`: a detached local daemon with socket IPC, a one-hour default idle
  TTL, lifecycle commands, an in-memory plot registry, a React Router/Express
  app, and a warm Playwright Firefox browser renderer.
- `termplot`: a CLI that reads Plotly JSON from an argument, file, or stdin,
  auto-starts or reuses `termplotd`, writes PNG files with `--output`, and emits
  terminal image bytes (Kitty graphics for Ghostty, OSC 1337 for iTerm2) when no
  output file is requested.
- `termplot.nu`: a thin Nushell wrapper that sources as `termplot`, accepts
  pipeline values, returns binary PNG by default, and shares the same daemon.

The project now needs a public-facing website. The sibling project NuTorch
(`~/dev/nutorch`) already has a polished website whose stack we want to mirror
faithfully, with two deliberate deviations: TermPlot has no logo yet (so this
issue designs an original SVG logo), and the logo must be a single themeable SVG
rather than NuTorch's separate light/dark PNG variants.

### NuTorch website stack (the model to mirror)

Researched from `~/dev/nutorch/website`:

- **Framework:** Astro `^6.1.1`, `output: "static"`, `site` set in
  `astro.config.mjs`.
- **Styling:** Tailwind CSS `^4.2.1` via `@tailwindcss/vite`, configured inline
  with the `@theme inline` syntax in `src/styles/global.css` (no separate
  Tailwind config file). Brand tokens are CSS variables on `:root` that swap
  under `:root[data-theme="dark"]`.
- **Fonts:** `@fontsource/space-grotesk` (display) and
  `@fontsource/jetbrains-mono` (mono).
- **Search:** `pagefind` indexes `dist` after build
  (`astro build && pagefind --site dist`).
- **Theme system:** a two-layer model set before first paint by a head script in
  `Base.astro`. A `theme` setting (`system|light|dark`) is stored in
  `localStorage`; a resolved `data-theme` (`light|dark`) is derived from the
  setting or, in system mode, from `matchMedia("(prefers-color-scheme: dark)")`,
  which is tracked live. `ThemeToggle.astro` cycles
  `system -> light -> dark -> system` with inline `currentColor` SVG icons.
- **Content:** Markdown in an Astro content collection
  (`src/content/docs/`) with frontmatter `{ title, description, order, section }`.
  Pages render through `src/pages/docs/[...slug].astro`; `/docs/` redirects to
  the canonical first page. A `DocNav.astro` sidebar groups by `section` and
  sorts by `order`.
- **Shell tabs:** a custom rehype plugin (`plugins/rehype-shell-tabs.mjs`) turns
  consecutive bash + nushell code fences into an accessible tablist. Shiki
  handles syntax highlighting with paired light/dark themes.
- **Footer:** `Footer.astro` shows the project name + license, a GitHub link,
  and an `https://astrohacker.com` link reading **"An Astrohacker Project"**
  with light/dark brand marks, plus a copyright line.
- **Deployment:** Cloudflare Pages via `wrangler.toml`
  (`pages_build_output_dir = "dist"`); `@astrojs/sitemap` + `robots.txt` for SEO.
  Deployment is out of scope for this issue but the config should be present and
  correct so a later issue can publish.

Directory layout to mirror under `website/`:

```text
website/
|-- public/            # favicon, images, robots.txt
|-- src/
|   |-- components/    # Header, Footer, ThemeToggle, DocNav, CodeBlock, ...
|   |-- content/docs/  # markdown docs + frontmatter
|   |-- layouts/Base.astro
|   |-- lib/           # install snippet source, shared helpers
|   |-- pages/         # index.astro, docs/[...slug].astro, 404.astro
|   |-- styles/global.css
|   `-- content.config.ts
|-- astro.config.mjs
|-- package.json
`-- wrangler.toml
```

## Proposed Solution

Create a `website/` directory at the repository root that mirrors the NuTorch
Astro + Tailwind 4 + Pagefind stack, themed with a TermPlot brand palette,
fronted by an original SVG logo, and filled with complete TermPlot
documentation.

### Brand and logo

- Design a single **SVG logo** that reads well at favicon size and hero size and
  works on both light and dark backgrounds. Theme-sensitive parts use
  `currentColor` or CSS variables; brand accent colors are chosen to hold
  contrast on both `light` and `dark` surfaces, so one file serves both themes
  (no separate light/dark variants).
- Logo concept space (to settle in the design experiment): TermPlot is
  "terminal" + "plot". Candidate motifs include a terminal prompt glyph paired
  with a plotted line/sparkline, a chart curve framed inside a terminal window,
  or axis ticks rendered as a prompt. The chosen mark should feel technical and
  clean, echoing NuTorch's quality without copying its nautilus-and-flame motif.
- Derive a TermPlot brand palette (primary + accent + surfaces) and wire it into
  `global.css` as CSS variables for both themes, the same way NuTorch maps logo
  colors to tokens.
- The SVG is the source of truth for the mark. Build it to PNG for the raster
  assets the site needs: `favicon.ico` (which may simply be a PNG file — a PNG
  served at the `favicon.ico` path is valid and accepted by browsers), plus any
  additional PNG favicon sizes and the OpenGraph image. Add a build/export step
  (or a script) that rasterizes the SVG to these PNGs so the favicon and OG
  image stay in sync with the SVG source.

### Documentation scope (full coverage of TermPlot)

Mirror NuTorch's content-collection structure. Planned docs (final set settled
during experiments):

- **Start:** What TermPlot is and how it works (daemon + warm browser + terminal
  image protocols); install (aspirational Homebrew, see below); quick start
  (first plot in Ghostty/iTerm2).
- **CLI reference:** `termplot render` with input via argument, `--file`,
  `--json`, and stdin; `--output`, `--protocol`
  (`auto|kitty|iterm2|sixel`-status), `--socket`, `--ttl-ms`, `--timeout-ms`,
  `--log`; `termplot plots list|register|get|delete|render-png|clear`.
- **Daemon:** `termplot daemon status|start|stop|restart|ttl|renew`; idle TTL
  semantics and precedence (`--ttl-ms` > `TERMPLOTD_TTL_MS` > 1 hour); socket
  path defaults and cleanup; the warm renderer and reuse timing benefit.
- **Terminals & protocols:** Ghostty via Kitty graphics, iTerm2 via OSC 1337,
  SIXEL proven-but-deferred, auto-detection rules, and manual override.
- **Plotly input:** the JSON shape, `layout.width`/`layout.height`, default
  dimensions, `staticPlot`, and worked examples.
- **Nushell:** `source termplot.nu`, pipeline record/table input, default binary
  PNG output, `--output`, `--display`, and daemon flags.
- **Requirements & limitations:** Node `>=24`, Playwright Firefox, macOS Screen
  Recording permission for terminal probes, macOS-only v1, in-memory plots, no
  text fallback.
- **Home page:** hero with logo, a one-line pitch, a terminal-rendered example,
  and a short feature grid — mirroring NuTorch's `index.astro` shape with
  TermPlot content.

Documentation must be accurate to the shipped code (CLI flags, daemon methods,
detection logic), not aspirational — with the single explicit exception of
installation.

### Aspirational installation

- Document installation as **Homebrew on macOS only**:
  `brew install termplot` (or a tap, e.g. `brew install astrohacker/tap/termplot`
  — exact form decided in an experiment). State clearly that macOS is the only
  supported platform at this time.
- It is acceptable that the Homebrew formula does not exist yet; the website
  documents the intended install path. A real "install from source" path
  (`pnpm install && pnpm run playwright:install && pnpm run build`) should also
  be documented as the currently-working route, mirroring NuTorch's
  "install from source" page.

### Shell examples

Use the bash/nushell shell-tabs treatment for any command that has both a plain
shell and a Nushell form, reusing NuTorch's rehype plugin approach.

### Footer and attribution

Footer reads **"An Astrohacker Project"** linking to `https://astrohacker.com`,
plus the TermPlot name, license, and a GitHub link, matching NuTorch's footer
structure and the Astrohacker brand marks.

## Stage Checklist

A roadmap, not permission to implement everything in one experiment. Experiments
iterate through these in order, each designed, reviewed, implemented, and
concluded before the next.

- [ ] Stage 1: Scaffold the `website/` Astro project mirroring NuTorch's stack
      (Astro 6, Tailwind 4 inline theme, fonts, Pagefind, sitemap, wrangler
      config) and confirm a clean `dev` and `build`.
- [ ] Stage 2: Design the TermPlot SVG logo and brand palette; produce the
      single themeable SVG, then build it to PNG for `favicon.ico` (a PNG at the
      `favicon.ico` path is acceptable), the other PNG favicon sizes, and the OG
      image; wire brand tokens into `global.css`.
- [ ] Stage 3: Build the shared layout and chrome — `Base.astro` with the
      pre-paint theme script, `Header`, `Footer` ("An Astrohacker Project"),
      `ThemeToggle` (system/light/dark), and the docs `DocNav` + content
      collection config.
- [ ] Stage 4: Write the home page (hero, pitch, terminal example, feature
      grid).
- [ ] Stage 5: Write the full documentation set (start, CLI, daemon, terminals
      & protocols, Plotly input, Nushell, requirements & limitations), with
      bash/nushell shell tabs.
- [ ] Stage 6: Document installation aspirationally (Homebrew on macOS) plus a
      working install-from-source page.
- [ ] Stage 7: Verify — `build` succeeds, Pagefind index generates, theme
      toggle works across system/light/dark, the logo renders correctly in both
      themes at favicon and hero sizes, internal links resolve, and content is
      accurate to the shipped CLI/daemon behavior. Do not deploy.

## Constraints

- Mirror the NuTorch website stack and structure; deviate only where this issue
  states (single themeable SVG logo instead of dual PNGs; TermPlot brand and
  content; Homebrew-on-macOS install story).
- Do not deploy or publish the site in this issue. Build and verify locally only.
- Documentation must match the shipped TermPlot code, except installation, which
  is explicitly aspirational (Homebrew, macOS only).
- Support light, dark, and system themes with pre-paint resolution and
  `localStorage` persistence, as NuTorch does.
- The logo must be a single SVG that works in both light and dark themes.
- The footer must read "An Astrohacker Project" and link to the Astrohacker
  site.
- Keep `CLAUDE.md` as a symlink to `AGENTS.md` wherever agent docs are added
  under `website/`.
- Do not copy NuTorch's logo, copy, or domain. Reuse stack and structure, not
  brand identity.
- macOS is the only supported platform messaging for v1; do not imply other
  platforms are available.

## Verification Strategy

Issue 6 closes when:

1. `website/` builds cleanly with the mirrored Astro + Tailwind 4 + Pagefind
   stack and a local `dev` server runs.
2. Light, dark, and system themes all resolve correctly with no flash of the
   wrong theme on load, and the toggle cycles and persists.
3. The TermPlot SVG logo renders correctly in both themes at favicon and hero
   sizes, and the SVG is built to PNG for `favicon.ico` (PNG acceptable at that
   path), the PNG favicon sizes, and the OG image.
4. The documentation fully covers TermPlot — CLI, daemon, terminals/protocols,
   Plotly input, Nushell, requirements, and limitations — and is accurate to the
   shipped code.
5. Installation is documented as Homebrew on macOS (aspirational), alongside a
   working install-from-source path, with macOS stated as the only supported
   platform.
6. The footer reads "An Astrohacker Project" and links to the Astrohacker site.
7. Internal links resolve and the Pagefind search index builds.
8. The site is not deployed.

The conclusion should summarize the delivered site structure, the logo and brand
decisions, documentation coverage, known gaps, and the follow-up issue needed to
publish.

## Experiments

- [Experiment 1: Scaffold the website Astro project](01-scaffold-website-astro-project.md) -
  **Pass**

# Experiment 7: Full verification

## Description

The final stage of Issue 6: verify the whole TermPlot website end to end so the
issue can close. This experiment adds no features. It does a clean-room build, a
whole-site link check, a rigorous light/dark/system theme verification (including
no-flash and live OS-preference tracking), a favicon/OG asset check, and a
content sanity pass — then confirms the site is correct **locally and not
deployed**.

If verification surfaces a real defect, it is fixed here (small, in-scope fixes)
and re-verified; the experiment records what was found.

## Verification

All from `website/` unless noted. Use the repo-root Firefox screenshot/asserts
script pattern from Experiments 3–6 (cwd = repo root, Playwright + Firefox),
deleting any throwaway script and `/tmp` artifacts afterward.

### 1. Clean-room build

- Remove `node_modules`, `dist`, and `.astro`, then `bun install` and
  `bun run build` from scratch. The build must succeed with no errors, proving
  the committed sources build cleanly without leftover state. Confirm the page
  count and that Pagefind indexes the docs.

### 2. Routes and structure

- Confirm every expected route built: `/`, `/404.html`, `/docs/` and all eight
  docs slugs (getting-started, installation, cli, daemon, terminals, plotly,
  nushell, requirements), plus `sitemap-index.xml`, `robots.txt`, and the
  `pagefind/` directory.

### 3. No broken internal links

- Extract every internal `href="/..."` from all built HTML and resolve each to a
  built file. Zero broken links. Also confirm the Pagefind index exists
  (`dist/pagefind/pagefind.js` and the `dist/pagefind/index/` fragment files).

### 4. Theme: light / dark / system (the core requirement)

Using Firefox contexts that emulate `prefers-color-scheme` and seed
`localStorage`, assert the resolved `data-theme` on `<html>` immediately after
load (this is what the pre-paint inline script sets, so a correct value proves
no wrong-theme flash):

- system + OS light → `data-theme="light"`, `data-theme-setting="system"`.
- system + OS dark → `data-theme="dark"`, `data-theme-setting="system"`.
- `localStorage.theme=light` + OS dark → `data-theme="light"` (explicit wins).
- `localStorage.theme=dark` + OS light → `data-theme="dark"` (explicit wins).
- Live tracking: in system mode, calling `page.emulateMedia({ colorScheme })` to
  change `prefers-color-scheme` flips `data-theme` without reload (exercises the
  `matchMedia` change listener).
- The toggle cycles system → light → dark and persists to `localStorage`
  (click it and assert the attribute + storage).

Also capture a light and a dark screenshot of the home page and **visually
confirm** there is no obviously wrong-themed chrome.

### 5. Favicon and OG assets

- `dist/favicon.ico`, `dist/images/og-termplot.png`, and
  `dist/images/termplot-mark.svg` exist; a built page's `<head>` contains the
  `favicon.ico` link, the `image/svg+xml` icon link, and the `og:image` meta
  pointing at `/images/og-termplot.png`.

### 6. Content sanity

- The footer "An Astrohacker Project" → `astrohacker.com` appears site-wide; the
  home page shows the Homebrew install and the bash/Nushell demos; the docs
  cover CLI, daemon, terminals, Plotly, Nushell, requirements, and installation.
- Re-confirm there are no leaked `nutorch`/`NuTorch`/`prose-nutorch`/`nutorch.com`
  strings anywhere in `website/src`.

### 7. Not deployed; clean

- Confirm no deploy was run (the site exists only as local `dist/`).
- Confirm cleanup: no stray dev-server/Firefox processes from this experiment,
  no `/tmp` artifacts, no throwaway scripts committed, and `git diff --check`
  clean.

**Pass criteria:** clean-room `bun install` + `bun run build` succeed; all routes
build; zero broken links; all six theme assertions hold (light/dark/system, no
wrong-theme flash, live tracking, toggle persistence); favicon/OG assets and head
links present; content is complete and free of NuTorch leakage; the site is not
deployed; cleanup is clean.
**Fail:** any build error, missing route/asset, broken link, a theme that
resolves wrong or flashes, NuTorch leakage, or stray artifacts/processes.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, against `AGENTS.md`,
the issue README's closure checklist, this design, and the live site (Base.astro
pre-paint script, ThemeToggle.astro, global.css).

**Verdict:** APPROVE — no Blockers or Majors, 2 Minor polish notes. The reviewer
mapped all eight issue closure requirements to this plan's sections (build,
theme/no-flash, logo+favicon/OG, full docs, install, footer attribution,
links+Pagefind, not-deployed) and found no gaps; confirmed the pre-paint script
sets `data-theme` synchronously in `<head>` before body paint (so asserting
`data-theme` after load is a valid no-flash proxy); confirmed the six theme
assertions match the actual Base.astro/ThemeToggle.astro logic; and confirmed
Playwright Firefox supports `colorScheme` emulation + `addInitScript` localStorage
seeding. The clean-room build is safe (removed dirs are gitignored).

**Minor polish applied:** the live-tracking step now names
`page.emulateMedia({ colorScheme })`, and the link check now also asserts the
Pagefind index files exist. Approved for implementation.

## Result

**Result:** Pass

- **Clean-room build:** removed `node_modules`, `dist`, `.astro`; `bun install`
  reinstalled 311 packages; `bun run build` succeeded with no errors and Pagefind
  indexed **8 pages / 561 words**. The committed sources build from scratch.
- **Routes & assets:** all present — `/`, `/404.html`, `/docs/`, all eight docs
  slugs (getting-started, installation, cli, daemon, terminals, plotly, nushell,
  requirements), `sitemap-index.xml`, `robots.txt`, `favicon.ico`,
  `images/og-termplot.png`, `images/termplot-mark.svg`, and
  `pagefind/pagefind.js` + the `pagefind/index/` fragments.
- **No broken links:** the whole-site internal-link check found zero broken
  links.
- **Theme (core requirement) — all six assertions passed** via Playwright
  Firefox:
  - system + OS light → `data-theme=light`, setting `system`.
  - system + OS dark → `data-theme=dark`, setting `system`.
  - `localStorage.theme=light` + OS dark → `light` (explicit wins).
  - `localStorage.theme=dark` + OS light → `dark` (explicit wins).
  - live tracking: `emulateMedia({colorScheme:"dark"})` flipped `data-theme`
    light→dark without reload.
  - toggle cycled system → light → dark and persisted each step to
    `localStorage`.
  The pre-paint script sets `data-theme` synchronously before body paint, so the
  correct values prove no wrong-theme flash.
- **Favicon/OG:** the home `<head>` carries the `favicon.ico` link, the
  `image/svg+xml` icon link, and `og:image` → `/images/og-termplot.png`; all
  three assets ship in `dist`.
- **Content sanity:** the footer "An Astrohacker Project" → `astrohacker.com`
  appears on sampled pages; the home page shows the Homebrew install and the
  bash/Nushell demos; the docs cover the full surface. Zero
  `nutorch`/`NuTorch`/`prose-nutorch` strings in `website/src`.
- **Visual:** captured light + dark home screenshots and confirmed correctly
  themed chrome (sun/moon toggle, logo, hero, install) with no wrong-theme
  bleed.
- **Not deployed; clean:** no `deploy`/wrangler ran — the site exists only as
  local `dist/`. No stray dev-server or Playwright Firefox process; port clear;
  the throwaway theme/screenshot scripts were deleted; `git status` is clean of
  website changes and `git diff --check` is clean.

All pass criteria met; no fail conditions hit. No defects were found, so no
fix-and-re-verify cycle was needed.

## Conclusion

The TermPlot website is complete and verified locally. It builds clean from a
fresh checkout, all routes and assets are present, there are no broken internal
links, the light/dark/system theme system resolves correctly with no flash and
live OS-preference tracking, the favicon/OG assets are wired up, the content is
complete and accurate with no NuTorch leakage, and nothing has been deployed.

This satisfies the Issue 6 closure checklist. The issue can close. A future
follow-up issue can publish the site (Cloudflare Pages config is already in place)
and ship the Homebrew tap/formula that the install docs aspirationally reference.

## Completion Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, which independently
re-ran the clean build, the route/asset checks, the broken-link scan, the
NuTorch-leak grep, and the head/footer checks, and cross-read the theme logic in
`Base.astro`/`ThemeToggle.astro` against the six asserted behaviors.

**Verdict:** APPROVE — no Blockers, no Majors, 1 Minor. The reviewer mapped all
eight Issue 6 closure-checklist items to verified evidence and confirmed each is
satisfied, and explicitly stated **Issue 6 is ready to close** after the result
commit.

The single Minor notes that the logo SVG uses self-contained hardcoded colors
rather than CSS variables/`currentColor`. This is the deliberate, already-approved
design from Experiment 2: a self-contained tile that carries its own contrast on
both themes (verified visually in both modes), chosen so one served SVG works
without DOM embedding. No change required.

# Experiment 6: Installation docs

## Description

Add the dedicated **Installation** page and cross-link it from getting-started.
This is Stage 6 of the Issue 6 roadmap and the last documentation stage. The page
documents installation two ways:

1. **Homebrew on macOS** — the aspirational, primary path, using the same brew
   command as the shared `INSTALL` snippet and the home page.
2. **From source** — the currently-working path (clone → `pnpm install` →
   `pnpm run playwright:install` → `pnpm run build` → `pnpm run playwright:verify`),
   accurate to the repo's real scripts and README.

macOS is stated as the only supported platform. The Homebrew formula does not
exist yet — that is the single aspirational element the issue permits; everything
about the from-source path must be accurate to the shipped repo.

## Verified facts (from the repo)

- **From-source steps** (repo `README.md` "Setup" + `package.json` scripts):
  `pnpm install`, `pnpm run playwright:install`, `pnpm run build`, and
  `pnpm run playwright:verify` to confirm the Firefox renderer.
- **Node ≥ 24** (`package.json` `engines`).
- **Bins after build:** `build/bin/termplot.js` and `build/bin/termplotd.js`
  (`package.json` `bin`). From a source checkout you invoke
  `node build/bin/termplot.js …`; the docs note you can symlink/alias it to
  `termplot` so the rest of the docs' `termplot …` commands work.
- **Repo:** `https://github.com/astrohacker/termplot`.
- **Renderer dependency:** Playwright Firefox (Chromium rejected on macOS
  SkyLight) — installed by `pnpm run playwright:install`.
- **Homebrew command:** `brew install astrohacker/tap/termplot` (matches
  `src/lib/install.ts` `INSTALL`).

## Changes

- `website/src/content/docs/installation.md` — new page, **Start** section,
  **order 15** (sits after getting-started, before the Guide pages; the spaced
  orders from Experiment 5 leave this slot free). Contents:
  - A short intro: macOS only; installs the `termplot` CLI and `termplotd` daemon.
  - **Homebrew (recommended):** the `brew install astrohacker/tap/termplot`
    command, noting the formula/tap is not published yet (aspirational).
  - **From source:** clone the repo, `pnpm install`, `pnpm run playwright:install`
    (installs Firefox), `pnpm run build`, then `pnpm run playwright:verify`. Note
    Node ≥ 24, that the built CLI is `node build/bin/termplot.js`, and that you can
    symlink/alias it to `termplot`.
  - **Verify it works:** a first render command.
  - A note that the daemon downloads/keeps Firefox warm and that the
    [Requirements & limitations](/docs/requirements/) page lists the rest.
- `website/src/content/docs/getting-started.md` — change the prose reference "the
  dedicated Installation page" into a real link to `/docs/installation/`, and add
  Installation to the "Where to next" list. (Small edit; no other doc changes.)

The Homebrew command string is kept identical to `src/lib/install.ts` `INSTALL`
by hand (markdown can't import the TS module); the verification checks they match.

## Verification

Run from `website/`:

1. **Build:** `bun run build` succeeds; `dist/docs/installation/index.html`
   exists; Pagefind indexes it.
2. **Sidebar:** the **Start** section now lists **Getting started** then
   **Installation**, before the Guide group, in order.
3. **Cross-link resolves:** getting-started links to `/docs/installation/`, and
   the full built-site internal-link check (as in Experiment 5) finds **no broken
   links** — including the now-resolving installation link.
4. **Install command matches the shared snippet:** the brew command in
   `installation.md` (and the home page) equals `INSTALL` in
   `src/lib/install.ts` (`brew install astrohacker/tap/termplot`).
5. **From-source accuracy:** the four `pnpm` commands shown match the repo
   `package.json` scripts (`playwright:install`, `build`, `playwright:verify`) and
   the README Setup section; the bin path `build/bin/termplot.js` matches
   `package.json` `bin`.
6. **Visual (both themes):** screenshot the installation page in light and dark
   via the repo-root Firefox script and **visually inspect** for legibility and
   correct theming. Delete `/tmp` shots + the root script after; confirm no stray
   processes/files and a clean `git status`.

**Pass criteria:** build succeeds; the Installation page renders and is grouped
under Start after Getting started; the getting-started cross-link resolves with no
broken links anywhere; the brew command matches `INSTALL`; the from-source steps
match the repo; the page is legible in both themes; cleanup leaves no stray
processes/files.
**Fail:** build error, a broken link, a brew/`INSTALL` mismatch, an inaccurate
from-source step, broken rendering, or stray artifacts.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill. The reviewer verified
the design's "Verified facts" against `package.json` (scripts `playwright:install`
/ `build` / `playwright:verify`, the `bin` map, `engines.node >=24`, pnpm), the
repo `README.md` Setup steps, and `website/src/lib/install.ts`
(`INSTALL === "brew install astrohacker/tap/termplot"`).

**Verdict:** APPROVE — no Blockers, Majors, or Minors. Every from-source step and
bin path is accurate; the brew command matches the shared `INSTALL`; order 15 in
the Start section correctly places Installation after Getting started (10) and
before the Guide pages (20+); and the verification plan (build, sidebar, broken-
link check, command-match, from-source accuracy, visual) is comprehensive. The
Homebrew formula's aspirational status is correctly isolated. Approved for
implementation with no changes required.

## Result

**Result:** Pass

- **Page:** added `installation.md` (Start, order 15) with Homebrew (aspirational,
  with a blockquote noting the tap isn't published) and a From-source path (clone
  → `pnpm install` → `pnpm run playwright:install` → `pnpm run build` →
  `pnpm run playwright:verify`, Node ≥ 24, `node build/bin/termplot.js`, and a
  symlink tip), plus a "Verify it works" render and links to the daemon and
  requirements pages.
- **Cross-link:** `getting-started.md` now links "Installation" to
  `/docs/installation/` and lists it first under "Where to next".
- **Build:** `bun run build` succeeds; `dist/docs/installation/index.html` exists;
  Pagefind indexes 8 pages.
- **Sidebar:** the Start section lists **Getting started** then **Installation**,
  before the Guide group — confirmed from built HTML.
- **No broken links:** the whole-site internal-link check passes with zero broken
  links, including the now-resolving `/docs/installation/` cross-link.
- **Brew matches INSTALL:** the installation page's brew command equals
  `src/lib/install.ts` `INSTALL` (`brew install astrohacker/tap/termplot`) —
  verified against rendered text.
- **From-source accuracy:** the four `pnpm` commands and the `build/bin/termplot.js`
  bin path are all present in the rendered page and match `package.json`/README.
- **Visual (both themes):** screenshotted the installation page in light and dark
  via the repo-root Firefox script and inspected — the Homebrew block, the note
  blockquote (teal left border), the from-source code blocks, the active sidebar
  item, and prev/next all render correctly and legibly in both.
- **Hygiene:** dev server stopped, root script and `/tmp` shots removed; no stray
  processes; port clear; `git status` shows only `getting-started.md` (modified)
  and `installation.md` (new); `git diff --check` clean.

All pass criteria met; no fail conditions hit.

## Conclusion

The documentation is now complete: a dedicated Installation page covers the
aspirational Homebrew path and the working from-source path (accurate to the
repo's pnpm scripts and bin layout), grouped under Start after Getting started,
with the cross-link resolving and the brew command matching the shared `INSTALL`
snippet.

That finishes the content stages. Next, **Experiment 7** is the full verification
stage: a clean `bun install` + `bun run build` from scratch, a whole-site link
check, a theme/no-flash check across system/light/dark, a favicon/OG check, and a
final confirmation that the site is built and correct locally (not deployed) — the
basis for closing Issue 6.

## Completion Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, which re-ran `bun run
build`, re-ran the broken-link check, and cross-checked the page against
`package.json`, the repo `README.md`, and `src/lib/install.ts`.

**Verdict:** APPROVE — no Blockers, Majors, or Minors. The reviewer confirmed the
four from-source `pnpm` commands match `package.json` exactly, the bin paths
(`build/bin/termplot.js`, `termplotd.js`) and Node ≥ 24 are correct, the clone URL
is the project repo, the brew command is identical across `installation.md`,
`getting-started.md`, and `INSTALL`, the cross-link resolves with zero broken
links site-wide, the sidebar lists Getting started then Installation before the
Guide group, the build indexes 8 pages, scope is limited to the two doc files,
and no result commit existed at review time.

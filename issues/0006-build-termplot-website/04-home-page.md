# Experiment 4: Home page

## Description

Replace the placeholder `index.astro` with the real TermPlot home page, mirroring
the shape of NuTorch's landing page (hero + install + demos + feature grid) with
TermPlot-accurate content. This is Stage 4 of the Issue 6 roadmap. After this
experiment the landing page sells what TermPlot is, shows real usage in
bash/zsh and Nushell via the shell-tabs + `CodeBlock` components built in
Experiment 3, and presents the aspirational Homebrew install.

All copy must be accurate to the shipped tool (CLI, daemon, terminals,
protocols) — the only aspirational element is the Homebrew install command,
which is finalized in Experiment 6. The home page's still-placeholder
`text-accent` wordmark from Experiment 1 is corrected to `text-plot` here.

## Changes

### Install snippet (shared)

- `website/src/lib/install.ts` — exports the canonical Homebrew install command
  as `INSTALL`, mirroring NuTorch's `lib/install.ts` pattern so the landing page
  and the (future) getting-started doc share one source string. Aspirational
  value: `brew install astrohacker/tap/termplot` (the exact tap form is confirmed
  in Experiment 6's install docs). macOS-only is stated in surrounding copy, not
  the command itself.

### Home page

- `website/src/pages/index.astro` — rewritten using `Base` + `CodeBlock`, with:
  - **Hero:** the TermPlot mark (the SVG served directly, with a `.hero-glow`
    behind it) at left; at right an `<h1>` ("Plotly plots in your terminal" with
    the brand-colored emphasis), a one-paragraph pitch, a shell-tabs block
    (bash/zsh + Nushell) showing a minimal real render, a "For macOS · Ghostty
    and iTerm2" note, and Install / GitHub buttons.
  - **Install:** an `#install` section with the `INSTALL` snippet in a `CodeBlock`
    and a copy button (NuTorch's pattern), plus one line stating macOS-only and
    that it installs the `termplot` CLI and `termplotd` daemon.
  - **Demos:** a small grid of real examples — a bash render with `--output`, a
    Nushell pipeline render, and a daemon-status example — using `CodeBlock`
    (with shell-tabs where a command has both forms).
  - **Features:** a 2-column card grid summarizing TermPlot's real strengths.

### Content accuracy (the copy that ships)

The hero/demos use only real, verified TermPlot behavior:

- Render from stdin / argument: `echo '{"data":[...]}' | termplot render` and
  `termplot render '<json>'` (the CLI reads Plotly JSON from an argument,
  `--file`, `--json`, or stdin; the `render` subcommand is required — bare
  `termplot` with no subcommand errors).
- PNG output: `termplot render --file plot.json --output plot.png`.
- Nushell: `source termplot.nu` then a record piped into `termplot` (the wrapper
  is an `export def termplot`; `source` is the form the README and smoke tests
  use — returns binary PNG by default; `--display` shows it in the terminal).
- Daemon: `termplot daemon status` (and the warm-renderer / 1-hour idle TTL story
  in prose).
- Terminals/protocols: Ghostty via Kitty graphics, iTerm2 via OSC 1337; macOS v1.

Feature cards (accurate, non-overstated):

1. **Real terminal images** — plots render as actual images through Kitty
   graphics (Ghostty) and OSC 1337 (iTerm2), not ASCII art.
2. **Warm daemon renderer** — `termplotd` keeps a browser hot in the background,
   so repeat renders are fast; a one-hour idle TTL cleans up after itself.
3. **Any shell, plus Nushell** — pipe Plotly JSON from bash/zsh/stdin to
   `termplot render`, or `source termplot.nu` for a native `termplot` command in
   Nushell that takes records and returns PNG bytes.
4. **Real Plotly** — it's Plotly.js under the hood, so scatter, bar, box,
   heatmaps, and the rest render exactly as Plotly draws them.

## Verification

Run from `website/`:

1. **Build:** `bun run build` succeeds; `dist/index.html` builds with the new
   content; no broken-import or Shiki errors.
2. **Content present:** `dist/index.html` contains the hero `<h1>`, the install
   command `brew install astrohacker/tap/termplot`, the shell-tabs markup
   (bash + Nushell), and the four feature card titles. The wordmark uses
   `text-plot` (no `text-accent` on the "Plot" span).
3. **Shell tabs work:** the hero/demo shell-tabs render both a `bash` and a `nu`
   panel (grep for `data-shell-panel="posix"` and `data-shell-panel="nu"`), so
   the Experiment 1 shell-tabs runtime can switch them.
4. **Accuracy:** the commands shown match the real CLI surface (no invented flags
   or behavior) — cross-checked against the experiment's content-accuracy list.
5. **Visual (both themes):** start the dev server (bounded, attributed cleanup),
   screenshot the full home page in light and dark via the repo-root Firefox
   script (as in Experiment 3, `localStorage.theme` forced, shots to `/tmp`), and
   **visually inspect** hero, install, demos, and features for layout, legibility,
   correct brand colors, and a working light/dark appearance. Also click-test the
   shell tabs in one shot if practical. Delete the `/tmp` shots and the root
   script after; confirm no stray processes/files and a clean `git status`.

**Pass criteria:** build succeeds; the home page shows accurate TermPlot content
(hero, Homebrew install, bash+Nushell demos, feature grid); shell tabs are
present and switchable; the page looks correct and legible in both themes; cleanup
leaves no stray processes/files.
**Fail:** build error, inaccurate/invented CLI claims, missing shell tabs, broken
layout in either theme, or stray artifacts.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, against `AGENTS.md`,
the issue README, this design, and — critically — the real TermPlot source
(`src/bin/termplot.ts`, `termplot.nu`, `src/display/protocols.ts`, `README.md`).

**Initial verdict:** REJECT — 2 Blockers (both accuracy, which the issue forbids
outside the aspirational install), no Major/Minor. The reviewer confirmed all
other claims are accurate (`--output`, `--file`, `--protocol`, `daemon status`,
1-hour TTL, warm renderer, Kitty/OSC 1337, macOS v1) and the scope/structure are
correct.

- Blocker 1: the design showed `use termplot.nu`; the wrapper is sourced
  (`source termplot.nu`) per the README and smoke tests — verified directly
  (`termplot.nu` is an `export def termplot`; `scripts/smoke-nushell-render.mjs`
  uses `source`).
- Blocker 2: `echo '{...}' | termplot` omits the required `render` subcommand;
  bare `termplot` with no subcommand errors. Correct form is
  `echo '{...}' | termplot render`.

**Fixes applied:** all Nushell references now use `source termplot.nu`; all stdin
examples use `termplot render`; the content-accuracy list and feature card 3 were
updated to match. With both Blockers resolved the design is approved for
implementation.

## Result

**Result:** Pass

- **Files:** added `src/lib/install.ts` (`INSTALL = "brew install
  astrohacker/tap/termplot"`) and rewrote `src/pages/index.astro` with hero,
  install, demos, and feature sections.
- **Hero:** the SVG mark (served directly) behind `.hero-glow`, the `<h1>`
  "Plotly plots in your terminal" (with the amber `text-plot` emphasis on
  "your"), the pitch, a bash/zsh + Nushell shell-tabs block, the "For macOS ·
  Ghostty (Kitty graphics) and iTerm2 (OSC 1337)" note, and Install/GitHub
  buttons.
- **Accuracy:** all shown commands match the real CLI per the design's
  content-accuracy list — `echo '{...}' | termplot render`,
  `termplot render --file plot.json --output plot.png`, `source termplot.nu`
  with a record piped to `termplot`/`termplot --display`,
  `$plot | termplot | save`, and `termplot daemon status`. Only the Homebrew
  command is aspirational.
- **Build:** `bun run build` succeeds. Content checks confirm the hero `<h1>`,
  the install command, both shell-tabs panels (`data-shell-panel="posix"` and
  `="nu"`), `termplot render`, `source termplot.nu`, and all four feature titles
  are in `dist/index.html`. The "Plot"/wordmark uses `text-plot`; the only
  `text-accent` occurrence is the footer's `hover:text-accent`, not the wordmark.
- **Visual (both themes):** screenshotted the full home page in light and dark
  via the repo-root Firefox script and inspected hero, install, demos, and
  feature grid — layout, legibility, and brand colors are correct in both. Also
  clicked the hero "Nushell" tab and captured the switched state: the code block
  swapped to the `source termplot.nu` example and the Nushell tab became active,
  confirming the shell-tabs runtime works on the home page.
- **Hygiene:** dev server stopped, root `shot.mjs` and `/tmp` shots removed; no
  stray processes; port clear; `git status` shows only `index.astro` (modified)
  and `src/lib/` (new); `git diff --check` clean.

All pass criteria met; no fail conditions hit.

## Conclusion

TermPlot's landing page now communicates the product accurately: a hero with the
logo and a real render example, an aspirational Homebrew install, accurate
bash/Nushell demos, and a feature grid — all verified legible in both themes with
working shell tabs. The shared `INSTALL` snippet is in place for the docs to
reuse.

Next, **Experiment 5** writes the full documentation set into
`src/content/docs/` (replacing the placeholder getting-started): the start guide,
CLI reference, daemon guide, terminals & protocols, Plotly input, Nushell, and
requirements & limitations — with bash/Nushell shell tabs — all accurate to the
shipped code. Experiment 6 then finalizes the installation docs (Homebrew +
install-from-source), reconciling them with the shared `INSTALL` snippet.

## Completion Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, which independently
re-ran `bun run build` and cross-checked every shown command against
`src/bin/termplot.ts`, `termplot.nu`, `src/display/protocols.ts`, and `README.md`.

**Verdict:** APPROVE — no Blockers, no Majors. The reviewer verified all six shown
commands are real and correct, the protocol/TTL/warm-renderer/macOS claims are
accurate, the scope is limited to `index.astro` + `src/lib/install.ts`, the
wordmark uses `text-plot` (only the footer hover uses `text-accent`), both
shell-tabs panels are present, and git hygiene is clean with no result commit yet.

One Minor: the Nushell record examples used unquoted `type: scatter` while the
README uses quoted `type: "scatter"` (both valid Nushell). Fixed for
cross-doc consistency — `index.astro` now uses `type: "scatter"` and rebuilds
clean.

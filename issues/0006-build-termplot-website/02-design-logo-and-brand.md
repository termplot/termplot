# Experiment 2: Design the TermPlot SVG logo and brand palette

## Description

Design TermPlot's visual identity: a single themeable **SVG logo** that reads at
favicon and hero sizes and works on both light and dark backgrounds, a finalized
brand palette wired into `global.css` (replacing Experiment 1's placeholder
tokens), and a build step that rasterizes the SVG to the PNG assets the site
needs (`favicon.ico`, favicon PNG sizes, and the OpenGraph image). This is Stage
2 of the Issue 6 roadmap.

The SVG is the source of truth for the mark. It is used directly (scalable,
crisp, theme-independent) for the header/footer/hero in Experiment 3–4; raster
PNGs are generated only where a raster is required — the `favicon.ico` (a PNG
served at that path is valid and what this project uses) and the OG image (must
be raster for social cards).

### Logo concept

TermPlot is "terminal" + "plot". The mark is a **self-contained rounded-square
tile** — an app-icon-style badge — so it holds its own contrast on any page
background (this is what makes one file work in both light and dark themes,
rather than needing separate light/dark variants):

- A rounded-square tile filled with a vertical **teal** gradient (the terminal
  surface), with a faint light inner stroke so the tile stays defined even on a
  dark page.
- Inside, a **plotted line** — an upward zig-zag sparkline in warm **amber** with
  rounded joints and circular node markers, the final node emphasized — the
  "plot".
- Faint horizontal gridlines behind the line (the chart axes), in low-opacity
  white, reinforcing the plot reading.
- A small terminal **prompt chevron** (`>`) with a cursor block in the lower-left,
  signalling "terminal".

Because the tile carries its own colors, the mark is legible on `#f6f7f9` (light)
and `#0d1117` (dark) alike. The amber-on-teal pairing is high-contrast and
distinct from NuTorch's green-nautilus-and-flame identity (no motif reuse).

### Brand palette (finalized)

Promote Experiment 1's placeholder teal+amber scheme to the final palette, tuned
to the logo. Tokens keep the same names so `global.css` structure is unchanged;
only values are confirmed/adjusted. `--term` (teal) and `--plot` (amber) are the
two brand-accent tokens the hero glow and accents key on.

## Changes

### Logo source

- `website/public/images/termplot-mark.svg` — the master SVG mark, **hand-coded
  as clean, well-formed SVG XML** (no tool-export metadata cruft) with a
  `viewBox="0 0 256 256"`, the teal-gradient tile, amber plot line + node
  markers, faint gridlines, and the prompt chevron + cursor. Self-contained
  colors; no dependence on page theme. Served directly and used as the raster
  pipeline's input.
  - **Source-location note:** unlike NuTorch, which keeps raster sources in
    `raw-images/` separate from `public/images/` outputs, TermPlot's SVG lives in
    `public/images/` because it is both (a) the input to the rasterization
    pipeline and (b) served directly by the site (the `image/svg+xml` favicon
    link). This co-location is intentional, not an oversight.

### Image pipeline

- `website/scripts/process-images.ts` — a `sharp` + `png-to-ico` script (the
  `build:images` script pre-declared in Experiment 1 already points here). It
  reads `public/images/termplot-mark.svg` and writes, into `website/public/`:
  - `images/termplot-mark-64.png`, `-128.png`, `-192.png` — header/footer mark
    and PNG favicon sizes (resized from the SVG).
  - `images/termplot-hero.png` (≈360²) and `images/termplot-hero@2x.png` (≈720²)
    — hero raster fallbacks (the hero itself may use the SVG directly; these
    exist for parity and OG/social reuse).
  - `favicon.ico` — a 32×32 PNG packed via `png-to-ico` (PNG content is valid in
    the `.ico` container and at the `favicon.ico` path).
  - `images/og-termplot.png` — 1200×630 social card: dark brand background
    (`#0d1117`), the mark on the left, the "TermPlot" wordmark (teal "Term" +
    amber "Plot") at a bold ~110px display size, and the tagline **"Plotly plots
    in your terminal"** at ~40px in the muted token color — composited via
    `sharp` from an inline SVG text layer, mirroring NuTorch's `ogText` structure
    (font-size ≥40px for legibility, Helvetica/Arial sans stack).
  - Outputs are committed so builds never depend on rerunning the script (matches
    NuTorch's approach).

### Styles

- `website/src/styles/global.css` — finalize the `:root` /
  `:root[data-theme="dark"]` token values (teal `--term`/`--primary`, amber
  `--plot`, slate surfaces) **to match the exact colors chosen for the SVG mark**
  — i.e. update the CSS variables so the page brand and the logo coordinate, not
  merely keep Experiment 1's placeholder values. Update the comment to state the
  palette is final and derived from the logo. No structural changes to
  `@theme inline` or downstream rules.

### Layout

- `website/src/layouts/Base.astro` — add the assets deferred in Experiment 1:
  - `<link rel="icon" href="/favicon.ico" sizes="32x32" />`
  - `<link rel="icon" type="image/svg+xml" href="/images/termplot-mark.svg" />`
    (modern browsers prefer the crisp SVG; `.ico` is the fallback)
  - `<meta property="og:image" content={ogImage} />` where `ogImage` is
    `new URL("/images/og-termplot.png", site)`.

No header, footer, hero, or docs changes here — those consume these assets in
Experiments 3–4.

## Verification

Run from `website/`:

1. **Pipeline runs:** `bun run build:images` completes without error and writes
   `favicon.ico`, `images/termplot-mark-{64,128,192}.png`,
   `images/termplot-hero.png`, `images/termplot-hero@2x.png`, and
   `images/og-termplot.png`. Confirm each file exists and is a non-trivial size.
2. **SVG validity:** `public/images/termplot-mark.svg` parses (sharp loads it as
   input without error; the build:images run proves this).
3. **Legibility in both themes (visual):** generate preview composites of the
   mark **into `/tmp` (outside the repo)** at favicon size (32px) and a larger
   size (192px) over the light background `#f6f7f9` and the dark background
   `#0d1117`. Method: a throwaway one-off `sharp` invocation (e.g. a short inline
   `bun`/`node` snippet, or a temporary `scripts/preview-mark.ts` that is deleted
   afterward) that flattens the rasterized mark onto each background color and
   writes the four PNGs to `/tmp`. **Visually inspect** all four, plus the final
   `public/images/og-termplot.png`, to confirm the mark is legible, balanced, and
   on-brand on both themes. **After inspection, delete the `/tmp` previews (and
   any temporary preview script) and confirm `git status` shows no stray or
   uncommitted files beyond the intended experiment outputs.**
4. **Site build:** `bun run build` still succeeds with the new Base links/meta;
   `dist/favicon.ico` and `dist/images/og-termplot.png` are present in output,
   and `dist/index.html` contains the `og:image` and favicon `<link>`s.
5. **No regression:** the theme pre-paint script and placeholder home still build
   and serve (quick `dist/index.html` grep for `prefers-color-scheme`).

**Pass criteria:** pipeline produces all assets; the mark is legible and
attractive on both light and dark backgrounds at favicon and hero sizes (visual
check); the site builds with favicon + og:image wired in; the `/tmp` previews and
any temporary preview script are deleted and `git status` is clean of stray
files.
**Fail:** pipeline error, an illegible/unbalanced mark in either theme, a broken
build, or stray preview artifacts left in the repo.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill, against `AGENTS.md`,
the issue README, this design, and Experiment 1, with NuTorch's
`process-images.ts` as reference.

**Initial verdict:** REJECT — no Blockers, 1 Major, 4 Minor. The reviewer
confirmed the architecture is sound: `sharp` rasterizes SVG input to PNG,
`png-to-ico` accepts a 32px PNG buffer, the self-contained-tile approach is the
right call for one-file dual-theme support, and the SVG-served + PNG-generated
split is consistent.

- Major: the preview-composite verification lacked an explicit generation method,
  a cleanup step, and a `git status`-clean pass criterion (repo-hygiene risk).
- Minor 1: "hand-authored" SVG was ambiguous (hand-coded vs tool-exported).
- Minor 2: SVG-source co-location in `public/images/` deviates from NuTorch's
  `raw-images/` split without a note.
- Minor 3: OG image tagline/font sizing underspecified.
- Minor 4: palette "confirm" wording could be read as "keep placeholder as-is"
  rather than "tune to the logo".

**Fixes applied:** verification step 3 now specifies a throwaway `sharp` snippet
writing previews to `/tmp`, mandates deleting them (and any temp script), and
adds a `git status`-clean pass/fail criterion; the SVG is specified as hand-coded
clean XML with a source-location note; the OG card now names the tagline
("Plotly plots in your terminal") and font sizes; and the palette change is
worded as tuning the tokens to the chosen logo colors. With the Major resolved
the design is approved for implementation.

## Conclusion

_Pending result._

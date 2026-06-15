# Experiment 6: Prove SIXEL output in iTerm2

## Description

Prove whether TermPlot can emit SIXEL image output directly from both Node.js
and Rust, then render that output in iTerm2 on macOS with the same unattended
window, screenshot, pixel assertion, and cleanup discipline used for the OSC
1337 proofs.

Issue 4's research found that iTerm2's feature-reporting spec declares SIXEL
support, while Ghostty does not document SIXEL support. This experiment targets
iTerm2 only. Ghostty remains `Unsupported` for SIXEL unless a later experiment
finds official support or local evidence worth testing.

The goal is not to select SIXEL for v1. The goal is to remove a matrix gap:
SIXEL should be marked `Pass`, `Partial`, or `Fail` for Node.js and Rust in
iTerm2 with evidence.

## Changes

- Add `scripts/fixtures/node-sixel-direct.js`.
  - Generate the same deterministic red, green, blue, and white test image used
    by previous proof experiments.
  - Emit SIXEL bytes directly from Node.js without `timg`, `imgcat`,
    `terminal-image`, `sixel`, ImageMagick, or another external image renderer.
  - Build one output byte buffer and write that exact buffer both to stdout and
    to `--capture=<path>`.
  - Use a deliberately small in-repo SIXEL encoder sufficient for the test
    image, with protocol bytes captured for attribution.
- Add `scripts/fixtures/rust-sixel-direct.rs`.
  - Generate the same deterministic image.
  - Emit SIXEL bytes directly from Rust without external crates, C libraries,
    `timg`, `imgcat`, ImageMagick, or another external image renderer.
  - Build one output byte buffer and write that exact buffer both to stdout and
    to `--capture=<path>`.
  - Use a deliberately small in-repo SIXEL encoder sufficient for the test
    image, with protocol bytes captured for attribution.
- Add `scripts/probe-iterm2-sixel.sh`.
  - Compile the Rust fixture with `rustc`.
  - Run the Node and Rust fixtures in separate iTerm2 windows or sequential
    isolated runs.
  - Launch iTerm2 with the already-proven
    `open -na iTerm.app --args
    --command=<quoted-probe-shell-command>` path.
  - Temporarily set and restore iTerm2 defaults needed for unattended testing.
  - Discover the probe-owned iTerm2 window with CoreGraphics by unique title,
    derive the screenshot rectangle from that window's bounds, and avoid fixed
    screen rectangles.
  - Capture emitted bytes and assert they contain SIXEL DCS framing while
    rejecting Kitty APC and OSC 1337 `File=` bytes.
  - Dynamically crop the rendered image and assert red, green, blue, and white
    pixels.
  - Record and clean up only probe-owned iTerm2 and strictly attributable
    iTermServer processes.
- Update the Issue 4 protocol matrix with SIXEL proof results and any practical
  limitations discovered.

## Verification

Pass criteria:

- `sh -n scripts/probe-iterm2-sixel.sh` passes.
- `node --check scripts/fixtures/node-sixel-direct.js` passes.
- `test -x scripts/probe-iterm2-sixel.sh` passes.
- `node scripts/fixtures/node-sixel-direct.js --capture=<tmp>` emits SIXEL DCS
  bytes, rejects Kitty APC and OSC 1337 `File=` bytes, and exits successfully.
  The test must prove that stdout and the capture file contain byte-identical
  copies of the exact same emitted buffer.
- `rustc scripts/fixtures/rust-sixel-direct.rs -o <tmp-bin>` succeeds.
- `<tmp-bin> --capture=<tmp>` emits SIXEL DCS bytes, rejects Kitty APC and OSC
  1337 `File=` bytes, and exits successfully. The test must prove that stdout
  and the capture file contain byte-identical copies of the exact same emitted
  buffer.
- `scripts/probe-iterm2-sixel.sh` renders Node SIXEL output in iTerm2,
  screenshots the probe-owned window, asserts the expected red, green, blue, and
  white pixels, restores iTerm2 defaults, and cleans up only attributed
  probe-owned processes.
- `scripts/probe-iterm2-sixel.sh` renders Rust SIXEL output in iTerm2 with the
  same screenshot, pixel, defaults, and cleanup evidence.
- Both live runs record dynamic detected bounds, final crop geometry, numeric
  RGB tolerances, match threshold, and red, green, blue, and white pixel counts.
- The issue README records the Node and Rust SIXEL proof results.
- `dprint fmt` succeeds on the issue files.
- `git add -N scripts/fixtures/node-sixel-direct.js
  scripts/fixtures/rust-sixel-direct.rs scripts/probe-iterm2-sixel.sh`
  or an equivalent intent-to-add command runs before whitespace checks so new
  files are included.
- `git diff --check` passes.

Partial criteria:

- One language passes and the other fails or needs an external library.
- SIXEL renders but the output has sizing, color, or cleanup limitations that
  make it unsuitable for a default TermPlot v1 display path.

Fail criteria:

- The proof relies on an external renderer such as `timg`, `imgcat`,
  ImageMagick, `terminal-image`, or a C library without proving TermPlot-owned
  emitted bytes.
- iTerm2 cannot render the emitted SIXEL bytes under unattended test conditions.
- The screenshot or cleanup evidence is not attributable to probe-owned
  windows/processes.

## Design Review

Reviewer: Banach (`019ecb83-4a7b-7c43-926a-7a98817d395f`), fresh-context Codex
design reviewer.

Initial findings:

- Major: byte-attribution criteria were too loose because the plan did not
  require one output buffer to be written identically to stdout and `--capture`.
- Major: screenshot criteria did not require recorded crop geometry, RGB
  tolerances, thresholds, and per-color counts.
- Major: `git diff --check` would miss newly added files unless they were added
  with intent-to-add first.
- Minor: repo hygiene omitted `node --check` and an explicit executable check
  for the probe script.

Fixes: the plan now requires exact stdout/capture byte identity, concrete pixel
geometry and color-count evidence, intent-to-add before `git diff --check`,
`node --check`, and `test -x` for the probe script.

Re-review: approved. The reviewer confirmed that all prior findings were
resolved and that no new blockers were introduced.

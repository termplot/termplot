# Experiment 5: Prove Rust iTerm2 OSC 1337 output

## Description

Prove or reject whether TermPlot can emit iTerm2 inline image protocol output
from Rust and render the result in iTerm2 with real screenshot/pixel assertions
and attributed cleanup.

Experiment 4 proved the Node.js side of the iTerm2 path with a dependency-free
PNG encoder, direct OSC 1337 `File=` output, byte attribution, iTerm2 prompt
preconfiguration/restoration, CoreGraphics window discovery, dynamic image crop,
and strict cleanup evidence. This experiment should make the Rust comparison
fair by using the same PNG shape, OSC 1337 byte-attribution standard, iTerm2
window-discovery standard, and cleanup standard.

Use a minimal dependency-free Rust fixture first. The purpose is to prove the
runtime/language can emit OSC 1337 bytes that iTerm2 renders, without
introducing crate-selection or Cargo package-management variables.

## Changes

- Add a dependency-free Rust iTerm2 proof fixture outside `v0/`, preferably
  under `scripts/fixtures/`, that:
  - generates a deterministic `64x64` RGBA image with red, green, blue, and
    white quadrants;
  - encodes that image as PNG using the Rust standard library only;
  - emits OSC 1337 `File=` inline image output with `inline=1` and explicit
    sizing metadata;
  - builds one byte buffer and writes that exact buffer both to a temp artifact
    and to stdout so protocol attribution applies to the bytes sent to iTerm2;
  - asserts that the emitted bytes contain OSC 1337 `File=` output and do not
    contain Kitty APC `ESC_G` output;
  - exits with a nonzero status if PNG encoding or output generation fails.
- Add a macOS probe script under `scripts/` that adapts the Node iTerm2 proof:
  - compiles the Rust fixture with `rustc`;
  - launches iTerm2 with
    `open -na iTerm.app --args --command=<quoted-probe-shell-command>`;
  - temporarily sets and restores iTerm2 defaults needed for unattended testing;
  - uses terminal window-control escapes only as a window placement request;
  - discovers the probe-owned iTerm2 window with CoreGraphics from `swift` by
    matching the unique probe title, then derives the screenshot rectangle from
    that window's bounds;
  - verifies the captured Rust output artifact contains OSC 1337 protocol bytes
    and not Kitty protocol bytes;
  - dynamically detects the rendered image crop and asserts red, green, blue,
    and white pixels with GraphicsMagick;
  - records pre-existing iTerm2/iTermServer PIDs, probe-owned iTerm2 PIDs,
    strictly attributed iTermServer helper PIDs, cleanup target PIDs, and final
    process evidence;
  - retains a `/tmp/termplot-iterm2-rust-osc1337-*.png` proof screenshot;
  - cleans up only probe-owned iTerm2 and strictly attributed iTermServer
    processes and temporary files.
- Update the Issue 4 README protocol matrix:
  - mark the Rust iTerm2 OSC 1337/iTerm2 proof `Pass`, `Partial`, or `Fail`;
  - refine the Rust iTerm2 path based on the actual implementation used.
- Record implementation details, command output, screenshot artifact path, pixel
  counts, cleanup evidence, and any failure diagnostics in this experiment file.

## Verification

Pass criteria:

- The Rust proof does not call `ansi-escapes`, `terminal-image`, `timg`,
  `imgcat`, `kitty +kitten icat`, Node.js, or another external terminal image
  renderer.
- The Rust proof is dependency-free for this experiment and does not require
  adding or installing a Rust crate.
- The Rust proof builds one byte buffer and writes that exact buffer to both the
  capture artifact and stdout, then verifies concrete iTerm2 protocol
  attribution by finding OSC 1337 `File=` output and rejecting Kitty APC `ESC_G`
  output. If protocol attribution cannot be proven on the exact bytes sent to
  iTerm2, the result cannot be `Pass`.
- The iTerm2 launch path does not use AppleScript, Accessibility typing, or an
  interactive permission prompt.
- Screenshot capture is tied to the probe-owned iTerm2 window by CoreGraphics
  window discovery from the unique probe title; the captured rectangle must be
  derived from discovered `window_bounds`.
- Running the new probe opens an isolated iTerm2 window, runs the Rust OSC 1337
  renderer, captures a nonempty screenshot, and records the renderer exit status
  as `0`.
- The screenshot assertion records detected image bounds, final crop geometry,
  RGB tolerances, threshold, and per-color counts.
- The screenshot assertion finds red, green, blue, and white pixel clusters
  above threshold in the detected render crop.
- The retained screenshot path and per-color counts are printed and recorded.
- Any iTerm2 process created by the probe is cleaned up before the script exits.
- Cleanup does not kill an unrelated iTerm2 process or ambiguous iTermServer
  helper.
- Cleanup evidence records pre-existing iTerm2/iTermServer PIDs, probe-owned
  iTerm2 PIDs, cleanup target PIDs, post-cleanup absence of probe-owned PIDs,
  and a final process check.
- Temporary iTerm2 defaults modified for unattended testing are restored.
- Temporary files created by the probe are removed before the script exits,
  except the intentionally retained screenshot artifact.
- The Issue 4 matrix is updated to reflect the real Rust iTerm2 OSC 1337 proof
  result.
- `sh -n` passes for any shell script added.
- The new probe script is executable and `test -x <script>` passes.
- The Rust fixture compiles with `rustc` without requiring Cargo metadata.
- `dprint fmt` succeeds on changed documentation files.
- `git diff --check` passes, including new files via staging or intent-add.

Partial criteria:

- Rust can display OSC 1337 images in iTerm2, but only through a path that is
  unsuitable for TermPlot v1 without follow-up work, such as unreliable sizing,
  fragile prompt handling, or ambiguous helper cleanup.
- Rust renders visible pixels, but the emitted bytes cannot be conclusively
  attributed to OSC 1337 `File=` output.
- Pixels render but cleanup, crop stability, protocol attribution, or temporary
  defaults restoration needs a bounded follow-up before the matrix can be
  treated as fully proven.

Fail criteria:

- Rust cannot emit iTerm2 inline images in iTerm2 without relying on Node.js,
  `ansi-escapes`, `terminal-image`, `timg`, or another external image renderer.
- The output appears as raw escape text, renders no visible image, or fails
  screenshot pixel assertions.
- The launch path triggers a manual permission prompt.
- The script leaves a probe-owned iTerm2 process running after it exits.
- The script kills or targets an iTerm2 process or ambiguous iTermServer helper
  it did not open.

## Design Review

Reviewer: Kepler (`019ecb75-3009-7373-ae1e-5669fcb4f203`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 5 with status `Designed`, the experiment has the required sections,
scope is narrow, implementation has not started before the plan commit, and the
verification criteria cover protocol byte attribution, CoreGraphics window
discovery, dynamic pixel assertions, iTerm2 defaults restoration, attributed
cleanup, matrix updates, and repo hygiene checks.

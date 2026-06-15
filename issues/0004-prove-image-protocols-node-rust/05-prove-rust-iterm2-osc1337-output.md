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

## Result

**Result:** Pass

Experiment 5 proved that Rust can emit iTerm2 OSC 1337 `File=` inline image
bytes directly and that iTerm2 renders those bytes as a visible image under the
same screenshot/pixel harness used for the Node proof. The implementation uses a
dependency-free PNG encoder and direct OSC 1337 emitter compiled with `rustc`,
not Node.js, `ansi-escapes`, `terminal-image`, `timg`, `imgcat`,
`kitty +kitten icat`, or another external terminal image renderer.

Implemented files:

- `scripts/fixtures/rust-iterm2-osc1337-direct.rs`
  - generates a deterministic `64x64` RGBA image with red, green, blue, and
    white quadrants;
  - encodes that image as PNG using only the Rust standard library, CRC32,
    Adler-32, and uncompressed DEFLATE blocks inside a zlib stream;
  - emits OSC 1337 `File=` output with `inline=1`, `size=<png-bytes>`,
    `width=16`, and `preserveAspectRatio=1`;
  - builds one output byte buffer and writes that exact buffer both to
    `--capture=<path>` and stdout;
  - asserts locally that output contains OSC 1337 `File=` bytes and does not
    contain Kitty APC output.
- `scripts/probe-iterm2-rust-osc1337.sh`
  - compiles the Rust fixture to a temp binary with `rustc`;
  - launches iTerm2 with
    `open -na iTerm.app --args --command=<quoted-probe-shell-command>`;
  - temporarily sets and restores iTerm2 defaults needed for unattended testing;
  - uses terminal window-control escapes only as a window placement request;
  - discovers the probe-owned iTerm2 window with CoreGraphics from `swift` by
    matching the unique probe title, then derives the `screencapture` rectangle
    from that window's bounds;
  - captures the exact emitted OSC 1337 bytes and verifies that they are not
    Kitty bytes;
  - dynamically detects the rendered red/green/blue image bounds and counts red,
    green, blue, and white pixels inside the detected crop;
  - records pre-existing iTerm2/iTermServer PIDs, probe-owned iTerm2 PIDs,
    strictly attributed iTermServer helper PIDs, cleanup target PIDs, and final
    process evidence;
  - cleans up only probe-owned iTerm2 and strictly attributed iTermServer
    processes, then removes the probe temp dir while retaining the screenshot
    artifact.

Verification commands:

```bash
chmod +x scripts/probe-iterm2-rust-osc1337.sh
sh -n scripts/probe-iterm2-rust-osc1337.sh
rustc scripts/fixtures/rust-iterm2-osc1337-direct.rs -o /tmp/termplot-rust-iterm2-osc1337-direct
test -x scripts/probe-iterm2-rust-osc1337.sh
/tmp/termplot-rust-iterm2-osc1337-direct --capture=/tmp/termplot-rust-iterm2-osc1337-test2.bin --png=/tmp/termplot-rust-iterm2-osc1337-test2.png >/tmp/termplot-rust-iterm2-osc1337-test2.out 2>/tmp/termplot-rust-iterm2-osc1337-test2.err
wc -c /tmp/termplot-rust-iterm2-osc1337-test2.bin /tmp/termplot-rust-iterm2-osc1337-test2.out /tmp/termplot-rust-iterm2-osc1337-test2.png
perl -0777 -ne 'exit(!(/\x1b\]1337;File=/ && /inline=1/ && !/\x1b_G/))' /tmp/termplot-rust-iterm2-osc1337-test2.bin
file /tmp/termplot-rust-iterm2-osc1337-test2.png
cat /tmp/termplot-rust-iterm2-osc1337-test2.err
rg --fixed-strings 'ansi-escapes' scripts/probe-iterm2-rust-osc1337.sh scripts/fixtures/rust-iterm2-osc1337-direct.rs || true
rg --fixed-strings 'terminal-image' scripts/probe-iterm2-rust-osc1337.sh scripts/fixtures/rust-iterm2-osc1337-direct.rs || true
rg --fixed-strings 'timg' scripts/probe-iterm2-rust-osc1337.sh scripts/fixtures/rust-iterm2-osc1337-direct.rs || true
rg --fixed-strings 'node' scripts/probe-iterm2-rust-osc1337.sh scripts/fixtures/rust-iterm2-osc1337-direct.rs || true
scripts/probe-iterm2-rust-osc1337.sh
out=/tmp/termplot-iterm2-rust-osc1337-verify.log
scripts/probe-iterm2-rust-osc1337.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^iterm2_probe_tmpdir=//p' "$out" | tail -n 1)
artifact=$(sed -n 's/^pixel_screenshot=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
test -n "$artifact"
test -s "$artifact"
defaults read com.googlecode.iterm2 SUEnableAutomaticChecks 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressDownloadConfirmation 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressPromptToEnableResizing 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressPromptToEnableUnfocusedResizing 2>/dev/null || echo '<unset>'
ps -axo pid=,ppid=,command= | rg 'iTerm|termplot-iterm2-rust-osc1337|rust-iterm2-osc1337|iTermServer' || true
dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/05-prove-rust-iterm2-osc1337-output.md
git add -N scripts/fixtures/rust-iterm2-osc1337-direct.rs scripts/probe-iterm2-rust-osc1337.sh
git diff --check
```

The fixture byte check passed:

```text
22131 /tmp/termplot-rust-iterm2-osc1337-test2.bin
22131 /tmp/termplot-rust-iterm2-osc1337-test2.out
16516 /tmp/termplot-rust-iterm2-osc1337-test2.png
/tmp/termplot-rust-iterm2-osc1337-test2.png: PNG image data, 64 x 64, 8-bit/color RGBA, non-interlaced
rust_iterm2_fixture=direct
rust_iterm2_protocol=osc1337
rust_iterm2_png_size=64x64
rust_iterm2_png_bytes=16516
rust_iterm2_output_bytes=22131
```

The successful live iTerm2 run reported:

```text
probe_iterm2_pids=56563
window_id=808
window_owner=iTerm2
window_title=TermPlot iTerm2 Rust OSC1337 probe termplot-iterm2-rust-osc1337-probe.K0W9NK
window_bounds=600,379,587,462
capture_rect=600,379,587,462
rust_iterm2_protocol=osc1337
rust_iterm2_png_bytes=16516
rust_iterm2_output_bytes=22131
rust_status=0
rust_iterm2_protocol_attribution=osc1337-file
rust_iterm2_contains_osc1337_file=yes
rust_iterm2_contains_kitty_apc=no
screenshot=/tmp/termplot-iterm2-rust-osc1337-termplot-iterm2-rust-osc1337-probe.K0W9NK.png
screenshot_bytes=88929
screenshot_  pixelWidth: 1174
screenshot_  pixelHeight: 924
pixel_crop=256x256+0+54
pixel_detected_bounds=224x224+10+70
pixel_threshold=20
red_count=12312
green_count=12321
blue_count=12431
white_count=12570
cleanup_iterm2_pids=56563
cleanup_iterm2_server_pids=56570
post_cleanup_preexisting_iterm2_pids=
post_cleanup_preexisting_iterm2_server_pids=
iterm2_processes=cleaned
pass: iTerm2 rendered Rust OSC 1337 output, pixels matched, and cleanup completed
```

The wrapper verification run also passed:

```text
rust_iterm2_protocol_attribution=osc1337-file
rust_iterm2_contains_osc1337_file=yes
rust_iterm2_contains_kitty_apc=no
rust_status=0
window_id=821
window_owner=iTerm2
window_title=TermPlot iTerm2 Rust OSC1337 probe termplot-iterm2-rust-osc1337-probe.EqzGJ7
window_bounds=600,379,587,462
capture_rect=600,379,587,462
pixel_crop=256x256+0+54
pixel_detected_bounds=224x224+10+70
red_count=12312
green_count=12321
blue_count=12431
white_count=12570
cleanup_iterm2_pids=56797
cleanup_iterm2_server_pids=56803
post_cleanup_preexisting_iterm2_pids=
post_cleanup_preexisting_iterm2_server_pids=
iterm2_processes=cleaned
iterm2_rust_osc1337_tmpdir_removed=yes
iterm2_rust_osc1337_artifact_exists=yes
```

The temporary iTerm2 defaults were restored to their prior absent state, and the
final process check showed no iTerm2 or iTermServer leftovers, only the check
command itself.

## Conclusion

Rust is viable for emitting iTerm2 OSC 1337 inline images in iTerm2 on macOS.
Together with Experiment 4, this proves that both Node.js and Rust can implement
the two primary target display paths directly:

- Kitty graphics in Ghostty.
- OSC 1337 `File=` inline images in iTerm2.

Rust's dependency-free PNG path is larger because it uses uncompressed DEFLATE
blocks in a zlib stream, but that is an implementation detail, not a protocol
limitation. A production Rust path could use a PNG/image crate if Rust is
chosen.

The next experiment should decide whether Issue 4 has enough evidence to close
without SIXEL or ANSI fallback proofs, or whether one final fallback experiment
is still necessary for the TermPlot v1 client-language decision.

## Completion Review

Reviewer: Meitner (`019ecb7f-12f9-7bd2-be54-309f4821faf1`), fresh-context Codex
completion reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer verified that the implementation matches the
approved scope, `Result` and `Conclusion` are present, the issue README status
matches the pass result, the result commit had not yet been made, and
`git diff --check` passed. The reviewer also reran `sh -n`, `test -x`, `rustc`,
fixture output generation, byte equality with `cmp`, OSC/Kitty protocol
assertions, PNG `file` checks, and searches for external renderers. No use of
Node.js, `ansi-escapes`, `terminal-image`, `timg`, `imgcat`, or
`kitty +kitten icat` was found in the changed implementation files.

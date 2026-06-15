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

## Result

**Result:** Pass

Experiment 6 proved that both Node.js and Rust can emit SIXEL image bytes
directly, and that iTerm2 renders those bytes under the same unattended
screenshot/pixel harness used for the OSC 1337 proofs. The fixtures do not use
`timg`, `imgcat`, `terminal-image`, `sixel`, ImageMagick, C libraries, or other
external renderers.

Implemented files:

- `scripts/fixtures/node-sixel-direct.js`
  - generates a deterministic `64x64` red, green, blue, and white quadrant
    image;
  - encodes the image as a small four-color SIXEL DCS stream directly in
    Node.js;
  - builds one output buffer and writes that exact buffer to both stdout and
    `--capture=<path>`;
  - asserts SIXEL DCS framing, raster attributes, ST terminator, no Kitty APC,
    and no OSC 1337 `File=` bytes.
- `scripts/fixtures/rust-sixel-direct.rs`
  - generates the same deterministic image;
  - encodes the same four-color SIXEL DCS stream directly in Rust with no
    external crates;
  - builds one output buffer and writes that exact buffer to both stdout and
    `--capture=<path>`;
  - asserts SIXEL DCS framing, raster attributes, ST terminator, no Kitty APC,
    and no OSC 1337 `File=` bytes.
- `scripts/probe-iterm2-sixel.sh`
  - compiles the Rust fixture with `rustc`;
  - runs the Node and Rust fixtures in separate probe-owned iTerm2 windows;
  - launches iTerm2 with
    `open -na iTerm.app --args --command=<quoted-probe-shell-command>`;
  - temporarily sets and restores iTerm2 defaults needed for unattended testing;
  - discovers each probe-owned iTerm2 window with CoreGraphics by unique title,
    then derives the `screencapture` rectangle from that window's bounds;
  - captures emitted bytes, proves stdout/capture byte identity, proves SIXEL
    DCS framing, rejects Kitty APC and OSC 1337 `File=` bytes, dynamically
    detects rendered bounds, records crop geometry and RGB thresholds, and
    counts red, green, blue, and white pixels;
  - records and cleans up only probe-owned iTerm2 processes and strictly
    attributable iTermServer helpers.

Verification commands:

```bash
chmod +x scripts/probe-iterm2-sixel.sh
test -x scripts/probe-iterm2-sixel.sh
node --check scripts/fixtures/node-sixel-direct.js
sh -n scripts/probe-iterm2-sixel.sh
rustc scripts/fixtures/rust-sixel-direct.rs -o /tmp/termplot-rust-sixel-direct
node_capture=/tmp/termplot-node-sixel-direct.bin
node_stdout=/tmp/termplot-node-sixel-direct.out
node_err=/tmp/termplot-node-sixel-direct.err
rust_capture=/tmp/termplot-rust-sixel-direct.bin
rust_stdout=/tmp/termplot-rust-sixel-direct.out
rust_err=/tmp/termplot-rust-sixel-direct.err
node scripts/fixtures/node-sixel-direct.js --capture="$node_capture" >"$node_stdout" 2>"$node_err"
cmp -s "$node_capture" "$node_stdout"
perl -0777 -ne 'exit(!(/^\x1bPq/ && /"1;1;64;64/ && /\x1b\\\n\z/ && !/\x1b_G/ && !/\x1b\]1337;File=/))' "$node_capture"
/tmp/termplot-rust-sixel-direct --capture="$rust_capture" >"$rust_stdout" 2>"$rust_err"
cmp -s "$rust_capture" "$rust_stdout"
perl -0777 -ne 'exit(!(/^\x1bPq/ && /"1;1;64;64/ && /\x1b\\\n\z/ && !/\x1b_G/ && !/\x1b\]1337;File=/))' "$rust_capture"
wc -c "$node_capture" "$node_stdout" "$rust_capture" "$rust_stdout"
cat "$node_err"
cat "$rust_err"
scripts/probe-iterm2-sixel.sh
out=/tmp/termplot-iterm2-sixel-verify.log
scripts/probe-iterm2-sixel.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^iterm2_probe_tmpdir=//p' "$out" | tail -n 1)
node_artifact=$(sed -n 's/^node_pixel_screenshot=//p' "$out" | tail -n 1)
rust_artifact=$(sed -n 's/^rust_pixel_screenshot=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
test -n "$node_artifact"
test -s "$node_artifact"
test -n "$rust_artifact"
test -s "$rust_artifact"
defaults read com.googlecode.iterm2 SUEnableAutomaticChecks 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressDownloadConfirmation 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressPromptToEnableResizing 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressPromptToEnableUnfocusedResizing 2>/dev/null || echo '<unset>'
ps -axo pid=,ppid=,command= | rg 'iTerm|termplot-iterm2-sixel|sixel-direct|iTermServer' || true
dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/06-prove-sixel-output-in-iterm2.md
git add -N scripts/fixtures/node-sixel-direct.js scripts/fixtures/rust-sixel-direct.rs scripts/probe-iterm2-sixel.sh
git diff --check
```

The fixture byte checks passed:

```text
    3015 /tmp/termplot-node-sixel-direct.bin
    3015 /tmp/termplot-node-sixel-direct.out
    3015 /tmp/termplot-rust-sixel-direct.bin
    3015 /tmp/termplot-rust-sixel-direct.out
   12060 total
node_sixel_fixture=direct
node_sixel_protocol=sixel
node_sixel_size=64x64
node_sixel_output_bytes=3015
rust_sixel_fixture=direct
rust_sixel_protocol=sixel
rust_sixel_size=64x64
rust_sixel_output_bytes=3015
```

The first live iTerm2 proof passed for both languages:

```text
node_sixel_protocol_attribution=sixel-dcs
node_sixel_output_bytes=3015
node_sixel_stdout_bytes=3015
node_sixel_stdout_capture_identical=yes
node_contains_sixel_dcs=yes
node_contains_kitty_apc=no
node_contains_osc1337_file=no
node_pixel_crop=96x96+0+54
node_pixel_detected_bounds=64x64+10+70
node_pixel_threshold=20
node_pixel_tolerance=red(|r-255|<=35,g<=70,b<=70);green(r<=90,g>=140,b<=90);blue(r<=90,g<=90,b>=140);white(r>=190,g>=190,b>=190)
node_red_count=1024
node_green_count=1024
node_blue_count=1024
node_white_count=1092
cleanup_iterm2_pids=58394
cleanup_iterm2_server_pids=58400
rust_sixel_protocol_attribution=sixel-dcs
rust_sixel_output_bytes=3015
rust_sixel_stdout_bytes=3015
rust_sixel_stdout_capture_identical=yes
rust_contains_sixel_dcs=yes
rust_contains_kitty_apc=no
rust_contains_osc1337_file=no
rust_pixel_crop=96x96+0+54
rust_pixel_detected_bounds=64x64+10+70
rust_pixel_threshold=20
rust_pixel_tolerance=red(|r-255|<=35,g<=70,b<=70);green(r<=90,g>=140,b<=90);blue(r<=90,g<=90,b>=140);white(r>=190,g>=190,b>=190)
rust_red_count=1024
rust_green_count=1024
rust_blue_count=1024
rust_white_count=1092
cleanup_iterm2_pids=58577
cleanup_iterm2_server_pids=58583
iterm2_processes=cleaned
pass: iTerm2 rendered Node and Rust SIXEL output, pixels matched, and cleanup completed
```

The wrapper verification run also passed:

```text
node_sixel_protocol_attribution=sixel-dcs
node_sixel_stdout_capture_identical=yes
node_contains_sixel_dcs=yes
node_contains_kitty_apc=no
node_contains_osc1337_file=no
node_pixel_crop=96x96+0+54
node_pixel_detected_bounds=64x64+10+70
node_pixel_threshold=20
node_pixel_tolerance=red(|r-255|<=35,g<=70,b<=70);green(r<=90,g>=140,b<=90);blue(r<=90,g<=90,b>=140);white(r>=190,g>=190,b>=190)
node_red_count=1024
node_green_count=1024
node_blue_count=1024
node_white_count=1092
rust_sixel_protocol_attribution=sixel-dcs
rust_sixel_stdout_capture_identical=yes
rust_contains_sixel_dcs=yes
rust_contains_kitty_apc=no
rust_contains_osc1337_file=no
rust_pixel_crop=96x96+0+54
rust_pixel_detected_bounds=64x64+10+70
rust_pixel_threshold=20
rust_pixel_tolerance=red(|r-255|<=35,g<=70,b<=70);green(r<=90,g>=140,b<=90);blue(r<=90,g<=90,b>=140);white(r>=190,g>=190,b>=190)
rust_red_count=1024
rust_green_count=1024
rust_blue_count=1024
rust_white_count=1092
post_cleanup_preexisting_iterm2_pids=
post_cleanup_preexisting_iterm2_server_pids=
iterm2_processes=cleaned
pass: iTerm2 rendered Node and Rust SIXEL output, pixels matched, and cleanup completed
```

The temporary iTerm2 defaults were restored to their prior absent state:

```text
<unset>
<unset>
<unset>
<unset>
```

The final process check showed no iTerm2 or iTermServer leftovers, only the
check command itself.

## Conclusion

SIXEL is viable from both Node.js and Rust in iTerm2 on macOS. For TermPlot v1,
SIXEL should be treated as a working compatibility path for iTerm2, not the
primary path: OSC 1337 remains simpler for iTerm2 and Kitty remains the primary
Ghostty path.

This experiment also shows that a minimal direct SIXEL encoder is practical in
both languages for simple indexed-color output. Production plot screenshots are
full-color PNGs, so using SIXEL as a production path would require either
quantization work or a maintained encoder library. That additional complexity is
not justified for the default v1 path while OSC 1337 works in iTerm2.

## Completion Review

Reviewer: Mendel (`019ecb8f-0e8d-7a61-92c8-f6449b6019a6`), fresh-context Codex
completion reviewer.

Initial findings:

- Blocker: the result snippets omitted the recorded `node_pixel_tolerance` and
  `rust_pixel_tolerance` lines even though the probe emitted them.
- Blocker: the verification command block omitted the final `dprint fmt`,
  intent-to-add, and `git diff --check` commands.
- Major: the issue README did not yet record the v1-relevant SIXEL learning.

Fixes:

- Added the exact pixel-tolerance lines to both the first live proof and wrapper
  verification snippets.
- Added the formatting, intent-to-add, and whitespace-check commands to the
  verification command block.
- Added the README note that direct four-color SIXEL works from both Node.js and
  Rust in iTerm2, but full-color Plotly output would require quantization or a
  maintained encoder, so OSC 1337 remains the simpler iTerm2 default.

Re-review: approved. The reviewer confirmed that all prior findings were
resolved and that no new blockers were introduced.

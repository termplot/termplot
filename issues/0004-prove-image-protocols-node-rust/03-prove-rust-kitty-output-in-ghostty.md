# Experiment 3: Prove Rust Kitty output in Ghostty

## Description

Prove or reject whether TermPlot can emit Kitty graphics from Rust and render
the result in Ghostty with the existing macOS screenshot/pixel harness.

Experiment 2 proved the Node.js side of the primary Ghostty path with a
dependency-free direct Kitty encoder, byte-level protocol attribution, real
Ghostty screenshot capture, pixel assertions, and attributed cleanup. This
experiment should make the Rust comparison fair by using the same image shape,
same Kitty `f=24` raw RGB path, same byte-attribution standard, and same Ghostty
verification strategy.

Use a minimal dependency-free Rust fixture first. The purpose is to prove the
runtime/language can emit Kitty bytes that Ghostty renders, without introducing
crate-selection or package-management variables. Library candidates such as
`ratatui-image`, `viuer`, `rasteroid`, or `kitty-graphics-protocol` can be
tested later if direct output works and a library comparison becomes useful.

## Changes

- Add a dependency-free Rust proof fixture outside `v0/`, preferably under
  `scripts/fixtures/`, that:
  - generates the same deterministic `64x64` RGB image with red, green, blue,
    and white quadrants used by the Node proof;
  - emits Kitty graphics escape output with a minimal direct protocol encoder;
  - builds one byte buffer and writes that exact buffer both to a temp artifact
    and to stdout so protocol attribution applies to the bytes sent to Ghostty;
  - asserts that the emitted bytes contain Kitty APC escape sequences
    (`ESC_G...ESC\\`) and do not contain iTerm2 OSC 1337 `File=` output;
  - exits with a nonzero status if image encoding or output generation fails.
- Add a macOS probe script under `scripts/` that adapts the Node Kitty Ghostty
  probe:
  - launches Ghostty without `-e`;
  - feeds a shell function through `--input=path:<input-file>` so post-render
    logic is parsed before the Rust command runs;
  - compiles or runs the Rust fixture in a reproducible way;
  - records the Rust command status and terminal environment;
  - captures the same controlled screen rectangle;
  - verifies the captured Rust output artifact contains Kitty protocol bytes;
  - asserts red, green, blue, and white pixels with GraphicsMagick;
  - retains a `/tmp/termplot-ghostty-rust-kitty-*.png` proof screenshot;
  - records pre-existing Ghostty PIDs, probe-owned Ghostty PIDs matched through
    the probe temp path, cleanup target PIDs, post-cleanup absence of
    probe-owned PIDs, and evidence that pre-existing Ghostty PIDs were not
    targeted;
  - cleans up only probe-owned Ghostty processes and temporary files.
- Update the Issue 4 README protocol matrix:
  - mark the Rust Kitty/Ghostty proof `Pass`, `Partial`, or `Fail`;
  - refine the Rust Kitty path based on the actual implementation used.
- Record implementation details, compile/run command output, screenshot artifact
  path, pixel counts, cleanup evidence, and any failure diagnostics in this
  experiment file.

## Verification

Pass criteria:

- The Rust proof does not call `timg`, `kitty +kitten icat`, the Node fixture,
  or another external terminal image renderer.
- The Rust proof is dependency-free for this experiment and does not require
  adding or installing a Rust crate.
- The Rust proof builds one byte buffer and writes that exact buffer to both the
  capture artifact and stdout, then verifies concrete Kitty protocol attribution
  by finding Kitty APC `ESC_G` chunks and rejecting iTerm2 OSC 1337 `File=`
  output. If protocol attribution cannot be proven on the exact bytes sent to
  Ghostty, the result cannot be `Pass`.
- The Ghostty launch path does not use `-e` and does not trigger an interactive
  permission prompt.
- Running the new probe opens an isolated Ghostty window, runs the Rust Kitty
  renderer, captures a nonempty screenshot, and records the renderer exit status
  as `0`.
- The screenshot assertion reuses the Node proof crop and color method unless
  the Rust run records a justified adjustment: default crop
  `520x520+0+(screenshot_height - 620)`, threshold `20` pixels per color, and
  tolerances `red(|r-255|<=35,g<=60,b<=60)`, `green(r<=80,g>=150,b<=80)`,
  `blue(r<=80,g<=80,b>=150)`, and `white(r>=200,g>=200,b>=200)`.
- The retained screenshot path and per-color counts are printed and recorded.
- Any Ghostty process created by the probe is cleaned up before the script
  exits.
- Cleanup does not kill an unrelated Ghostty process such as the developer's
  active terminal.
- Cleanup evidence records pre-existing Ghostty PIDs, probe-owned Ghostty PIDs,
  cleanup target PIDs, post-cleanup absence of probe-owned PIDs, and a final
  process check showing pre-existing Ghostty PIDs were not targeted.
- Temporary files created by the probe are removed before the script exits,
  except the intentionally retained screenshot artifact.
- The Issue 4 matrix is updated to reflect the real Rust Kitty/Ghostty proof
  result.
- `sh -n` passes for any shell script added.
- The new probe script is executable and `test -x <script>` passes.
- The Rust fixture compiles with `rustc` without requiring Cargo metadata.
- `dprint fmt` succeeds on changed documentation files.
- `git diff --check` passes.

Partial criteria:

- Rust can display Kitty graphics in Ghostty, but only through a path that is
  unsuitable for TermPlot v1 without follow-up work, such as broad terminal
  state assumptions, unreliable sizing, or an unmaintained dependency.
- Rust renders visible pixels, but the emitted bytes cannot be conclusively
  attributed to Kitty graphics.
- Pixels render but cleanup, crop stability, compile reproducibility, or
  protocol attribution needs a bounded follow-up before the matrix can be
  treated as fully proven.

Fail criteria:

- Rust cannot emit Kitty graphics in Ghostty without relying on `timg`, Node.js,
  or another external image renderer.
- The output appears as raw escape text, renders no visible image, or fails
  screenshot pixel assertions.
- The launch path triggers a manual permission prompt.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process it did not open.

## Design Review

Reviewer: Beauvoir (`019ecb57-ae7c-7ae3-88f7-3165a8a4c301`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: pixel pass criteria were partly undefined. Fixed by requiring the Rust
  proof to reuse the Node proof crop and color method by default:
  `520x520+0+(screenshot_height - 620)`, threshold `20`, and the same RGB
  tolerances for red, green, blue, and white.
- Major: cleanup criteria did not specify attribution evidence. Fixed by
  requiring pre-existing Ghostty PIDs, probe-owned Ghostty PIDs, cleanup target
  PIDs, post-cleanup absence of probe-owned PIDs, and final evidence that
  pre-existing Ghostty PIDs were not targeted.
- Minor: the byte artifact needed to be tied to the exact stdout bytes sent to
  Ghostty. Fixed by requiring one byte buffer to be written to both the artifact
  and stdout.

Approval: approved from a blocker standpoint. The reviewer recommended fixing
the major findings before committing the plan; those fixes are recorded above.

## Result

**Result:** Pass

Experiment 3 proved that Rust can emit Kitty graphics bytes directly and that
Ghostty renders those bytes as a visible image under the same screenshot/pixel
harness used for the Node proof. The implementation uses a dependency-free raw
RGB24 Kitty encoder compiled with `rustc`, not `timg`, `kitty +kitten icat`, the
Node fixture, a Rust crate, or another terminal image renderer.

Implemented files:

- `scripts/fixtures/rust-kitty-direct.rs`
  - generates a deterministic `64x64` RGB image with red, green, blue, and white
    quadrants;
  - implements base64 encoding with the Rust standard library only;
  - emits Kitty APC chunks with `a=T`, `f=24`, `s=64`, `v=64`, `c=16`, `r=16`,
    `q=2`, and `m=<chunk-state>`;
  - builds one output byte buffer and writes that exact buffer both to
    `--capture=<path>` and stdout;
  - asserts locally that output contains Kitty APC bytes and does not contain
    iTerm2 OSC 1337 `File=` output.
- `scripts/probe-ghostty-rust-kitty.sh`
  - compiles the Rust fixture to a temp binary with `rustc`;
  - launches Ghostty without `-e`, using `--input=path:<input-file>`;
  - feeds a shell function so post-render logic is parsed before the Rust
    command runs;
  - runs the Rust fixture inside Ghostty and captures the exact emitted bytes;
  - verifies those bytes contain Kitty APC `ESC_G` chunks, RGB24 metadata, and
    no iTerm2 `File=` output;
  - captures the controlled Ghostty rectangle with `screencapture`;
  - asserts red, green, blue, and white pixels in the same crop and tolerance
    method used by Experiment 2;
  - records pre-existing Ghostty PIDs, probe-owned Ghostty PIDs, cleanup target
    PIDs, and final process evidence;
  - cleans up only probe-owned Ghostty processes and removes the probe temp dir
    while retaining the screenshot artifact.

Verification commands:

```bash
chmod +x scripts/probe-ghostty-rust-kitty.sh
sh -n scripts/probe-ghostty-rust-kitty.sh
rustc scripts/fixtures/rust-kitty-direct.rs -o /tmp/termplot-rust-kitty-direct
test -x scripts/probe-ghostty-rust-kitty.sh
rustc scripts/fixtures/rust-kitty-direct.rs -o /tmp/termplot-rust-kitty-direct-check
/tmp/termplot-rust-kitty-direct-check --capture=/tmp/termplot-rust-kitty-test.bin >/tmp/termplot-rust-kitty-test.out 2>/tmp/termplot-rust-kitty-test.err
wc -c /tmp/termplot-rust-kitty-test.bin /tmp/termplot-rust-kitty-test.out
perl -0777 -ne 'exit(!(/\x1b_G/ && /\x1b\\/ && /f=24/ && /s=64/ && /v=64/ && !/File=/))' /tmp/termplot-rust-kitty-test.bin
cat /tmp/termplot-rust-kitty-test.err
rg --fixed-strings 'timg' scripts/probe-ghostty-rust-kitty.sh scripts/fixtures/rust-kitty-direct.rs || true
rg --fixed-strings 'node-kitty' scripts/probe-ghostty-rust-kitty.sh scripts/fixtures/rust-kitty-direct.rs || true
rg --fixed-strings -- '-e' scripts/probe-ghostty-rust-kitty.sh || true
scripts/probe-ghostty-rust-kitty.sh
out=/tmp/termplot-ghostty-rust-kitty-verify.log
scripts/probe-ghostty-rust-kitty.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^rust_kitty_probe_tmpdir=//p' "$out" | tail -n 1)
artifact=$(sed -n 's/^pixel_screenshot=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
test -n "$artifact"
test -s "$artifact"
ps -axo pid=,ppid=,command= | rg 'Ghostty|termplot-ghostty-rust-kitty|rust-kitty-direct' || true
dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/03-prove-rust-kitty-output-in-ghostty.md
git diff --check
git add -N scripts/fixtures/rust-kitty-direct.rs scripts/probe-ghostty-rust-kitty.sh
git diff --check
```

The fixture byte check passed:

```text
16466 /tmp/termplot-rust-kitty-test.bin
16466 /tmp/termplot-rust-kitty-test.out
rust_kitty_fixture=direct
rust_kitty_protocol=kitty
rust_kitty_format=rgb24
rust_kitty_size=64x64
rust_kitty_cells=16x16
rust_kitty_bytes=16466
```

The successful live Ghostty run reported:

```text
probe_ghostty_pids=53415
rust_kitty_protocol=kitty
rust_kitty_bytes=16466
rust_status=0
rust_kitty_protocol_attribution=kitty-apc
rust_kitty_output_bytes=16466
rust_kitty_apc_chunks=4
rust_kitty_contains_iterm_file=no
screenshot=/tmp/termplot-ghostty-rust-kitty-termplot-ghostty-rust-kitty-probe.XdhsGT.png
screenshot_bytes=1084155
screenshot_  pixelWidth: 2400
screenshot_  pixelHeight: 1600
pixel_crop=520x520+0+980
pixel_threshold=20
red_count=7938
green_count=8127
blue_count=33895
white_count=35718
cleanup_ghostty_pids=53415
ghostty_processes=cleaned
pass: Ghostty rendered Rust Kitty output, pixels matched, and cleanup completed
```

The wrapper verification run also passed:

```text
rust_kitty_protocol_attribution=kitty-apc
rust_kitty_apc_chunks=4
rust_status=0
red_count=7938
green_count=8127
blue_count=33895
white_count=35218
cleanup_ghostty_pids=53541
ghostty_processes=cleaned
rust_kitty_tmpdir_removed=yes
rust_kitty_artifact_exists=yes
```

The final process check showed only the pre-existing Ghostty process and the
check command itself:

```text
1173     1 /Applications/Ghostty.app/Contents/MacOS/ghostty
```

## Conclusion

Rust is also viable for emitting Kitty graphics in Ghostty on macOS. The direct
Rust proof reached parity with the direct Node.js proof: same image dimensions,
same RGB24 Kitty path, same number of APC chunks, same byte count, same real
Ghostty pixel assertion, and same attributed cleanup behavior.

This means Ghostty Kitty support does not force the TermPlot client/display
layer toward Rust. Both Node.js and Rust can implement the core Kitty protocol
path directly. The next experiment should move to iTerm2 OSC 1337 proof from
Node.js, because v0 used that path and iTerm2 is the other target terminal.

## Completion Review

Reviewer: Peirce (`019ecb5c-88c2-7080-8fe2-91c945460fe6`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: the initial `git diff --check` did not cover the untracked Rust fixture
  and probe files. Fixed by running
  `git add -N scripts/fixtures/rust-kitty-direct.rs scripts/probe-ghostty-rust-kitty.sh`
  followed by `git diff --check`, which passed.

Approval: approved. The reviewer confirmed that the implementation matches the
approved scope, the experiment result and conclusion are present, the README
marks Experiment 3 as `Pass`, static verification passed, the Rust proof is
dependency-free and does not use `timg`, Node.js, or another terminal image
renderer, byte attribution proves Kitty APC output and rejects iTerm2 `File=`,
cleanup is attributed to probe-owned Ghostty processes, and the result had not
been committed before review.

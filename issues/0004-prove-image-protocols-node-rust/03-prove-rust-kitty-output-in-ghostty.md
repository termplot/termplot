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

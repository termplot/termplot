# Experiment 2: Prove Node.js Kitty output in Ghostty

## Description

Prove or reject whether TermPlot can emit Kitty graphics from Node.js and render
the result in Ghostty with the existing macOS screenshot/pixel harness.

Experiment 1 found that Ghostty's documented image protocol is Kitty and that
Node.js has at least two plausible paths: `terminal-image` or a minimal direct
Kitty encoder. This experiment should test Node.js itself, not `timg`, so it can
answer whether a TypeScript/Node client remains viable for the Ghostty display
path.

The proof should start with the smallest reliable path:

1. generate a deterministic PNG with red, green, blue, and white regions;
2. render it through a Node.js Kitty output path inside an isolated Ghostty
   window;
3. capture the controlled Ghostty rectangle;
4. assert screenshot pixels;
5. prove cleanup of only probe-owned processes.

Use a minimal dependency-free Node.js Kitty encoder first. This removes package
and protocol-selection ambiguity from the first proof. Library candidates such
as `terminal-image` can be tested later, after the direct protocol path proves
that Node.js can emit Kitty bytes that Ghostty renders.

## Changes

- Add a dependency-free Node.js proof fixture outside `v0/`, preferably under
  `scripts/fixtures/`, that:
  - loads or generates a deterministic PNG with known red, green, blue, and
    white blocks;
  - emits Kitty graphics escape output from Node.js with a minimal direct
    protocol encoder;
  - writes a captured copy of the emitted bytes to a temp artifact before the
    output is sent to Ghostty;
  - asserts that the emitted bytes contain Kitty APC escape sequences
    (`ESC_G...ESC\\`) and do not contain iTerm2 OSC 1337 `File=` output;
  - exits with a nonzero status if image encoding or output generation fails.
- Add a macOS probe script under `scripts/` that adapts the Issue 2 Ghostty
  harness:
  - launches Ghostty without `-e`;
  - feeds a shell function through `--input=path:<input-file>` so post-render
    logic is parsed before the image command runs;
  - runs the Node.js renderer inside Ghostty;
  - records the Node.js command status and terminal environment;
  - captures the same controlled screen rectangle;
  - asserts red, green, blue, and white pixels with GraphicsMagick;
  - verifies the captured Node.js output artifact contains Kitty protocol bytes;
  - retains a `/tmp/termplot-ghostty-node-kitty-*.png` proof screenshot;
  - cleans up only probe-owned Ghostty processes and temporary files.
- Update the Issue 4 README protocol matrix:
  - mark the Node.js Kitty/Ghostty proof `Pass`, `Partial`, or `Fail`;
  - refine the Node.js Kitty path based on the actual implementation used.
- Record implementation details, command output, screenshot artifact path, pixel
  counts, cleanup evidence, and any failure diagnostics in this experiment file.

## Verification

Pass criteria:

- The Node.js proof does not call `timg`, `kitty +kitten icat`, or another
  external terminal image renderer.
- The Node.js proof is dependency-free for this experiment and does not require
  adding or installing an npm package.
- The Node.js proof captures its emitted bytes and verifies concrete Kitty
  protocol attribution by finding Kitty APC `ESC_G` chunks and rejecting iTerm2
  OSC 1337 `File=` output. If protocol attribution cannot be proven, the result
  cannot be `Pass`.
- The Ghostty launch path does not use `-e` and does not trigger an interactive
  permission prompt.
- Running the new probe opens an isolated Ghostty window, runs the Node.js Kitty
  renderer, captures a nonempty screenshot, and records the renderer exit status
  as `0`.
- The screenshot assertion finds red, green, blue, and white pixel clusters
  above documented thresholds in the expected render crop.
- The retained screenshot path and per-color counts are printed and recorded.
- Any Ghostty process created by the probe is cleaned up before the script
  exits.
- Cleanup does not kill an unrelated Ghostty process such as the developer's
  active terminal.
- Temporary files created by the probe are removed before the script exits,
  except the intentionally retained screenshot artifact.
- The Issue 4 matrix is updated to reflect the real Node.js Kitty/Ghostty proof
  result.
- `sh -n` passes for any shell script added.
- The new probe script is executable and `test -x <script>` passes.
- The Node.js fixture is syntax-checked with `node --check`.
- `dprint fmt` succeeds on changed documentation files.
- `git diff --check` passes.

Partial criteria:

- Node.js can display Kitty graphics in Ghostty, but only through a path that is
  unsuitable for TermPlot v1 without follow-up work, such as broad terminal
  state assumptions, unreliable sizing, or an unmaintained dependency.
- Node.js renders visible pixels, but the emitted bytes cannot be conclusively
  attributed to Kitty graphics.
- Pixels render but cleanup, crop stability, or protocol attribution needs a
  bounded follow-up before the matrix can be treated as fully proven.

Fail criteria:

- Node.js cannot emit Kitty graphics in Ghostty without relying on `timg` or
  another external image renderer.
- The output appears as raw escape text, renders no visible image, or fails
  screenshot pixel assertions.
- The launch path triggers a manual permission prompt.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process it did not open.

## Design Review

Reviewer: Aristotle (`019ecb4d-cdc8-7241-941e-24fd0442cba1`), fresh-context
Codex subagent, read-only.

Findings:

- Blocker: the original pass criteria could succeed without proving Kitty
  protocol output because `terminal-image` can choose multiple protocols. Fixed
  by making the first proof a dependency-free direct Node.js Kitty encoder and
  requiring captured emitted bytes with Kitty APC `ESC_G...ESC\\` sequences and
  no iTerm2 OSC 1337 `File=` output.
- Major: dependency/reproducibility was underspecified for a Node fixture
  outside `v0/`. Fixed by specifying a dependency-free fixture, preferably under
  `scripts/fixtures/`, with no npm package install required for this experiment.
- Minor: executable-script verification was missing. Fixed by requiring the new
  probe script to be executable and checked with `test -x`, and requiring
  `node --check` for the Node.js fixture.

Re-review:

- Prior blocker resolved: the design now requires a direct Node.js Kitty encoder
  and captured emitted bytes checked for Kitty APC chunks while rejecting iTerm2
  OSC 1337 output.
- Prior major resolved: the experiment now specifies a dependency-free fixture
  outside `v0/`, with no npm package install required.
- Prior minor resolved: the pass criteria now require `sh -n`,
  `test -x <script>`, and `node --check`.
- New blockers: none.

Approval: approved.

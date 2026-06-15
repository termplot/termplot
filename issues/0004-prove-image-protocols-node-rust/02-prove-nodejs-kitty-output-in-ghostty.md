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

## Result

**Result:** Pass

Experiment 2 proved that Node.js can emit Kitty graphics bytes directly and that
Ghostty renders those bytes as a visible image under the Issue 2 screenshot
harness. The implementation uses a dependency-free raw RGB24 Kitty encoder, not
`timg`, `kitty +kitten icat`, `terminal-image`, or another terminal image
renderer.

The original design described generating a deterministic PNG. The implementation
intentionally used raw RGB24 payloads instead because Kitty supports `f=24`
pixel data directly, which proves the dependency-free protocol path without
introducing PNG encoding or package-management variables.

Implemented files:

- `scripts/fixtures/node-kitty-direct.js`
  - generates a deterministic `64x64` RGB image with red, green, blue, and white
    quadrants;
  - emits Kitty APC chunks with `a=T`, `f=24`, `s=64`, `v=64`, `c=16`, `r=16`,
    `q=2`, and `m=<chunk-state>`;
  - writes the exact emitted bytes to `--capture=<path>` before sending them to
    stdout;
  - asserts locally that output contains Kitty APC bytes and does not contain
    iTerm2 OSC 1337 `File=` output.
- `scripts/probe-ghostty-node-kitty.sh`
  - launches Ghostty without `-e`, using `--input=path:<input-file>`;
  - feeds a shell function so post-render logic is parsed before the Node
    command runs;
  - runs the Node fixture inside Ghostty and captures the exact emitted bytes;
  - verifies those bytes contain Kitty APC `ESC_G` chunks, RGB24 metadata, and
    no iTerm2 `File=` output;
  - captures the controlled Ghostty rectangle with `screencapture`;
  - asserts red, green, blue, and white pixels in the render crop;
  - cleans up only probe-owned Ghostty processes and removes the probe temp dir
    while retaining the screenshot artifact.

One implementation correction was needed. The first live run failed because the
probe passed the fixture as a relative path. Ghostty started the shell from
`/Users/astrohacker`, so Node looked for
`/Users/astrohacker/scripts/fixtures/node-kitty-direct.js`. The probe cleaned up
its Ghostty process, and the fix was to resolve the fixture path from the repo
root with `pwd -P` before launching Ghostty.

Verification commands:

```bash
chmod +x scripts/probe-ghostty-node-kitty.sh scripts/fixtures/node-kitty-direct.js
sh -n scripts/probe-ghostty-node-kitty.sh
node --check scripts/fixtures/node-kitty-direct.js
test -x scripts/probe-ghostty-node-kitty.sh
test -x scripts/fixtures/node-kitty-direct.js
scripts/fixtures/node-kitty-direct.js --capture=/tmp/termplot-node-kitty-test.bin >/tmp/termplot-node-kitty-test.out 2>/tmp/termplot-node-kitty-test.err
wc -c /tmp/termplot-node-kitty-test.bin /tmp/termplot-node-kitty-test.out
perl -0777 -ne 'exit(!(/\x1b_G/ && /\x1b\\/ && /f=24/ && /s=64/ && /v=64/ && !/File=/))' /tmp/termplot-node-kitty-test.bin
cat /tmp/termplot-node-kitty-test.err
scripts/probe-ghostty-node-kitty.sh
out=/tmp/termplot-ghostty-node-kitty-verify.log
scripts/probe-ghostty-node-kitty.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^node_kitty_probe_tmpdir=//p' "$out" | tail -n 1)
artifact=$(sed -n 's/^pixel_screenshot=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
test -n "$artifact"
test -s "$artifact"
ps -axo pid=,ppid=,command= | rg 'Ghostty|termplot-ghostty-node-kitty|node-kitty-direct' || true
dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/02-prove-nodejs-kitty-output-in-ghostty.md
git diff --check
```

The fixture byte check passed:

```text
16466 /tmp/termplot-node-kitty-test.bin
16466 /tmp/termplot-node-kitty-test.out
node_kitty_fixture=direct
node_kitty_protocol=kitty
node_kitty_format=rgb24
node_kitty_size=64x64
node_kitty_cells=16x16
node_kitty_bytes=16466
```

The successful live Ghostty run reported:

```text
probe_ghostty_pids=52765
node_kitty_protocol=kitty
node_kitty_bytes=16466
node_status=0
node_kitty_protocol_attribution=kitty-apc
node_kitty_output_bytes=16466
node_kitty_apc_chunks=4
node_kitty_contains_iterm_file=no
screenshot=/tmp/termplot-ghostty-node-kitty-termplot-ghostty-node-kitty-probe.qIBP2A.png
screenshot_bytes=1033297
screenshot_  pixelWidth: 2400
screenshot_  pixelHeight: 1600
pixel_crop=520x520+0+980
pixel_threshold=20
red_count=7938
green_count=8127
blue_count=33895
white_count=35218
cleanup_ghostty_pids=52765
ghostty_processes=cleaned
pass: Ghostty rendered Node.js Kitty output, pixels matched, and cleanup completed
```

The wrapper verification run also passed:

```text
node_kitty_protocol_attribution=kitty-apc
node_kitty_apc_chunks=4
node_status=0
red_count=7938
green_count=8127
blue_count=33895
white_count=35218
cleanup_ghostty_pids=52878
ghostty_processes=cleaned
node_kitty_tmpdir_removed=yes
node_kitty_artifact_exists=yes
```

The final process check showed only the pre-existing Ghostty process and the
check command itself:

```text
1173     1 /Applications/Ghostty.app/Contents/MacOS/ghostty
```

## Conclusion

Node.js is viable for emitting Kitty graphics in Ghostty on macOS. The proof is
stronger than a library smoke test because it attributes the exact bytes to
Kitty APC output and then verifies real pixels from Ghostty's rendered window.

The next experiment should prove Rust Kitty output in Ghostty using the same
harness and the same byte-attribution standard. That gives a fair Node.js versus
Rust comparison for the primary Ghostty path before moving to iTerm2 OSC 1337
proofs.

## Completion Review

Reviewer: Mill (`019ecb54-4621-7db2-9216-3f1e558649ce`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: the design mentioned generating a deterministic PNG, while the
  implementation intentionally used raw RGB24 Kitty `f=24` payloads. Fixed by
  recording that raw RGB24 was chosen to prove the dependency-free direct Kitty
  path without PNG encoding/package variables.
- Minor: the Issue 4 README did not carry forward the byte-attribution learning
  for later Kitty proofs. Fixed by adding byte capture, Kitty APC assertion, and
  iTerm2 `File=` rejection to the issue verification strategy.

Approval: approved. The reviewer confirmed that the implementation matches the
approved scope, the result and conclusion are present, the README marks
Experiment 2 as `Pass`, static verification passed, the Node proof does not use
external terminal image renderers, protocol attribution proves Kitty APC output,
cleanup is attributed to probe-owned processes, and the result had not been
committed before review.

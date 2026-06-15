# Experiment 4: Prove Node.js iTerm2 OSC 1337 output

## Description

Prove or reject whether TermPlot can emit iTerm2 inline image protocol output
from Node.js and render the result in iTerm2 with real screenshot/pixel
assertions and attributed cleanup.

V0 used `ansi-escapes.image(...)`, which emits the iTerm2 inline image protocol,
but Issue 4 needs a proof owned by this repository, not a dependency smoke test.
This experiment should use a minimal dependency-free Node.js fixture that emits
OSC 1337 `File=` output directly and captures the exact emitted bytes for
protocol attribution.

iTerm2 is installed locally at `/Applications/iTerm.app`, and its binary exposes
`--command=<command>`. The proof should prefer this built-in launch path over
AppleScript, Accessibility typing, or interactive automation. Permission prompts
are failures, not dialogs to accept.

## Changes

- Add a dependency-free Node.js iTerm2 proof fixture outside `v0/`, preferably
  under `scripts/fixtures/`, that:
  - generates a deterministic PNG with red, green, blue, and white quadrants
    using Node.js built-ins only;
  - emits OSC 1337 `File=` inline image output with `inline=1` and explicit
    sizing metadata;
  - builds one byte buffer and writes that exact buffer both to a temp artifact
    and to stdout so protocol attribution applies to the bytes sent to iTerm2;
  - asserts that the emitted bytes contain OSC 1337 `File=` output and do not
    contain Kitty APC `ESC_G` output;
  - exits with a nonzero status if PNG encoding or output generation fails.
- Add a macOS probe script under `scripts/` that:
  - launches iTerm2 without AppleScript or Accessibility typing, using
    `open -na iTerm.app --args --command=<quoted-probe-shell-command>`, where
    the quoted command references the probe temp path so iTerm2 process
    attribution can match probe-owned commands;
  - runs a shell script or shell function that invokes the Node.js renderer,
    records status, and holds the window open long enough to capture;
  - records pre-existing iTerm2 PIDs, probe-owned iTerm2 PIDs matched through
    the probe temp path, cleanup target PIDs, post-cleanup absence of
    probe-owned PIDs, and evidence that pre-existing iTerm2 PIDs were not
    targeted;
  - discovers the probe-owned iTerm2 window bounds before screenshot capture, or
    records why discovery is unavailable and uses a bounded diagnostic fallback;
  - captures the probe-owned iTerm2 window or a rectangle derived from that
    window, not an unrelated hardcoded region;
  - verifies the captured Node.js output artifact contains OSC 1337 protocol
    bytes and not Kitty protocol bytes;
  - asserts red, green, blue, and white pixels with GraphicsMagick;
  - retains a `/tmp/termplot-iterm2-node-osc1337-*.png` proof screenshot;
  - cleans up only probe-owned iTerm2 processes and temporary files.
- Update the Issue 4 README protocol matrix:
  - mark the Node.js iTerm2 OSC 1337/iTerm2 proof `Pass`, `Partial`, or `Fail`;
  - refine the Node.js iTerm2 path based on the actual implementation used.
- Record implementation details, command output, screenshot artifact path, pixel
  counts, cleanup evidence, and any failure diagnostics in this experiment file.

## Verification

Pass criteria:

- The Node.js proof does not call `ansi-escapes`, `terminal-image`, `timg`,
  `imgcat`, `kitty +kitten icat`, or another external terminal image renderer.
- The Node.js proof is dependency-free for this experiment and does not require
  adding or installing an npm package.
- The Node.js proof builds one byte buffer and writes that exact buffer to both
  the capture artifact and stdout, then verifies concrete iTerm2 protocol
  attribution by finding OSC 1337 `File=` output and rejecting Kitty APC `ESC_G`
  output. If protocol attribution cannot be proven on the exact bytes sent to
  iTerm2, the result cannot be `Pass`.
- The iTerm2 launch path does not use AppleScript, Accessibility typing, or an
  interactive permission prompt.
- Running the new probe opens an isolated iTerm2 window, runs the Node.js OSC
  1337 renderer, captures a nonempty screenshot, and records the renderer exit
  status as `0`.
- Screenshot capture is tied to the probe-owned iTerm2 window. The probe must
  first try non-interactive window discovery for the iTerm2 window associated
  with the probe command or title. If discovery succeeds, the captured rectangle
  must be derived from those bounds. If discovery fails, the experiment may use
  a bounded hardcoded fallback only as `Partial` unless it records diagnostics
  proving why the fallback still captured the probe-owned iTerm2 window.
- The screenshot assertion uses an explicit crop, numeric threshold, and RGB
  tolerances. It may start with the Ghostty crop method, but any iTerm2-specific
  adjustment must be recorded with the final crop geometry.
- The screenshot assertion finds red, green, blue, and white pixel clusters
  above threshold in the expected render crop.
- The retained screenshot path and per-color counts are printed and recorded.
- Any iTerm2 process created by the probe is cleaned up before the script exits.
- Cleanup does not kill an unrelated iTerm2 process such as a developer's active
  iTerm2 session.
- Cleanup evidence records pre-existing iTerm2 PIDs, probe-owned iTerm2 PIDs,
  cleanup target PIDs, post-cleanup absence of probe-owned PIDs, and a final
  process check showing pre-existing iTerm2 PIDs were not targeted.
- Temporary files created by the probe are removed before the script exits,
  except the intentionally retained screenshot artifact.
- The Issue 4 matrix is updated to reflect the real Node.js iTerm2 OSC 1337
  proof result.
- `sh -n` passes for any shell script added.
- The new probe script is executable and `test -x <script>` passes.
- The Node.js fixture is syntax-checked with `node --check`.
- `dprint fmt` succeeds on changed documentation files.
- `git diff --check` passes, including new files via staging or intent-add.

Partial criteria:

- Node.js can display OSC 1337 images in iTerm2, but only through a path that is
  unsuitable for TermPlot v1 without follow-up work, such as unreliable sizing,
  layout/cursor instability, or an automation path that is too fragile.
- Node.js renders visible pixels, but the emitted bytes cannot be conclusively
  attributed to OSC 1337 `File=` output.
- Pixels render but cleanup, crop stability, or protocol attribution needs a
  bounded follow-up before the matrix can be treated as fully proven.

Fail criteria:

- Node.js cannot emit iTerm2 inline images in iTerm2 without relying on
  `ansi-escapes`, `terminal-image`, `timg`, or another external image renderer.
- The output appears as raw escape text, renders no visible image, or fails
  screenshot pixel assertions.
- The launch path triggers a manual permission prompt.
- The script leaves a probe-owned iTerm2 process running after it exits.
- The script kills or targets an iTerm2 process it did not open.

## Design Review

Reviewer: Russell (`019ecb60-c3ea-7113-b772-f09dd9d301ed`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: the first design required a controlled screenshot rectangle without
  specifying how the probe would control or discover iTerm2 window geometry.
  Fixed by requiring non-interactive discovery of the probe-owned iTerm2 window
  bounds before capture, or a bounded diagnostic fallback that cannot be treated
  as `Pass` unless it proves the rectangle captured the probe-owned window.
- Minor: the launch command shape was ambiguous. Fixed by spelling out the
  intended `open -na iTerm.app --args --command=<quoted-probe-shell-command>`
  form and requiring the probe temp path to appear in that command for process
  attribution.

Approval: approved.

## Result

**Result:** Pass

Experiment 4 proved that Node.js can emit iTerm2 OSC 1337 `File=` inline image
bytes directly and that iTerm2 renders those bytes as a visible image under a
real screenshot/pixel harness. The implementation uses a dependency-free PNG
encoder and direct OSC 1337 emitter, not `ansi-escapes`, `terminal-image`,
`timg`, `imgcat`, `kitty +kitten icat`, or another external terminal image
renderer.

Implemented files:

- `scripts/fixtures/node-iterm2-osc1337-direct.js`
  - generates a deterministic `64x64` RGBA image with red, green, blue, and
    white quadrants;
  - encodes that image as PNG using Node.js built-ins and `zlib`;
  - emits OSC 1337 `File=` output with `inline=1`, `size=<png-bytes>`,
    `width=16`, and `preserveAspectRatio=1`;
  - builds one output byte buffer and writes that exact buffer both to
    `--capture=<path>` and stdout;
  - asserts locally that output contains OSC 1337 `File=` bytes and does not
    contain Kitty APC output.
- `scripts/probe-iterm2-node-osc1337.sh`
  - launches iTerm2 with
    `open -na iTerm.app --args --command=<quoted-probe-shell-command>`;
  - temporarily sets and restores iTerm2 defaults needed for unattended testing:
    `SUEnableAutomaticChecks=false`, `NoSyncSuppressDownloadConfirmation=true`,
    `NoSyncSuppressPromptToEnableResizing=true`, and
    `NoSyncSuppressPromptToEnableUnfocusedResizing=true`;
  - uses terminal window-control escapes to request a known iTerm2 window
    position and size without AppleScript or Accessibility typing;
  - discovers the probe-owned iTerm2 window with CoreGraphics from `swift` by
    matching the unique probe title, then derives the `screencapture` rectangle
    from that window's bounds;
  - captures the exact emitted OSC 1337 bytes and verifies that they are not
    Kitty bytes;
  - captures the discovered probe-owned iTerm2 window rectangle with
    `screencapture`;
  - dynamically detects the rendered red/green/blue image bounds and counts red,
    green, blue, and white pixels inside the detected crop;
  - records pre-existing iTerm2/iTermServer PIDs, probe-owned iTerm2 PIDs,
    probe-attributed iTermServer helper PIDs, cleanup target PIDs, and final
    process evidence;
  - cleans up only probe-owned iTerm2 and strictly attributed iTermServer
    processes, then removes the probe temp dir while retaining the screenshot
    artifact.

Two implementation corrections were needed:

- iTerm2 first opened Sparkle's update-check prompt. The probe now temporarily
  writes `SUEnableAutomaticChecks=false` and restores the previous value.
- iTerm2 then blocked terminal-initiated display and resize control with safety
  prompts. The probe now temporarily suppresses those prompts with documented
  iTerm2 defaults discovered from the app's advanced setting strings, then
  restores the previous values.
- The initial Ghostty-style lower-left crop was wrong for iTerm2 because OSC
  1337 renders near the upper-left terminal content. The probe now detects the
  saturated red/green/blue bounds in the captured screenshot and records the
  final crop used for pixel assertions.
- The first passing implementation used a fixed rectangle after requesting
  window geometry. Completion review rejected that as too weak. The probe now
  discovers the iTerm2 window by its unique title through CoreGraphics and
  derives the capture rectangle from the discovered `window_bounds`.
- The first passing implementation killed any iTermServer helper that appeared
  after probe start. Completion review rejected that as ambiguous. The probe now
  kills a new iTermServer helper only when there were no pre-existing iTerm2 or
  iTermServer processes, and records that condition. Otherwise, new helpers are
  diagnostic only.

Verification commands:

```bash
chmod +x scripts/fixtures/node-iterm2-osc1337-direct.js scripts/probe-iterm2-node-osc1337.sh
node --check scripts/fixtures/node-iterm2-osc1337-direct.js
sh -n scripts/probe-iterm2-node-osc1337.sh
test -x scripts/fixtures/node-iterm2-osc1337-direct.js
test -x scripts/probe-iterm2-node-osc1337.sh
scripts/fixtures/node-iterm2-osc1337-direct.js --capture=/tmp/termplot-iterm2-osc1337-test2.bin --png=/tmp/termplot-iterm2-osc1337-test2.png >/tmp/termplot-iterm2-osc1337-test2.out 2>/tmp/termplot-iterm2-osc1337-test2.err
wc -c /tmp/termplot-iterm2-osc1337-test2.bin /tmp/termplot-iterm2-osc1337-test2.out /tmp/termplot-iterm2-osc1337-test2.png
perl -0777 -ne 'exit(!(/\x1b\]1337;File=/ && /inline=1/ && !/\x1b_G/))' /tmp/termplot-iterm2-osc1337-test2.bin
file /tmp/termplot-iterm2-osc1337-test2.png
cat /tmp/termplot-iterm2-osc1337-test2.err
rg --fixed-strings 'ansi-escapes' scripts/probe-iterm2-node-osc1337.sh scripts/fixtures/node-iterm2-osc1337-direct.js || true
rg --fixed-strings 'terminal-image' scripts/probe-iterm2-node-osc1337.sh scripts/fixtures/node-iterm2-osc1337-direct.js || true
rg --fixed-strings 'timg' scripts/probe-iterm2-node-osc1337.sh scripts/fixtures/node-iterm2-osc1337-direct.js || true
rg --fixed-strings 'kitty +kitten' scripts/probe-iterm2-node-osc1337.sh scripts/fixtures/node-iterm2-osc1337-direct.js || true
scripts/probe-iterm2-node-osc1337.sh
out=/tmp/termplot-iterm2-node-osc1337-verify.log
scripts/probe-iterm2-node-osc1337.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^iterm2_probe_tmpdir=//p' "$out" | tail -n 1)
artifact=$(sed -n 's/^pixel_screenshot=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
test -n "$artifact"
test -s "$artifact"
ps -axo pid=,ppid=,command= | rg 'iTerm|termplot-iterm2-node-osc1337|node-iterm2-osc1337|iTermServer' || true
defaults read com.googlecode.iterm2 SUEnableAutomaticChecks 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressDownloadConfirmation 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressPromptToEnableResizing 2>/dev/null || echo '<unset>'
defaults read com.googlecode.iterm2 NoSyncSuppressPromptToEnableUnfocusedResizing 2>/dev/null || echo '<unset>'
dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/04-prove-nodejs-iterm2-osc1337-output.md
node --check scripts/fixtures/node-iterm2-osc1337-direct.js
sh -n scripts/probe-iterm2-node-osc1337.sh
git add -N scripts/fixtures/node-iterm2-osc1337-direct.js scripts/probe-iterm2-node-osc1337.sh
git diff --check
```

The fixture byte check passed:

```text
321 /tmp/termplot-iterm2-osc1337-test2.bin
321 /tmp/termplot-iterm2-osc1337-test2.out
162 /tmp/termplot-iterm2-osc1337-test2.png
/tmp/termplot-iterm2-osc1337-test2.png: PNG image data, 64 x 64, 8-bit/color RGBA, non-interlaced
node_iterm2_fixture=direct
node_iterm2_protocol=osc1337
node_iterm2_png_size=64x64
node_iterm2_png_bytes=162
node_iterm2_output_bytes=321
```

The successful live iTerm2 run with CoreGraphics window discovery reported:

```text
probe_iterm2_pids=55625
window_id=782
window_owner=iTerm2
window_title=TermPlot iTerm2 OSC1337 probe termplot-iterm2-node-osc1337-probe.Axu3f9
window_bounds=600,379,587,462
capture_rect=600,379,587,462
node_iterm2_protocol=osc1337
node_iterm2_png_bytes=162
node_iterm2_output_bytes=321
node_status=0
node_iterm2_protocol_attribution=osc1337-file
node_iterm2_contains_osc1337_file=yes
node_iterm2_contains_kitty_apc=no
screenshot=/tmp/termplot-iterm2-node-osc1337-termplot-iterm2-node-osc1337-probe.Axu3f9.png
screenshot_bytes=89216
screenshot_  pixelWidth: 1174
screenshot_  pixelHeight: 924
pixel_crop=256x256+0+54
pixel_detected_bounds=224x224+10+70
pixel_threshold=20
red_count=12312
green_count=12321
blue_count=12431
white_count=12570
cleanup_iterm2_pids=55625
cleanup_iterm2_server_pids=55631
post_cleanup_preexisting_iterm2_pids=
post_cleanup_preexisting_iterm2_server_pids=
iterm2_processes=cleaned
pass: iTerm2 rendered Node.js OSC 1337 output, pixels matched, and cleanup completed
```

The wrapper verification run also passed:

```text
node_iterm2_protocol_attribution=osc1337-file
node_iterm2_contains_osc1337_file=yes
node_iterm2_contains_kitty_apc=no
node_status=0
window_id=795
window_owner=iTerm2
window_title=TermPlot iTerm2 OSC1337 probe termplot-iterm2-node-osc1337-probe.74wZ1Y
window_bounds=600,379,587,462
capture_rect=600,379,587,462
pixel_crop=256x256+0+54
pixel_detected_bounds=224x224+10+70
red_count=12312
green_count=12321
blue_count=12431
white_count=12570
cleanup_iterm2_pids=55851
cleanup_iterm2_server_pids=55857
post_cleanup_preexisting_iterm2_pids=
post_cleanup_preexisting_iterm2_server_pids=
iterm2_processes=cleaned
iterm2_node_osc1337_tmpdir_removed=yes
iterm2_node_osc1337_artifact_exists=yes
```

The final process check showed no iTerm2 or iTermServer leftovers, only the
check command itself. The temporary iTerm2 defaults were restored to their prior
absent state:

```text
<unset>
<unset>
<unset>
<unset>
```

## Conclusion

Node.js is viable for emitting iTerm2 OSC 1337 inline images in iTerm2 on macOS.
The proof attributes the exact bytes to OSC 1337 `File=` output, rejects Kitty
APC output, verifies a real iTerm2-rendered screenshot, and cleans up the iTerm2
processes it opened.

The next experiment should prove Rust iTerm2 OSC 1337 output in iTerm2 using the
same PNG, byte-attribution, prompt-suppression, dynamic-crop, and cleanup
standards. After that, Issue 4 can decide whether further SIXEL/ANSI fallback
proofs are necessary for the v1 client-language decision.

## Completion Review

Reviewer: Aquinas (`019ecb6b-de7b-70f3-888b-7c6726505f1c`), fresh-context Codex
subagent, read-only.

Initial findings:

- Blocker: the first result used a fixed screenshot rectangle after requesting
  iTerm2 geometry, but did not prove the captured rectangle belonged to the
  probe-owned window. Fixed by adding a Swift CoreGraphics window finder that
  matches the unique probe temp basename in the iTerm2 window title, records
  `window_id`, `window_owner`, `window_title`, and `window_bounds`, and derives
  `capture_rect` from those bounds before `screencapture`.
- Blocker: the first cleanup path killed every iTermServer helper that appeared
  after probe start. Fixed by killing a new iTermServer helper only when no
  pre-existing iTerm2 or iTermServer processes were present; otherwise helpers
  are diagnostic only.
- Major: final cleanup evidence did not explicitly show pre-existing iTerm2 PIDs
  were not targeted. Fixed by recording pre-existing iTerm2/iTermServer PIDs and
  post-cleanup pre-existing PID fields.
- Major: issue-level later-work learnings did not include the reusable iTerm2
  proof standard. Fixed in the Issue 4 README verification strategy.
- Minor: none.

Re-review:

- Prior fixed-rectangle blocker resolved.
- Prior iTermServer attribution blocker resolved for the reviewed scope.
- Prior final cleanup evidence major resolved.
- Prior issue README learning major resolved.
- New blockers: none.

Approval: approved. The reviewer confirmed that static checks passed, the result
commit had not been made before review, and no blockers remained.

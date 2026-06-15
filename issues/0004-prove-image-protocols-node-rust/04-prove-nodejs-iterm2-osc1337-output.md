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

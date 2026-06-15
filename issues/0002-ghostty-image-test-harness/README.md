+++
status = "open"
opened = "2026-06-15"
+++

# Issue 2: Ghostty image test harness

## Goal

Create a Ghostty-based macOS integration test harness for TermPlot that proves
terminal image rendering works end to end: launch an isolated Ghostty window,
display a known test image, capture the window, and assert from screenshot
pixels that the expected image is visible. The harness must be unattended:
interactive permission prompts are failures to detect and avoid, not dialogs for
automation to accept.

## Background

TermPlot needs full-stack confidence that terminal image output actually renders
inside real terminals, not just that bytes are written to stdout. Ghostty is the
primary target terminal for the next implementation work because it is the
terminal currently used for development and supports the Kitty graphics
protocol.

The `timg` tool is installed and can act as an independent known-good renderer.
It supports Kitty graphics output with `timg -p kitty`, along with iTerm2,
SIXEL, and text-cell fallbacks. Using `timg` first separates terminal/window
automation problems from TermPlot protocol-generation problems.

On macOS, Ghostty's own help says launching the GUI directly from the CLI is not
supported. The supported pattern is:

```bash
open -na Ghostty.app --args ...
```

Ghostty accepts command/config arguments, including `-e <command>` for an
initial command. This should allow isolated test windows that do not disturb the
developer's active Ghostty session. Accessibility API typing may still be useful
later, but scripted launch should be tested first because it is simpler and more
deterministic.

## Analysis

The harness should prove four capabilities in order:

1. Launch and close an isolated Ghostty test window without interfering with the
   active terminal session.
2. Render a known image in that window using `timg -p kitty`.
3. Capture the specific test window as a screenshot.
4. Analyze screenshot pixels to verify that the expected image appeared.

The first experiments should avoid TermPlot rendering code entirely. Once the
Ghostty automation and screenshot assertion path is reliable with `timg`, later
experiments can replace `timg` with TermPlot's own Kitty protocol output.

Current findings:

- Experiment 1's initial probe proved that
  `open -na Ghostty.app --args
  --wait-after-command=false -e <script>` can
  launch an isolated Ghostty command on macOS and let the parent process observe
  marker output from that command. It also exposed a cleanup requirement:
  Ghostty app processes can remain alive after the child command exits, so every
  probe must explicitly clean up only the processes it opened.
- The temp-script launch form is not acceptable for unattended automation. It
  triggers a macOS confirmation dialog asking whether Ghostty should be allowed
  to execute the generated script. Future experiments must find a prompt-free
  launch mechanism, such as running a trusted shell command directly, using
  Ghostty configuration, or another deterministic path that does not require
  Accessibility API click-through.
- The inline `/bin/sh -lc` launch form still uses Ghostty's explicit `-e`
  command path and also triggered an interactive approval prompt. The failure is
  broader than generated temp scripts: `open -na Ghostty.app --args -e ...` is
  not a viable unattended launch mechanism on this machine.
- Experiment 2 found a viable unattended control-plane path: launch Ghostty
  without `-e`, disable default Ghostty config files for isolation, and pass
  `--input=path:<input-file>` so a normal shell receives startup text through
  the PTY. This wrote the marker, exited, removed the temporary directory, and
  left only the pre-existing active Ghostty process.
- Experiment 3 proved that the startup-input harness can run `timg -p kitty`
  inside Ghostty against a generated local PPM image. The first implementation
  hung because follow-up shell commands were still queued in PTY input while
  `timg` was running; wrapping the Ghostty-side logic in a shell function fixed
  that by ensuring the shell parsed the post-render logic before `timg` started.
- Experiment 4 proved that the rendered Ghostty window can be captured
  unattended with `screencapture`. CoreGraphics window-ID discovery through
  `osascript` could not see the Ghostty window in this environment, so the probe
  instead positions the isolated Ghostty window at a controlled rectangle and
  captures that rectangle with `screencapture -x -R...`.
- Experiment 5 completed the end-to-end proof by analyzing a fresh screenshot
  with GraphicsMagick. The probe retained a `/tmp/termplot-ghostty-pixel-*.png`
  artifact, cropped the lower-left render band, and found red, green, blue, and
  white pixel counts above threshold while cleaning up probe-owned Ghostty
  processes and temporary files.

Important constraints:

- Do not use Ghostty's explicit `-e` launch path for unattended automation on
  this machine; Experiment 1 showed that it can trigger interactive command
  execution prompts.
- Do not use Accessibility API automation to accept permission prompts as part
  of the default harness. Permission prompts should be preflighted, avoided, or
  reported as setup failures.
- Keep test windows isolated and identifiable.
- Every experiment must clean up after itself before it can be closed. Any
  process, window, temporary file, or permission state an experiment creates
  must be removed or explicitly documented as intentionally persistent.
- Avoid depending on a user's active Ghostty shell state.
- Cleanup must be attributed. A harness may kill only processes it opened, never
  a generic Ghostty process that may belong to the user's active terminal.
- Record any macOS permissions needed for screenshot capture or Accessibility
  control.
- Pixel assertions should use a simple known image with distinctive colors and
  geometry so failures are easy to diagnose.

## Experiments

- [Experiment 1: Probe isolated Ghostty launch](01-probe-isolated-ghostty-launch.md) -
  **Fail**
- [Experiment 2: Probe Ghostty startup input](02-probe-ghostty-startup-input.md) -
  **Pass**
- [Experiment 3: Render timg through Ghostty input](03-render-timg-through-ghostty-input.md) -
  **Pass**
- [Experiment 4: Capture Ghostty render screenshot](04-capture-ghostty-render-screenshot.md) -
  **Pass**
- [Experiment 5: Assert screenshot pixels](05-assert-screenshot-pixels.md) -
  **Pass**

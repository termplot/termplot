+++
status = "open"
opened = "2026-06-15"
+++

# Issue 2: Ghostty image test harness

## Goal

Create a Ghostty-based macOS integration test harness for TermPlot that proves
terminal image rendering works end to end: launch an isolated Ghostty window,
display a known test image, capture the window, and assert from screenshot
pixels that the expected image is visible.

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

Important constraints:

- Prefer deterministic command launch with `open -na Ghostty.app --args -e
  <script>` before using Accessibility API keyboard injection.
- Keep test windows isolated and identifiable.
- Avoid depending on a user's active Ghostty shell state.
- Record any macOS permissions needed for screenshot capture or Accessibility
  control.
- Pixel assertions should use a simple known image with distinctive colors and
  geometry so failures are easy to diagnose.

## Experiments

- [Experiment 1: Probe isolated Ghostty launch](01-probe-isolated-ghostty-launch.md) -
  **Designed**

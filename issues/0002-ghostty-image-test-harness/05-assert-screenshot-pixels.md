+++
status = "designed"
opened = "2026-06-15"
+++

# Experiment 5: Assert screenshot pixels

## Description

Complete the Ghostty image test harness by analyzing the screenshot captured
from the isolated Ghostty window and asserting that the known rendered image is
actually visible.

Experiment 4 proved that the harness can render with `timg -p kitty`, capture a
nonempty screenshot, and clean up. This experiment adds the final missing
capability from Issue 2: inspect screenshot pixels and verify the expected red,
green, blue, and white regions from the deterministic test image.

## Changes

- Add `scripts/probe-ghostty-pixel-assertion.sh`, a macOS-only probe script
  that:
  - reuses the Experiment 4 screenshot probe or its core launch/capture logic;
  - obtains a fresh screenshot artifact from an isolated Ghostty render;
  - uses GraphicsMagick (`gm`) and standard shell tooling to inspect pixels
    without adding new package dependencies;
  - crops the lower-left terminal content area where the test image is expected
    after the prompt and `timg` output;
  - counts pixels close to the expected red, green, blue, and white test-image
    colors inside that crop;
  - records per-color counts, tolerances, crop geometry, and thresholds;
  - fails if any expected color is missing or below threshold;
  - writes the final screenshot to a stable `/tmp/termplot-ghostty-pixel-*.png`
    artifact path outside the probe temp directory, prints that path, and
    removes the probe temp directory without deleting the retained screenshot;
  - cleans up probe-owned Ghostty processes and temporary files.
- Keep the pixel assertion probe outside `v0/`.
- Update the issue README with whether full launch, render, screenshot, and
  pixel assertion now work end to end.

### Pixel Method

The script will analyze a fixed crop from the retained screenshot rather than
the full screenshot. Experiment 4 captures a `1200x800` point rectangle, which
is `2400x1600` pixels on the current Retina display. The `timg` output appears
near the lower-left of the terminal content, so the initial crop will be:

```text
x = 0
y = screenshot_height - 220
width = 220
height = 220
```

The script will use:

```bash
gm convert "$screenshot" -crop "${crop_width}x${crop_height}+${crop_x}+${crop_y}" txt:-
```

Then it will count pixels whose RGB channels are within tolerance of each
expected color:

```text
red:   |r - 255| <= 35, g <= 60,  b <= 60
green: r <= 80,  g >= 150, b <= 80
blue:  r <= 80,  g <= 80,  b >= 150
white: r >= 200, g >= 200, b >= 200
```

Each expected color must have at least 20 matching pixels in the crop. This
threshold is intentionally higher than isolated UI/chrome pixels but low enough
to tolerate antialiasing, terminal scaling, and the small 32x32 source image.
The result will print `red_count`, `green_count`, `blue_count`, `white_count`,
the crop geometry, and the threshold.

## Verification

Pass criteria:

- `scripts/probe-ghostty-pixel-assertion.sh` exists, is executable, and does not
  call Ghostty with `-e`.
- Running `scripts/probe-ghostty-pixel-assertion.sh` launches Ghostty
  unattended, renders the known image with `timg -p kitty`, captures a nonempty
  screenshot, and records `timg_status=0`.
- The script finds red, green, blue, and white pixel clusters above documented
  thresholds in the lower-left render crop of the screenshot.
- The script prints crop geometry, color tolerances, threshold, and per-color
  counts.
- The script prints the retained screenshot path and per-color evidence.
- Any Ghostty process created by the probe is cleaned up before the script
  exits.
- The cleanup path does not kill an unrelated Ghostty process such as the
  developer's active terminal.
- Temporary files created by the probe are removed before the script exits,
  except the intentionally retained screenshot artifact.
- `git diff --check` passes.

Fail criteria:

- The launch path triggers an interactive permission prompt.
- `timg` is missing or exits nonzero inside Ghostty.
- Screenshot capture fails or produces an empty file.
- Any expected color cluster is missing or below threshold.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process that it did not open.

## Design Review

Reviewer: Codex subagent `019ecb0c-cedc-7bd3-94b6-81deb7433607` with fresh
context.

Findings:

- Blocker: the pixel assertion criteria were too vague. Fixed by defining the
  crop geometry, `gm convert ... txt:-` method, explicit color tolerances, and a
  minimum count threshold of 20 pixels per color.
- Major: retained artifact behavior was ambiguous. Fixed by requiring a stable
  `/tmp/termplot-ghostty-pixel-*.png` artifact path outside the probe temp
  directory.
- Major: broad screenshot scanning could be fooled by terminal chrome or theme
  colors. Fixed by tying analysis to the expected lower-left render crop where
  the deterministic test image appears.
- Minor: none.

Re-review:

- Prior blocker resolved: pixel criteria are now concrete.
- Prior major resolved: screenshot retention path is explicit.
- Prior major resolved: analysis is tied to the expected lower-left render crop,
  not a broad screenshot scan.
- New blockers: none.

Approval: approved.

+++
status = "designed"
opened = "2026-06-15"
+++

# Experiment 3: Render timg through Ghostty input

## Description

Prove that the prompt-free Ghostty startup `input` control plane from Experiment
2 can run a real terminal image renderer. The renderer for this experiment is
`timg -p kitty`, using Ghostty's Kitty graphics support and a generated local
test image.

This experiment does not yet prove that pixels are visible on screen. It proves
that the harness can launch Ghostty unattended, feed a rendering command through
the PTY, run `timg` successfully inside the terminal, hold the window open long
enough for later screenshot work, and clean up without disturbing the active
Ghostty session.

## Changes

- Add `scripts/probe-ghostty-timg-render.sh`, a macOS-only probe script that:
  - creates a temporary marker file, log file, input file, and deterministic
    test image;
  - generates a small PPM image with distinctive red, green, blue, and white
    regions using shell-safe file writes, avoiding extra image-generation
    dependencies;
  - launches Ghostty without `-e`, using the startup `input` path proven by
    Experiment 2;
  - runs `/opt/homebrew/bin/timg -p kitty <image>` from inside Ghostty;
  - records `timg`'s exit status and relevant environment details in the log;
  - waits briefly after rendering so the image would be observable by the next
    screenshot experiment;
  - cleans up only Ghostty processes attributable to this probe and removes its
    temporary files.
- Keep this probe outside `v0/`.
- Update the issue README with whether `timg -p kitty` can run through the
  startup-input harness and what remains for screenshot/pixel verification.

## Verification

Pass criteria:

- `scripts/probe-ghostty-timg-render.sh` exists, is executable, and does not
  call Ghostty with `-e`.
- Running `scripts/probe-ghostty-timg-render.sh` opens an isolated Ghostty
  window without an interactive permission prompt.
- The startup input runs `timg -p kitty` against the generated test image.
- The Ghostty-side command records `timg_status=0`.
- The parent process observes a completion marker written after `timg` returns.
- Any Ghostty process created by the probe is cleaned up before the script
  exits.
- The cleanup path does not kill an unrelated Ghostty process such as the
  developer's active terminal.
- Temporary files created by the probe are removed before the script exits.
- `git diff --check` passes.

Fail criteria:

- The launch path triggers an interactive permission prompt.
- `timg` is missing or exits nonzero inside Ghostty.
- The completion marker is not observed before the timeout.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process that it did not open.

## Design Review

Reviewer: Codex subagent `019ecafb-5830-7040-ae47-446ac86c2d65` with fresh
context.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links this
experiment with status `Designed`, the required sections are present, the scope
is narrow, implementation has not started, verification has concrete pass/fail
criteria, the issue learnings will be recorded back into the README, and the
plan avoids Ghostty's failed explicit `-e` path.

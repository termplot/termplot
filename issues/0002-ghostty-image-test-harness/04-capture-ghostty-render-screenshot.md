+++
status = "designed"
opened = "2026-06-15"
+++

# Experiment 4: Capture Ghostty render screenshot

## Description

Capture a screenshot of the isolated Ghostty window after rendering the known
test image with `timg -p kitty`.

Experiment 3 proved that the harness can launch Ghostty unattended, feed shell
logic through startup `input`, run `timg -p kitty`, observe `timg_status=0`, and
clean up. This experiment adds the next missing capability: capture the specific
test window as an image file. It still defers pixel assertions to the next
experiment.

## Changes

- Add `scripts/probe-ghostty-screenshot.sh`, a macOS-only probe script that:
  - reuses the Experiment 3 startup-input and function-wrapper pattern;
  - renders the same deterministic four-color PPM image with `timg -p kitty`;
  - holds the Ghostty window open after rendering;
  - discovers the test window ID using its unique title;
  - captures only that window with `screencapture -x -l<windowid> <png>`;
  - records screenshot path, file size, dimensions if available, and any macOS
    permission failure;
  - treats missing Screen Recording permission or any interactive prompt as a
    setup failure, not as something to accept automatically;
  - cleans up only probe-owned Ghostty processes and temporary files.
- Keep the screenshot probe outside `v0/`.
- Update the issue README with whether unattended screenshot capture is viable
  and what permissions or setup are required.

## Verification

Pass criteria:

- `scripts/probe-ghostty-screenshot.sh` exists, is executable, and does not call
  Ghostty with `-e`.
- Running `scripts/probe-ghostty-screenshot.sh` opens an isolated Ghostty window
  without an interactive command-execution prompt.
- The Ghostty-side command records `timg_status=0`.
- The parent process discovers the probe window ID by unique title.
- `screencapture -x -l<windowid> <png>` creates a nonempty PNG file.
- Any required macOS Screen Recording permission is either already available or
  the script exits nonzero with a clear setup message and without accepting
  prompts.
- Any Ghostty process created by the probe is cleaned up before the script
  exits.
- The cleanup path does not kill an unrelated Ghostty process such as the
  developer's active terminal.
- Temporary files created by the probe are removed before the script exits,
  except an intentionally retained screenshot artifact if the script documents
  its path.
- `git diff --check` passes.

Fail criteria:

- The launch path triggers an interactive permission prompt.
- `timg` is missing or exits nonzero inside Ghostty.
- The probe window ID cannot be discovered deterministically.
- Screenshot capture fails, produces an empty file, or requires an unhandled
  permission prompt.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process that it did not open.

## Design Review

Reviewer: Codex subagent `019ecb02-8bf5-76c3-ab13-79f61aa98452` with fresh
context.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links this
experiment with status `Designed`, required sections are present, scope is
narrow, implementation has not started, verification is concrete, the plan
avoids Ghostty's failed `-e` path and broad process killing, and Screen
Recording permission is treated as setup/preflight failure rather than something
to accept automatically.

+++
status = "designed"
opened = "2026-06-15"
+++

# Experiment 2: Probe Ghostty startup input

## Description

Find an unattended Ghostty launch mechanism that avoids the explicit `-e`
command-execution path that failed Experiment 1.

Ghostty documents an `input` configuration key that sends bytes to the terminal
PTY after the configured command starts. This experiment will launch a normal
Ghostty window with the regular configured shell, feed a small command through
startup input, observe marker output from the parent process, and clean up only
processes attributable to this probe.

This experiment still avoids image rendering and pixel analysis. It focuses on
the control plane needed before image rendering tests can be trusted.

## Changes

- Add `scripts/probe-ghostty-input-launch.sh`, a macOS-only probe script that:
  - creates a temporary marker file, log file, and startup input file;
  - records the set of Ghostty PIDs before launch;
  - launches Ghostty without `-e`;
  - passes Ghostty configuration through launch arguments, including
    `--input=path:<input-file>`, a unique title, disabled window state
    restoration, and no close confirmation;
  - feeds shell text that writes a marker and exits;
  - avoids generated executable scripts;
  - detects and records whether an interactive permission prompt appears;
  - attributes cleanup only to newly observed Ghostty PIDs that were not present
    before launch and, where possible, also match the unique title or temporary
    input/config path in their command arguments;
  - uses bounded waits and fails rather than broad-killing if ownership is
    ambiguous;
  - cleans up only probe-owned Ghostty processes and temporary files.
- Keep this probe outside `v0/`.
- Record whether `input` can provide a prompt-free unattended launch path.
- Update the issue README's current findings with the observed prompt behavior,
  cleanup behavior, and whether startup `input` is viable for later image
  rendering experiments.

## Verification

Pass criteria:

- `scripts/probe-ghostty-input-launch.sh` exists, is executable, and does not
  call Ghostty with `-e`.
- Running `scripts/probe-ghostty-input-launch.sh` opens an isolated Ghostty
  window without an interactive permission prompt.
- The startup input writes a marker observed by the parent process.
- The script has a finite timeout for marker observation. If no marker appears,
  it exits nonzero, records diagnostic process/log state, and cleans up only
  attributed probe-owned processes.
- Any Ghostty process created by the probe is cleaned up before the script
  exits.
- The cleanup path does not kill an unrelated Ghostty process such as the
  developer's active terminal.
- Temporary files created by the probe are removed before the script exits.
- `git diff --check` passes.

Fail criteria:

- The `input` launch form triggers an interactive permission prompt.
- The startup input does not reach the shell or cannot write the marker.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process that it did not open.

## Design Review

Reviewer: Codex subagent `019ecaf3-d3d1-72a0-8042-aa6007946a20` with fresh
context.

Findings:

- Blocker: none.
- Major: cleanup attribution was underspecified for a launch form without `-e`.
  Fixed by requiring a pre-launch Ghostty PID snapshot, ownership attribution to
  newly observed PIDs plus a unique title or temporary path where possible,
  bounded waits, and failure instead of broad-killing if ownership is ambiguous.
- Major: prompt/hang behavior was underspecified. Fixed by requiring a finite
  marker timeout, nonzero exit, diagnostics, and attributed cleanup on the
  prompt/hang path.
- Minor: result propagation to the issue README was implicit. Fixed by requiring
  the README current findings to be updated with prompt behavior, cleanup
  behavior, and startup `input` viability.

Approval: approved. The reviewer confirmed that the issue README links this
experiment with status `Designed`, the required sections are present, the scope
is narrow, implementation has not started, verification is concrete, and the
technical direction plausibly avoids Ghostty's failed explicit `-e` path.

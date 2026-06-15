+++
status = "designed"
opened = "2026-06-15"
+++

# Experiment 1: Probe isolated Ghostty launch

## Description

Prove the first capability needed by the Ghostty image test harness: an
automated process can open a separate Ghostty instance for testing, identify it
without relying on the developer's active terminal session, and close it
cleanly.

This experiment intentionally avoids image rendering, screenshots, and
Accessibility API typing. If isolated launch/close behavior is unreliable, the
rest of the harness will be brittle no matter how good the image assertions are.

## Changes

- Add a small macOS-only probe script under `scripts/` that:
  - creates a temporary marker file;
  - launches Ghostty with `open -na Ghostty.app --args -e <script>`;
  - runs a short child shell command in the new Ghostty instance;
  - writes the marker file from inside the Ghostty command;
  - waits briefly so the window is observable;
  - exits on its own without requiring manual cleanup.
- Keep the probe script outside `v0/`; Issue 2 belongs to the new post-prototype
  test harness work.
- Document observed Ghostty/macOS behavior, including any permission prompts or
  launch limitations, in this experiment file after running the probe.

## Verification

Pass criteria:

- `scripts/probe-ghostty-launch.sh` exists, is executable, and is scoped to
  macOS Ghostty launch probing.
- Running `scripts/probe-ghostty-launch.sh` opens a separate Ghostty window
  without disturbing the active terminal session.
- The script observes a marker written from inside the Ghostty-launched command.
- The test Ghostty window exits without manual intervention.
- `git diff --check` passes.

Fail criteria:

- Ghostty cannot be launched as an isolated test instance with
  `open -na Ghostty.app --args -e <script>`.
- The launched command cannot be observed from the parent process.
- The test window remains open indefinitely or requires manual cleanup.

## Design Review

Reviewer: Codex subagent `019ecae2-308e-78c0-9487-7009ab888465` with fresh
context.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links this
experiment with status `Designed`, the required sections are present, the scope
is narrow, implementation has not started, verification has concrete pass/fail
criteria, repository hygiene checks are included, and the planned learnings will
be recorded.

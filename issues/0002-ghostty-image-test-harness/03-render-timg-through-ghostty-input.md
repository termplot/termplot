+++
status = "passed"
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

## Result

**Result:** Pass

Verification commands:

```bash
chmod +x scripts/probe-ghostty-timg-render.sh
dprint fmt issues/0002-ghostty-image-test-harness/README.md issues/0002-ghostty-image-test-harness/03-render-timg-through-ghostty-input.md
sh -n scripts/probe-ghostty-timg-render.sh
rg --fixed-strings -- '-e' scripts/probe-ghostty-timg-render.sh || true
scripts/probe-ghostty-timg-render.sh
out=/tmp/termplot-ghostty-timg-verify.log
scripts/probe-ghostty-timg-render.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^probe_tmpdir=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
ps -axo pid=,ppid=,command= | rg 'Ghostty|termplot-ghostty-timg-probe|probe-ghostty-timg-render|timg' || true
git diff --check
```

The first implementation attempt timed out after `timg` started but before
recording `timg_status`. The log showed the Ghostty-side shell had started and
had `TERM=xterm-ghostty`, but there was no post-`timg` log entry. The likely
cause was startup `input` queuing all remaining shell text in the PTY while
`timg` was running; `timg` can read from the terminal, so it could consume text
intended for the shell after it returned.

The fix was to wrap all Ghostty-side probe logic in a shell function and make
the function invocation the final input line. That lets the shell parse the
post-render logic before `timg` starts, leaving no follow-up shell text queued
behind `timg` in the PTY.

Two live runs then succeeded without using Ghostty's `-e` path. The first
successful run reported:

```text
preexisting_ghostty_pids=1173
marker_state=done
child_pid=45054
child_ppid=45053
tty=/dev/ttys006
TERM=xterm-ghostty
TERM_PROGRAM=ghostty
timg_status=0
cleanup_ghostty_pids=45049
ghostty_processes=cleaned
pass: Ghostty rendered the test image with timg -p kitty and cleaned up
```

The second successful run wrote output to
`/tmp/termplot-ghostty-timg-verify.log` and reported:

```text
probe_tmpdir=/var/folders/vx/wbmx10nd7tx8259xgg3v4vf80000gn/T//termplot-ghostty-timg-probe.OqSyhu
preexisting_ghostty_pids=1173
marker_state=done
child_pid=45132
child_ppid=45131
tty=/dev/ttys006
TERM=xterm-ghostty
TERM_PROGRAM=ghostty
timg_status=0
cleanup_ghostty_pids=45127
ghostty_processes=cleaned
pass: Ghostty rendered the test image with timg -p kitty and cleaned up
```

The dynamic temporary-directory cleanup check passed:

```bash
tmpdir=$(sed -n 's/^probe_tmpdir=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
```

The post-run process check showed only the pre-existing active Ghostty process
and the check command itself:

```text
1173 1 /Applications/Ghostty.app/Contents/MacOS/ghostty
```

Completion review:

Reviewer: Codex subagent `019ecaff-6cf4-7e71-9da3-3258fe399df8` with fresh
context.

Findings:

- Blocker: none.
- Major: none.
- Minor: the recorded verification command block omitted the `dprint fmt`
  command from the implementation pass. Fixed by adding the command to the
  verification list.

Approval: approved. The reviewer confirmed that the result and conclusion are
present, the issue README marks Experiment 3 as `Pass`, later-work learnings are
recorded, `git diff --check` passed, the result commit had not been made, the
script avoids Ghostty's failed `-e` launch path, and cleanup only targets
Ghostty processes whose command line contains this probe's temporary directory.

## Conclusion

The harness can now launch Ghostty unattended, feed a command through startup
`input`, and run `timg -p kitty` successfully against a deterministic generated
image. The next experiment can add screenshot capture for the isolated Ghostty
window while preserving the same startup-input and function-wrapper pattern.

+++
status = "failed"
opened = "2026-06-15"
+++

# Experiment 1: Probe isolated Ghostty launch

## Description

Prove the first capability needed by the Ghostty image test harness: an
automated process can open a separate Ghostty instance for testing, identify it
without relying on the developer's active terminal session, and close it
cleanly. The probe must also clean up any process it opens before the experiment
can be closed.

This experiment intentionally avoids image rendering, screenshots, and
Accessibility API typing. If isolated launch/close behavior is unreliable, the
rest of the harness will be brittle no matter how good the image assertions are.

## Changes

- Added `scripts/probe-ghostty-launch.sh`, a small macOS-only probe script that
  is now disabled by default because the tested strategy can trigger an
  interactive prompt. The script preserves the failed launch attempt for manual
  reproduction only with `GHOSTTY_PROBE_ALLOW_INTERACTIVE_PROMPT=1`.
- Tested a generated script launch that:
  - creates a temporary marker file;
  - launches Ghostty with `open -na Ghostty.app --args -e <script>`;
  - runs a short child shell command in the new Ghostty instance;
  - writes the marker file from inside the Ghostty command;
  - waits briefly so the window is observable;
  - identifies Ghostty processes attributable to this probe by matching this
    run's temporary directory in their command arguments;
  - terminates only those probe-owned Ghostty processes;
  - removes its temporary directory on exit.
- Tested an inline shell launch that replaced the generated executable with
  `/bin/sh -lc <inline command>`, while keeping the same marker observation and
  attributed cleanup model.
- Kept the probe script outside `v0/`; Issue 2 belongs to the new post-prototype
  test harness work.
- Documented observed Ghostty/macOS behavior, including any permission prompts
  or launch limitations, in this experiment file after running the probe.

## Verification

Pass criteria:

- `scripts/probe-ghostty-launch.sh` exists, is executable, and is scoped to
  macOS Ghostty launch probing.
- Running `scripts/probe-ghostty-launch.sh` without an explicit override exits
  before launching Ghostty and reports that the `-e` strategy is disabled
  because it is known to produce prompts.
- Manual reproduction showed that the tested `-e` launch forms can open a
  separate Ghostty window and observe a marker written from inside the
  Ghostty-launched command, but they do not satisfy the unattended requirement.
- Any Ghostty process created during manual reproduction is cleaned up before
  the script exits, or is identified precisely enough for manual cleanup without
  targeting unrelated Ghostty sessions.
- The cleanup path does not kill an unrelated Ghostty process such as the
  developer's active terminal.
- Temporary files created by the probe are removed before the script exits.
- `git diff --check` passes.

Fail criteria:

- Ghostty cannot be launched as an isolated test instance with
  `open -na Ghostty.app --args -e <script>`.
- The launched command cannot be observed from the parent process.
- The test window remains open indefinitely or requires manual cleanup.
- The script leaves a probe-owned Ghostty process running after it exits.
- The script kills or targets a Ghostty process that it did not open.
- Any tested launch form triggers an interactive permission prompt.

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

## Completion Review

Reviewer: Codex subagent `019ecaf0-d227-7e60-8ebb-62487344e43f` with fresh
context.

Findings:

- Blocker: none.
- Major: none.
- Minor: experiment frontmatter still said `status = "designed"` after the
  failed result was recorded. Fixed by changing it to `status = "failed"`.
- Minor: the issue constraints still preferred the already-failed Ghostty `-e`
  launch path. Fixed by replacing that preference with a constraint against
  using `-e` for unattended automation on this machine.

Approval: approved. The reviewer confirmed that the completed result is
recorded, the issue README status matches `Fail`, the README captures relevant
learnings for later work, `git diff --check` passed, and the result commit had
not yet been made.

## Prior Result

**Result:** Superseded

Verification commands:

```bash
chmod +x scripts/probe-ghostty-launch.sh
scripts/probe-ghostty-launch.sh
sh -n scripts/probe-ghostty-launch.sh
git diff --check
```

The probe opened a separate Ghostty instance with:

```bash
open -na Ghostty.app --args --wait-after-command=false -e "$child" "$marker" "$log" "$visible_seconds"
```

The Ghostty-launched child command wrote the marker, reported its terminal, and
exited. The final successful run reported:

```text
marker_state=done
child_pid=42692
child_process=exited
tty=/dev/ttys006
pass: Ghostty launched the probe command and it exited
```

No macOS Accessibility permission was required for this experiment because it
used deterministic process launch rather than keyboard injection. No screenshot
or screen-recording permission was required yet.

This result is superseded by the expanded cleanup scope. The first probe runs
left Ghostty processes open even after the child command exited. Those processes
were identifiable by their `termplot-ghostty-probe` command arguments and were
manually killed without touching the unrelated active Ghostty process.

## Result

**Result:** Fail

Verification commands:

```bash
dprint fmt issues/0002-ghostty-image-test-harness/README.md issues/0002-ghostty-image-test-harness/01-probe-isolated-ghostty-launch.md
sh -n scripts/probe-ghostty-launch.sh
scripts/probe-ghostty-launch.sh; rc=$?; printf 'exit_status=%s\n' "$rc"; test "$rc" -eq 2
git diff --check
ps -axo pid=,ppid=,command= | rg 'Ghostty|termplot-ghostty-probe|probe-ghostty-launch' || true
```

The current script is disabled by default and exits before opening Ghostty:

```text
error: this Ghostty -e launch strategy is disabled by default
exit_status=2
```

The process check showed only the pre-existing active Ghostty process and no
probe-owned Ghostty process:

```text
1173 1 /Applications/Ghostty.app/Contents/MacOS/ghostty
```

The failed strategy was manually reproduced with screenshots during the
experiment. The observed dialog said:

```text
Allow Ghostty to execute ".../termplot-ghostty-probe.../child.sh"?
```

The follow-up inline `/bin/sh -lc <inline command>` variant also produced an
interactive approval prompt when launched through Ghostty's `-e` path. That
means the failure is not limited to generated temporary scripts; the explicit
Ghostty command-execution launch path is unsuitable for unattended automation on
this machine.

## Conclusion

The explicit Ghostty `-e` launch strategy failed Issue 2's unattended automation
requirement. Both tested variants were unsuitable:

1. Passing a generated temporary executable as `-e <script>` triggered a macOS
   prompt asking whether Ghostty should be allowed to execute the generated
   script.
2. Replacing the generated executable with `/bin/sh -lc <inline command>` still
   used Ghostty's explicit command-execution path and also triggered an
   interactive approval prompt.

The cleanup work from this experiment remains useful: probe-owned Ghostty
processes can be attributed by matching a run-specific temporary directory in
their command arguments, and unrelated active Ghostty processes must not be
targeted.

The next experiment should avoid Ghostty's explicit `-e` command path entirely.
Candidate approaches include launching a normal Ghostty window with a temporary
configuration and using a non-prompting mechanism to feed commands after the
shell starts, or using a preflighted Accessibility-based path that treats
missing permissions as setup failure rather than accepting prompts.

+++
status = "passed"
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

- Added `scripts/probe-ghostty-screenshot.sh`, a macOS-only probe script that:
  - reuses the Experiment 3 startup-input and function-wrapper pattern;
  - renders the same deterministic four-color PPM image with `timg -p kitty`;
  - holds the Ghostty window open after rendering;
  - attempts to make the test capture deterministic by positioning and sizing
    the isolated Ghostty window;
  - captures the configured screen rectangle with `screencapture -x -R...`;
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
- The parent process confirms a probe-owned Ghostty process exists before
  capture.
- `screencapture -x -R<x,y,w,h> <png>` creates a nonempty PNG file.
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
- The probe-owned Ghostty process cannot be confirmed before capture.
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

## Result

**Result:** Pass

Verification commands:

```bash
chmod +x scripts/probe-ghostty-screenshot.sh
dprint fmt issues/0002-ghostty-image-test-harness/README.md issues/0002-ghostty-image-test-harness/04-capture-ghostty-render-screenshot.md
sh -n scripts/probe-ghostty-screenshot.sh
rg --fixed-strings -- '-e' scripts/probe-ghostty-screenshot.sh || true
scripts/probe-ghostty-screenshot.sh
out=/tmp/termplot-ghostty-screenshot-verify.log
scripts/probe-ghostty-screenshot.sh > "$out" 2>&1
cat "$out"
tmpdir=$(sed -n 's/^probe_tmpdir=//p' "$out" | tail -n 1)
screenshot=$(sed -n 's/^screenshot=//p' "$out" | tail -n 1)
test -n "$tmpdir"
test ! -e "$tmpdir"
test -n "$screenshot"
test -s "$screenshot"
ps -axo pid=,ppid=,command= | rg 'Ghostty|termplot-ghostty-screenshot-probe|probe-ghostty-screenshot|timg' || true
git diff --check
```

The first implementation attempted to discover the Ghostty window ID using
CoreGraphics metadata through `osascript`. That did not work in this environment
because the metadata enumeration did not expose the Ghostty window. The probe
was changed to avoid that dependency: it positions the isolated Ghostty window
at a controlled rectangle and captures that rectangle with
`screencapture -x
-R...`.

The first successful run reported:

```text
capture_rect=80,120,1200,800
probe_ghostty_pids=46124
marker_state=rendered
timg_status=0
screenshot=/tmp/termplot-ghostty-screenshot-termplot-ghostty-screenshot-probe.9XxK1P.png
screenshot_bytes=1335164
screenshot_  pixelWidth: 2400
screenshot_  pixelHeight: 1600
cleanup_ghostty_pids=46124
ghostty_processes=cleaned
pass: captured Ghostty render screenshot and cleaned up
```

The retained screenshot was visually inspected and showed the isolated Ghostty
window plus the small four-color `timg` output at the lower-left of the terminal
content.

The second successful run wrote output to
`/tmp/termplot-ghostty-screenshot-verify.log` and reported:

```text
probe_tmpdir=/var/folders/vx/wbmx10nd7tx8259xgg3v4vf80000gn/T//termplot-ghostty-screenshot-probe.TmXXrM
screenshot=/tmp/termplot-ghostty-screenshot-termplot-ghostty-screenshot-probe.TmXXrM.png
capture_rect=80,120,1200,800
probe_ghostty_pids=46219
marker_state=rendered
timg_status=0
screenshot_bytes=1358642
screenshot_  pixelWidth: 2400
screenshot_  pixelHeight: 1600
cleanup_ghostty_pids=46219
ghostty_processes=cleaned
pass: captured Ghostty render screenshot and cleaned up
```

The dynamic checks confirmed that the probe temporary directory was removed and
the retained screenshot exists:

```text
tmpdir_removed=yes
screenshot_exists=yes
```

The post-run process check showed only the pre-existing active Ghostty process
and the check command itself:

```text
1173 1 /Applications/Ghostty.app/Contents/MacOS/ghostty
```

Completion review:

Reviewer: Codex subagent `019ecb09-7637-7453-b4ca-952895ade5b8` with fresh
context.

Findings:

- Blocker: none.
- Major: none.
- Minor: the recorded screenshot dimension excerpts omitted the `screenshot_`
  prefix emitted by the final script. Fixed by updating the excerpts to match
  the script output.

Approval: approved. The reviewer confirmed that the rectangle-capture deviation
reasonably satisfies the experiment, the issue README status matches the result,
the relevant learning is preserved in the issue README, `git diff --check`
passes, the result commit had not been made, the script avoids Ghostty's failed
`-e` launch path, cleanup is attributed to probe-owned Ghostty processes, and
Screen Recording failure is handled as setup error rather than prompt
automation.

## Conclusion

Unattended screenshot capture is viable with the controlled-rectangle approach:
position and size the isolated Ghostty window, render the known test image,
capture the configured rectangle with `screencapture -x -R...`, retain the PNG
artifact, and clean up the probe-owned Ghostty process.

The next experiment should analyze the retained screenshot pixels and assert
that the expected red, green, blue, and white regions from the known image are
present.

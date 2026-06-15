# Experiment 7: Verify full-stack terminal rendering

## Description

Implement Stage 7: prove TermPlot output renders inside real target terminals.
Stages 5 and 6 proved the daemon-backed CLI workflow and protocol byte output;
this experiment must run the actual `termplot render` command in isolated
Ghostty and iTerm2 windows, capture screenshots, assert pixels, verify daemon
reuse timing, and prove that every probe-owned process is cleaned up.

This experiment should reuse the reliable launch and screenshot patterns from
Issue 2 and Issue 4:

- Ghostty: launch without `-e`, feed shell startup input through
  `--input=path:<input-file>`, capture a controlled rectangle, and clean up only
  probe-owned Ghostty processes.
- iTerm2: launch with `open -na iTerm.app --args --command=<script>`, suppress
  and restore the same unattended-testing defaults proven in Issue 4, discover
  the probe-owned window by unique title with CoreGraphics, derive the
  screenshot rectangle from that window, and clean up only attributed iTerm2 and
  iTermServer processes.

Permission prompts are setup failures, not dialogs to accept. This stage should
not use `timg`, proof fixtures, external terminal image renderers, or
Accessibility API click-through.

## Changes

- Add a deterministic Plotly config fixture for terminal probes.
  - Use a small chart with distinctive red, green, blue, and white visual
    regions or markers that are robust enough for screenshot pixel assertions.
  - Keep dimensions explicit so screenshot crops can be stable.
- Add a Ghostty TermPlot probe script under `scripts/`.
  - Launch an isolated Ghostty window without `-e`.
  - Feed a shell function through `--input=path:<input-file>`.
  - Run the built TermPlot CLI with `--protocol kitty`, a private socket,
    private log, and short-but-safe TTL.
  - Render the deterministic Plotly config twice through the same daemon.
  - Record command statuses, daemon PID reuse, render timing evidence, probe
    temp paths, screenshot path, crop geometry, tolerances, and pixel counts.
  - Prove the warm render is faster than the cold render using a documented
    retry policy.
  - Capture the controlled Ghostty rectangle with `screencapture`.
  - Assert expected pixels with GraphicsMagick.
  - Record the daemon PID, renderer browser PID from TermPlot output or daemon
    state, probe-owned terminal PID, private socket/log/temp paths, and any
    child process tree needed for cleanup attribution.
  - Stop the probe-owned daemon and clean up only recorded probe-owned Ghostty,
    browser, Node, socket, log, and temporary-file resources before exit, while
    retaining the proof screenshot artifact.
- Add an iTerm2 TermPlot probe script under `scripts/`.
  - Launch an isolated iTerm2 window with the already-proven non-Accessibility
    command path.
  - Temporarily set and restore the required iTerm2 defaults.
  - Run TermPlot with `--protocol iterm2`, a private socket, private log, and
    short-but-safe TTL.
  - Render the deterministic Plotly config twice through the same daemon.
  - Discover the probe-owned iTerm2 window by unique title and capture a
    rectangle derived from that window.
  - Dynamically crop or otherwise robustly locate the rendered plot and assert
    expected pixels.
  - Record daemon reuse and prove the warm render is faster than the cold render
    using a documented retry policy.
  - Record the daemon PID, renderer browser PID from TermPlot output or daemon
    state, probe-owned iTerm2/iTermServer PIDs, private socket/log/temp paths,
    and any child process tree needed for cleanup attribution.
  - Stop the probe-owned daemon and clean up only recorded attributed
    iTerm2/iTermServer, browser, Node, socket, log, and temporary-file resources
    before exit, while retaining the proof screenshot artifact.
- Add verification helpers if needed.
  - Prefer small shell helpers or fixtures under `scripts/fixtures/`.
  - Keep helper ownership explicit so cleanup can identify probe-owned
    resources.
- Update Issue 5 Stage 7 status and Experiment 7 result after verification.
- Add a concise Stage 7 handoff note to the Issue 5 README if the result exposes
  Stage 8-relevant limitations or setup requirements that should be visible
  without opening the experiment body.
- Record Stage 8 handoff learnings in `## Result` / `## Conclusion`.
  - Which terminal probes passed.
  - Screenshot crop or dynamic-detection method used.
  - Pixel evidence and artifact paths.
  - Daemon reuse timing evidence.
  - Cleanup evidence and any remaining setup requirements.

## Verification

Pass criteria:

- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- `sh -n` passes for every new shell script.
- Every new probe script is executable and `test -x <script>` passes.
- The Ghostty probe:
  - does not use Ghostty's `-e` launch path;
  - runs actual `termplot render --protocol kitty`, not `timg`, proof fixtures,
    or external renderers;
  - captures a nonempty screenshot artifact;
  - asserts expected pixels above documented thresholds;
  - proves two renders reused the same daemon PID;
  - proves the warm render is faster than the cold render. To avoid a flaky
    single-sample assertion, the probe may run up to three cold/warm pairs on
    its private daemon and pass when at least two pairs show
    `warm_ms < cold_ms`; it must record every sample and fail if this condition
    is not met;
  - records timing evidence for cold and warm renders, including the chosen
    timing source and all retry samples;
  - records daemon, browser, Node, terminal, socket, log, and temp-resource
    attribution before cleanup;
  - stops the probe-owned daemon and leaves no probe-owned Ghostty, browser,
    Node, socket, log, or helper process running.
- The iTerm2 probe:
  - does not use AppleScript or Accessibility API typing/click-through;
  - runs actual `termplot render --protocol iterm2`, not `imgcat`, proof
    fixtures, or external renderers;
  - discovers the probe-owned iTerm2 window and captures a rectangle derived
    from that window;
  - captures a nonempty screenshot artifact;
  - asserts expected pixels above documented thresholds;
  - proves two renders reused the same daemon PID;
  - proves the warm render is faster than the cold render. To avoid a flaky
    single-sample assertion, the probe may run up to three cold/warm pairs on
    its private daemon and pass when at least two pairs show
    `warm_ms < cold_ms`; it must record every sample and fail if this condition
    is not met;
  - records timing evidence for cold and warm renders, including the chosen
    timing source and all retry samples;
  - records daemon, browser, Node, terminal, iTermServer, socket, log, and
    temp-resource attribution before cleanup;
  - restores any temporary iTerm2 defaults;
  - stops the probe-owned daemon and leaves no probe-owned iTerm2, iTermServer,
    browser, Node, socket, log, or helper process running.
- Permission prompts, missing screen-recording permissions, missing
  GraphicsMagick, or missing terminals fail clearly with setup diagnostics.
- Prohibited renderer searches over new scripts find no use of `timg`, `imgcat`,
  `kitty +kitten icat`, `ansi-escapes`, or Issue 4 proof fixtures for production
  display.
- `dprint fmt` succeeds on changed issue files.
- `git add -N <new script/helper files> && git diff --check` passes, or
  `git diff --check` runs after staging the result so new files are included.

Partial criteria:

- Ghostty passes but iTerm2 needs a bounded follow-up, or iTerm2 passes but
  Ghostty needs a bounded follow-up.
- Pixel assertions pass, but daemon reuse timing or cleanup evidence needs a
  follow-up before Issue 5 can close.

Fail criteria:

- A probe relies on external image renderers instead of TermPlot output.
- A probe triggers an interactive permission prompt.
- A probe leaves any process, daemon, browser, terminal window, socket, log, or
  helper it opened without recording and cleaning it up.
- A probe kills or targets processes it did not open.
- Screenshots are missing, empty, or cannot be attributed to the probe-owned
  terminal window or controlled capture rectangle.

## Design Review

Reviewer: Euler (`019ecbdd-5352-73e0-99d0-e08f84999a38`), fresh-context Codex
design reviewer.

Initial findings:

- Blocker: the pass criteria only required recording cold/warm timing evidence,
  while Issue 5 requires proving daemon reuse makes the second render faster
  than cold start.
- Major: the design required cleanup of probe-owned browser and Node processes
  without specifying how those processes would be attributed before cleanup.
- Minor: the design recorded Stage 8 handoff learnings only in the experiment,
  not in the issue-level README when the learnings should be visible there.

Fixes:

- Added a concrete timing pass criterion for both Ghostty and iTerm2: the probe
  may run up to three cold/warm pairs and must pass at least two pairs where
  `warm_ms < cold_ms`, recording every sample and failing otherwise.
- Added explicit resource-attribution requirements before cleanup: daemon PID,
  renderer browser PID where available, terminal/iTermServer PIDs, private
  socket/log/temp paths, and any needed child process tree.
- Added a Changes bullet requiring a concise Issue 5 README handoff note when
  Stage 7 exposes Stage 8-relevant limitations or setup requirements.

Re-review: approved. The reviewer confirmed the timing proof criterion now
requires up to three cold/warm pairs with at least two `warm_ms < cold_ms`
samples, cleanup attribution is specified before cleanup for daemon, browser,
Node, terminal/iTermServer, socket, log, temp resources, and child process tree,
Stage 8-relevant learnings are required in the Issue 5 README when needed, and
git state still showed only plan docs changed with no implementation started.

## Result

**Result:** Pass

Implemented full-stack terminal probes for the two v1 target terminals. Both
probes run the real built TermPlot CLI against a deterministic Plotly config,
open isolated terminal windows, render terminal image output, capture
screenshots, assert colored pixels, prove daemon reuse timing, and clean up
probe-owned processes and files.

Changed files:

- `scripts/fixtures/full-stack-plotly-config.json`: deterministic Plotly config
  with explicit dimensions and red, green, blue, and white pixel evidence.
- `scripts/probe-ghostty-termplot.sh`: Ghostty full-stack probe using the proven
  `--input=path:<input-file>` launch path, private socket/log/temp resources,
  Kitty protocol output, screenshot capture, pixel assertions, daemon warm
  timing checks, and attributed cleanup.
- `scripts/probe-iterm2-termplot.sh`: iTerm2 full-stack probe using the proven
  command launch path, temporary iTerm2 default suppression/restoration,
  CoreGraphics window discovery, OSC 1337 output, screenshot capture, pixel
  assertions, daemon warm timing checks, and attributed cleanup.
- `issues/0005-implement-termplot-v1/README.md`: marked Stage 7 complete,
  updated Experiment 7 to `Pass`, and added the Stage 8 handoff note.

Implementation correction:

- The first Ghostty run failed because the probe used the default macOS
  `$TMPDIR`, making the Unix socket path too long for local socket binding. Both
  probes now create short temp roots under `/tmp/tp-ghostty.*` and
  `/tmp/tp-iterm2.*`.
- The second Ghostty run passed rendering and pixels but found the probe-owned
  `termplotd` process still running by its private socket path. Cleanup now
  stops the daemon, kills only socket-attributed `termplotd` processes if
  needed, and excludes the cleanup-check command itself from process leftovers.

Verification run:

```text
pnpm run build
```

Passed.

```text
pnpm test
```

Passed: 23 tests, 23 pass.

```text
sh -n scripts/probe-ghostty-termplot.sh
sh -n scripts/probe-iterm2-termplot.sh
test -x scripts/probe-ghostty-termplot.sh
test -x scripts/probe-iterm2-termplot.sh
```

Passed.

```text
pnpm exec dprint fmt issues/0005-implement-termplot-v1/README.md issues/0005-implement-termplot-v1/07-verify-full-stack-terminal-rendering.md
```

Passed.

```text
git add -N scripts/fixtures/full-stack-plotly-config.json scripts/probe-ghostty-termplot.sh scripts/probe-iterm2-termplot.sh && git diff --check
```

Passed.

```text
rg --fixed-strings 'timg' scripts/probe-ghostty-termplot.sh scripts/probe-iterm2-termplot.sh || true
rg --fixed-strings 'imgcat' scripts/probe-ghostty-termplot.sh scripts/probe-iterm2-termplot.sh || true
rg --fixed-strings 'kitty +kitten' scripts/probe-ghostty-termplot.sh scripts/probe-iterm2-termplot.sh || true
rg --fixed-strings 'ansi-escapes' scripts/probe-ghostty-termplot.sh scripts/probe-iterm2-termplot.sh || true
```

Passed with no matches.

```text
GHOSTTY_TERMPLOT_PROBE_TIMEOUT_SECONDS=90 scripts/probe-ghostty-termplot.sh
```

Passed. Key evidence:

```text
pixel_screenshot=/tmp/termplot-ghostty-full-stack-tp-ghostty.V9RQDG.png
pixel_crop=760x700+0+820
pixel_threshold=80
red_count=8004
green_count=4028
blue_count=8004
white_count=172306
timing_pair_1_cold_ms=1326
timing_pair_1_warm_ms=464
timing_pair_1_cold_pid=74211
timing_pair_1_warm_pid=74211
timing_pair_1_cold_child_pids=74215
timing_pair_1_warm_child_pids=74215
timing_pair_2_cold_ms=1182
timing_pair_2_warm_ms=462
timing_pair_2_cold_pid=74286
timing_pair_2_warm_pid=74286
timing_pair_2_cold_child_pids=74287
timing_pair_2_warm_child_pids=74287
timing_pair_3_cold_ms=1189
timing_pair_3_warm_ms=446
timing_pair_3_cold_pid=74352
timing_pair_3_warm_pid=74352
timing_pair_3_cold_child_pids=74356
timing_pair_3_warm_child_pids=74356
timing_timing_successes=3
browser_pids=74215 74287 74356
ghostty_processes=cleaned
termplot_daemon=stopped
pass: Ghostty rendered TermPlot output, pixels matched, daemon warmed, and cleanup completed
```

```text
ITERM2_TERMPLOT_PROBE_TIMEOUT_SECONDS=90 scripts/probe-iterm2-termplot.sh
```

Passed. Key evidence:

```text
window_owner=iTerm2
window_title=TermPlot iTerm2 full stack tp-iterm2.5seKaa
window_bounds=600,379,587,462
pixel_screenshot=/tmp/termplot-iterm2-full-stack-tp-iterm2.5seKaa.png
pixel_threshold=80
red_count=10880
green_count=8056
blue_count=10882
white_count=287034
timing_pair_1_cold_ms=1242
timing_pair_1_warm_ms=492
timing_pair_1_cold_pid=74586
timing_pair_1_warm_pid=74586
timing_pair_1_cold_child_pids=74590
timing_pair_1_warm_child_pids=74590
timing_pair_2_cold_ms=1231
timing_pair_2_warm_ms=464
timing_pair_2_cold_pid=74656
timing_pair_2_warm_pid=74656
timing_pair_2_cold_child_pids=74660
timing_pair_2_warm_child_pids=74660
timing_pair_3_cold_ms=1240
timing_pair_3_warm_ms=475
timing_pair_3_cold_pid=74725
timing_pair_3_warm_pid=74725
timing_pair_3_cold_child_pids=74727
timing_pair_3_warm_child_pids=74727
timing_timing_successes=3
browser_pids=74590 74660 74727
cleanup_iterm2_pids=74538
cleanup_iterm2_server_pids=74544
iterm2_processes=cleaned
termplot_daemon=stopped
pass: iTerm2 rendered TermPlot output, pixels matched, daemon warmed, and cleanup completed
```

```text
ps -axo pid=,ppid=,command= | rg 'tp-(ghostty|iterm2)|termplot-ghostty-full-stack|termplot-iterm2-full-stack|probe-(ghostty|iterm2)-termplot|termplotd\.js.*tp-' || true
```

Passed. The only matches were the check command and `rg` process themselves.

## Conclusion

Stage 7 proves TermPlot v1 can render through the daemon and display real images
inside both target macOS terminals:

- Ghostty renders TermPlot Kitty output and passes screenshot pixel assertions.
- iTerm2 renders TermPlot OSC 1337 output and passes screenshot pixel
  assertions.
- In both terminals, warm renders reused the daemon PID and were faster than
  cold renders in all three sampled cold/warm pairs.
- Probe-owned terminal, daemon, browser, Node, socket, log, and temporary
  resources were cleaned up with process attribution.

Stage 8 can proceed with Nushell integration against the same `termplotd` and
CLI/client contract. The remaining setup assumptions for full-stack probes are
macOS, target terminal installation, Screen Recording permission for
`screencapture`, and GraphicsMagick.

## Completion Review

Reviewer: Planck (`019ecbec-55d1-7f52-8f99-7e2083839bef`), fresh-context Codex
completion reviewer.

Initial findings:

- Blocker: the verification record omitted the required `dprint fmt` and
  `git diff --check` hygiene evidence.
- Blocker: the approved scope required renderer browser PID attribution before
  cleanup, but the probe outputs and experiment evidence did not record browser
  PIDs or child-process-tree evidence.
- Major: the iTerm2 probe could leave a new iTermServer helper running when
  preexisting iTerm2/iTermServer processes existed, because it treated that case
  as diagnostic instead of a failure.

Fixes:

- Ran and recorded `pnpm exec dprint fmt` for the changed Issue 5 Markdown files
  and `git add -N ... && git diff --check` for the new fixture and probe
  scripts.
- Updated both probes to record daemon child PIDs for every cold/warm render
  pair, require nonempty browser child PID attribution, print `browser_pids=...`
  in probe output, and verify those PIDs are gone after daemon cleanup.
- Updated the iTerm2 probe to fail if a new iTermServer helper appears while
  preexisting iTerm2/iTermServer processes make safe attribution impossible.
- Re-ran both live probes successfully and updated the recorded evidence with
  browser PID attribution.

Re-review: approved. Planck confirmed the hygiene evidence is recorded, browser
and renderer attribution is present in both probe scripts and the experiment
record, browser PIDs are verified gone after cleanup, iTerm2 no longer silently
passes when a new iTermServer helper cannot be safely attributed,
`git diff
--check` passed, and the result commit had not been made before
re-review approval.

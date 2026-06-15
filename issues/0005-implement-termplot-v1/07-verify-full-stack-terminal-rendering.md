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

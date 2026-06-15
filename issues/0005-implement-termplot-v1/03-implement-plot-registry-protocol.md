# Experiment 3: Implement plot registry protocol

## Description

Implement the Stage 3 daemon plot registry and protocol on top of the Stage 2
daemon lifecycle skeleton. This experiment should define structured IPC requests
and responses for plot CRUD and render-intent registration, store Plotly configs
in memory by ID, and expose CLI commands that exercise the registry through
`termplotd`.

This experiment must not start a browser, render Plotly, take screenshots, or
display terminal images. The `render` request in this stage records a Plotly
config and returns a stable plot ID plus metadata only. Browser-backed PNG
rendering belongs to Stage 4.

## Changes

- Extend the IPC protocol types.
  - Add `render`, `getPlot`, `listPlots`, `deletePlot`, and `clearPlots`
    requests.
  - Keep existing lifecycle requests: `status`, `setTtl`, `renew`, and
    `shutdown`.
  - Return structured success responses and structured errors with stable codes.
- Add a daemon plot registry.
  - Store Plotly configs in memory by generated ID.
  - Store created/updated timestamps and dimensions metadata.
  - Support individual deletion and clearing all plots.
  - Clear all plots naturally on daemon exit because the registry is in memory.
  - Keep validation intentionally minimal for Stage 3: malformed JSON,
    non-object payloads, and non-positive/non-finite dimensions are invalid.
    Full Plotly schema validation is deferred to Stage 5.
- Add foreground CLI commands for registry operations.
  - `termplot render --json <json> --socket <socket>` records a Plotly config
    and returns plot metadata.
  - `termplot plots list --socket <socket>` lists plot summaries.
  - `termplot plots get <id> --socket <socket>` returns a stored config.
  - `termplot plots delete <id> --socket <socket>` deletes one plot.
  - `termplot plots clear --socket <socket>` deletes all plots.
- Add tests.
  - Use private temporary sockets.
  - Verify render registration, generated IDs, get/list/delete/clear, structured
    errors, daemon-exit clearing, and lifecycle command compatibility.
- Update Issue 5 Stage 3 status and Experiment 3 result after verification.

## Verification

Pass criteria:

- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- Tests prove `render` stores Plotly configs by ID and returns stable metadata
  without launching browser/rendering behavior.
- Tests prove `getPlot`, `listPlots`, `deletePlot`, and `clearPlots` work
  through IPC and CLI commands.
- Tests prove missing plot IDs return a structured error with a stable code.
- Tests prove Stage 3 invalid input returns a structured validation error and
  does not store a plot: malformed JSON, non-object payload, or invalid
  dimensions. Full Plotly schema validation remains deferred to Stage 5.
- Tests prove restarting the daemon clears the in-memory registry.
- Existing lifecycle tests still pass.
- `dprint fmt` succeeds on changed JSON and issue files.
- `git add -N <new implementation/test files> && git diff --check` passes, or
  `git diff --check` runs after staging the result so new files are included.

Partial criteria:

- IPC registry operations work, but CLI coverage needs a follow-up experiment.

Fail criteria:

- The implementation starts browser rendering or terminal image output.
- Plot data persists across daemon restart.
- Errors are unstructured strings without stable machine-readable codes.
- Tests use or affect a real user daemon instead of private temp sockets.

## Design Review

Reviewer: Cicero (`019ecbb2-01f4-7633-891a-96a931adb852`), fresh-context Codex
design reviewer.

Findings:

- Blocker: none.
- Major: the invalid Plotly config pass criterion was underspecified and risked
  pulling Stage 5 validation into Stage 3.
- Minor: whitespace checks needed to include newly added files via intent-to-add
  or staging.

Fixes:

- Defined the Stage 3 validation boundary as malformed JSON, non-object
  payloads, and non-positive/non-finite dimensions. Full Plotly schema
  validation is deferred to Stage 5.
- Updated the hygiene criterion to require intent-to-add or staging before
  `git diff --check`.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 3 as `Designed`, the experiment has the required sections,
implementation had not started, the scope avoids Stage 4 browser rendering and
Stage 6 terminal display, and private temp sockets, structured errors, and
daemon-exit clearing are covered.

## Result

**Result:** Pass

Experiment 3 implemented the daemon plot registry and protocol without adding
browser rendering, screenshots, terminal image output, or Nushell integration.

Implemented files:

- `src/ipc/protocol.ts`
  - adds lifecycle-compatible plot requests: `render`, `getPlot`, `listPlots`,
    `deletePlot`, and `clearPlots`;
  - adds plot metadata and record response types.
- `src/daemon/plot-registry.ts`
  - stores Plotly config payloads in memory by generated UUID;
  - stores creation/update timestamps and optional width/height metadata;
  - supports get, list, delete, and clear operations;
  - returns stable structured errors such as `PLOT_NOT_FOUND`,
    `INVALID_PLOT_CONFIG`, and `INVALID_DIMENSIONS`.
- `src/daemon/server.ts`
  - wires plot requests into the existing daemon IPC server;
  - renews the idle lease on `render`;
  - keeps status/get/list inspection non-renewing.
- `src/bin/termplot.ts`
  - adds `termplot render --json <json>`;
  - adds `termplot plots list|get|delete|clear`;
  - prints structured CLI errors for IPC/validation failures.
- `tests/plot-registry.test.ts`
  - verifies render registration, get/list/delete/clear, structured errors,
    invalid input handling, and daemon-restart clearing through the built CLI
    and private temporary sockets.

Validation boundary:

- Stage 3 rejects malformed JSON in the CLI.
- Stage 3 rejects non-object config payloads.
- Stage 3 rejects non-positive or non-finite numeric dimensions in
  `layout.width` and `layout.height`.
- Full Plotly schema validation remains deferred to Stage 5.

Verification commands:

```bash
dprint fmt issues/0005-implement-termplot-v1/README.md issues/0005-implement-termplot-v1/03-implement-plot-registry-protocol.md
pnpm run build
pnpm test
ps -axo pid=,ppid=,command= | rg 'termplotd|termplotd-registry|termplotd-test' || true
rg 'puppeteer|browser|screenshot|Plotly|plotly|ansi-escapes|kitty|OSC 1337|sixel' src tests || true
git add -N src/daemon/plot-registry.ts tests/plot-registry.test.ts
git diff --check
```

`pnpm test` passed:

```text
✔ status reports no daemon for a missing private socket
✔ start probes before bind, reports status, renews TTL, and stops cleanly
✔ restart replaces only the probe-owned daemon
✔ direct termplotd refuses to steal a live socket
✔ TTL precedence supports env, flag, and runtime overrides
✔ idle expiry exits and unlinks the private socket
✔ SIGTERM and SIGINT clean up only spawned daemon sockets
✔ startup failure is bounded and reports a clear error
✔ render registers a plot and get/list/delete/clear operate on it
✔ registry returns structured errors for missing plots and invalid input
✔ registry is in memory and clears across daemon restart
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

The process check showed no leftover `termplotd`, `termplotd-registry`, or
`termplotd-test` processes other than the check command itself.

The source search for browser, screenshot, Plotly, and terminal image protocol
terms returned no matches in `src` or `tests`, confirming this experiment did
not implement later rendering/display stages.

`git diff --check` passed with new implementation and test files included via
intent-to-add.

## Completion Review

Reviewer: Turing (`019ecbb8-173f-7692-9e93-d11fbcf7c133`), fresh-context Codex
completion reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: the verification record omitted the required `dprint fmt` command.

Fix: added the `dprint fmt` command to the verification record.

Approval: approved. The reviewer confirmed that the result commit had not yet
been made, `pnpm run build`, `pnpm test`, `git diff --check`, and `dprint check`
passed, no Stage 4 browser/screenshot or Stage 6 terminal protocol code was
introduced, tests use private temp sockets, tests cover the registry behavior
and lifecycle compatibility, and the Issue 5 README marks Stage 3 and Experiment
3 as `Pass`.

## Conclusion

Stage 3 is complete. The daemon now has an in-memory plot registry with
structured IPC and CLI access for render-intent registration, get, list, delete,
and clear operations. Plot data is intentionally lost when the daemon exits or
restarts.

The next experiment should implement Stage 4: porting the browser app and
renderer so a stored Plotly config can produce PNG bytes through a warm
browser-backed React Router app.

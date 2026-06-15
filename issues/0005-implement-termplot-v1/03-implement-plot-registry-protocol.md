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

# Experiment 4: Implement browser renderer

## Description

Implement Stage 4: the daemon-owned browser app and PNG renderer. This
experiment should port the v0 idea of a React Router/Express Plotly route into
the v1 daemon architecture, keep a browser warm across render requests, and
return PNG bytes plus metadata through IPC.

This experiment should not implement terminal image display, protocol selection,
Nushell integration, or full CLI render ergonomics. The foreground CLI may
expose a narrow debug command for verification, but Stage 5 owns the user-facing
render workflow and `--output` behavior.

## Changes

- Add the browser/app dependencies needed for the v1 renderer.
  - React Router/Express app runtime/build dependencies.
  - React and React DOM.
  - Plotly browser bundle.
  - Puppeteer for screenshots.
- Add a minimal v1 React Router app.
  - Route: `/plots/:id`.
  - Load a stored plot config by ID from daemon-owned registry/context.
  - Render a dedicated plot container.
  - Call `Plotly.newPlot` in the browser.
  - Reset readiness before each render/navigation.
  - Scope readiness to the expected plot ID and a per-render token.
  - Set a deterministic readiness marker only after Plotly resolves for that
    plot ID/token.
  - Surface Plotly/browser errors through a structured failure marker.
  - Render sizing from stored width/height metadata with sensible defaults.
- Add daemon renderer infrastructure.
  - Start an internal HTTP app server on an ephemeral loopback port.
  - Keep Puppeteer browser/page or browser/context warm across render requests.
  - Navigate to the plot route and wait for the scoped readiness marker instead
    of sleeping.
  - Timeout with a structured IPC error if readiness or navigation fails.
  - Screenshot the plot element or page to a PNG buffer.
  - Return PNG bytes, width, height, plot ID, and timing metadata through IPC.
  - Clean up browser and app server on daemon shutdown, idle expiry, SIGTERM,
    and SIGINT.
- Extend the IPC protocol.
  - Preserve the Stage 3 `render` request as render-intent registration.
  - Add `renderPng` as the Stage 4 request that accepts an existing plot ID.
  - Return JSON-framed PNG data as base64, not raw binary, with this shape:
    `plotId`, `pngBase64`, `width`, `height`, `contentType`, `browserPid`,
    `rendererInstanceId`, and timing fields such as `startedAt`, `appReadyMs`,
    `plotReadyMs`, `screenshotMs`, and `totalMs`.
  - Add stable error codes including `PLOT_NOT_FOUND`, `RENDER_TIMEOUT`,
    `RENDER_NAVIGATION_FAILED`, `RENDER_BROWSER_ERROR`, and
    `RENDER_SCREENSHOT_FAILED`.
- Add tests.
  - Use private temp sockets.
  - Render a deterministic Plotly config to PNG bytes.
  - Verify PNG signature, dimensions, plot ID, and timing metadata.
  - Verify the second render reuses the warm renderer path and records timing
    evidence.
  - Verify daemon shutdown leaves no probe-owned browser or server process.
- Update Issue 5 Stage 4 status and Experiment 4 result after verification.

## Verification

Pass criteria:

- `pnpm install` succeeds if dependency metadata changes.
- `pnpm run build` succeeds, including any React Router app build step.
- `pnpm test` succeeds.
- Tests prove a stored Plotly config can be rendered to PNG bytes through the
  daemon IPC path.
- Tests prove browser readiness waits on a deterministic marker, not a fixed
  sleep.
- Tests prove the renderer stays warm across two renders in the same daemon and
  records timing metadata for both renders. The assertion must be deterministic:
  the two renders should report the same `browserPid` and `rendererInstanceId`,
  or an equivalent explicit reuse counter.
- Tests prove PNG bytes have a valid PNG signature and expected dimensions.
- Tests prove daemon shutdown closes the internal app server's recorded
  ephemeral HTTP port so it no longer accepts connections and cleans up the
  probe-owned browser process.
- Existing Stage 2 lifecycle and Stage 3 registry tests still pass.
- `dprint fmt` succeeds on changed JSON and issue files.
- `git add -N <new implementation/test files> && git diff --check` passes, or
  `git diff --check` runs after staging the result so new files are included.

Partial criteria:

- Renderer produces PNG bytes, but warm-browser reuse or cleanup needs a
  follow-up experiment before Stage 5.

Fail criteria:

- Rendering depends on fixed sleeps instead of deterministic readiness.
- The implementation starts a new browser for every render without documenting
  why warm reuse failed.
- Tests leave probe-owned browser, app server, or daemon processes running.
- Terminal image display or protocol selection is implemented in this stage.

## Design Review

Reviewer: Plato (`019ecbbc-0b0d-7d23-9d06-8f11b0461c80`), fresh-context Codex
design reviewer.

Findings:

- Blocker: none.
- Major: the PNG IPC response shape was underspecified for the existing
  JSON-line protocol.
- Major: readiness could be stale or error-blind without reset, token scoping,
  error surfacing, and timeout behavior.
- Minor: warm reuse verification needed a deterministic assertion, not timing
  evidence alone.
- Minor: cleanup should refer to the internal app server port, not a separate
  server process.

Fixes:

- Defined `renderPng` as the Stage 4 request and preserved Stage 3 `render` as
  render-intent registration.
- Defined base64 PNG JSON response fields, timing metadata, renderer identity,
  and stable render error codes.
- Required readiness reset, plot ID/render-token scoping, structured browser
  error surfacing, and structured timeout behavior.
- Required deterministic warm reuse evidence through shared `browserPid` and
  `rendererInstanceId` or equivalent reuse metadata.
- Required cleanup evidence for the daemon-owned ephemeral HTTP port and
  probe-owned browser process.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 4 as `Designed`, the experiment has the required sections,
implementation had not started, and no blockers remained.

## Result

**Result:** Pass

Experiment 4 implemented the daemon-owned browser renderer. The daemon can now
render a stored Plotly config to PNG bytes through IPC while keeping a browser
and renderer instance warm across requests.

Implemented files:

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
  - add Express, Puppeteer, Plotly, React, React DOM, and React Router
    dependencies;
  - record pnpm's approved Puppeteer build in `allowBuilds`.
- `src/renderer/app-server.ts`
  - adds a daemon-owned loopback Express app server;
  - uses React Router route matching for `/plots/:id`;
  - serves a Plotly render page for stored plot configs;
  - resets and scopes readiness to plot ID plus render token;
  - surfaces browser-side Plotly errors through the readiness state.
- `src/renderer/browser-renderer.ts`
  - keeps a Puppeteer browser/page warm;
  - starts the app server lazily on an ephemeral loopback port;
  - navigates to the plot route and waits on the scoped readiness marker;
  - screenshots the plot element to PNG;
  - returns base64 PNG data, dimensions, content type, browser PID, renderer
    instance ID, app port, and timing metadata;
  - closes page, browser, and app server on daemon cleanup.
- `src/ipc/protocol.ts`
  - adds `renderPng` and the JSON-framed `RenderPngResult` response shape.
- `src/daemon/server.ts`
  - wires `renderPng` into daemon IPC;
  - preserves Stage 3 `render` as render-intent registration;
  - converts render failures into stable structured errors.
- `src/bin/termplot.ts`
  - adds the Stage 4 debug command `termplot plots render-png <id>`.
- `tests/browser-renderer.test.ts`
  - verifies PNG rendering, PNG signature/dimensions, timing metadata, warm
    renderer reuse, app-port cleanup, browser cleanup, and missing-plot errors.

Stable render errors added:

- `PLOT_NOT_FOUND`
- `RENDER_TIMEOUT`
- `RENDER_NAVIGATION_FAILED`
- `RENDER_BROWSER_ERROR`
- `RENDER_SCREENSHOT_FAILED`

Verification commands:

```bash
pnpm add express puppeteer plotly.js-dist-min react react-dom react-router @types/express @types/react @types/react-dom
pnpm approve-builds --all
pnpm install
pnpm run build
pnpm test
ps -axo pid=,ppid=,command= | rg 'termplotd|termplotd-browser|chrome.*puppeteer|chrome-headless|Chromium' || true
git add -N pnpm-workspace.yaml src/renderer tests/browser-renderer.test.ts
git diff --check
```

`pnpm test` passed:

```text
✔ daemon renders stored Plotly config to PNG and reuses warm renderer
✔ renderPng returns structured errors for missing plots
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
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

The renderer test proves both renders report the same `browserPid` and
`rendererInstanceId`, which is deterministic warm reuse evidence. It also
decodes `pngBase64`, verifies the PNG signature, checks dimensions, confirms the
daemon-owned app port accepts connections while rendering, then verifies the
port closes after daemon shutdown and the probe-owned browser process exits.

The final process check showed no leftover `termplotd`, `termplotd-browser`,
Puppeteer Chrome, headless Chrome, or Chromium processes other than the check
command itself.

`git diff --check` passed with new implementation and test files included via
intent-to-add.

## Conclusion

Stage 4 is complete. TermPlot v1 now has the daemon-side path from stored Plotly
config to PNG bytes:

1. register config through Stage 3 `render`;
2. call Stage 4 `renderPng` with the plot ID;
3. daemon serves the plot through its internal app server;
4. warm Puppeteer renderer waits for deterministic Plotly readiness;
5. daemon returns base64 PNG data and render metadata through JSON IPC.

The next experiment should implement Stage 5: the user-facing CLI render
workflow, including JSON input from argument/file/stdin, daemon auto-start,
render registration, PNG output, and handoff to terminal display selection in
Stage 6.

## Completion Review

Reviewer: Pauli (`019ecbc4-dec0-7d43-9050-3272d016ef89`), fresh-context Codex
completion reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that Stage 4 is marked complete while
later stages remain unchecked, Experiment 4 has `Result` and `Conclusion`, Stage
3 `render` registration is preserved separately from `renderPng`, `renderPng`
returns base64 PNG metadata through JSON IPC, readiness is reset/token-scoped
with structured render errors, tests cover PNG signature/dimensions, warm reuse,
app-port cleanup, browser cleanup, missing plot errors, and existing
lifecycle/registry compatibility, scope scan found no Stage 6 terminal
protocol/display or Stage 8 Nushell implementation, `git diff
--check` and
`pnpm exec tsc -p tsconfig.json --noEmit` passed, and the result commit had not
yet been made.

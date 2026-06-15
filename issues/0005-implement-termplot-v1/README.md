+++
status = "closed"
opened = "2026-06-15"
closed = "2026-06-15"
+++

# Issue 5: Implement TermPlot v1

## Goal

Implement TermPlot v1 end to end after Issue 4 decides the client/display-layer
language and terminal image protocol strategy.

The finished tool should let a user run `termplot` with a Plotly config, start
or reuse `termplotd`, render the plot through a warm browser-backed React Router
app, and display the resulting image in supported macOS terminals.

## Background

Issue 1 archived the v0 prototype. Issue 2 proved that real terminal rendering
can be tested in Ghostty by opening an isolated terminal, displaying a known
image, taking a screenshot, asserting pixels, and cleaning up. Issue 3 chose
TypeScript/Node for the daemon and initially preferred TypeScript/Node for the
CLI, while deferring Rust. Issue 4 was then opened to settle the remaining
display-layer uncertainty by proving terminal image protocols from both Node.js
and Rust in Ghostty and iTerm2.

This issue depends on Issue 4. Do not start implementation experiments here
until Issue 4 has closed with an evidence-backed recommendation for:

- client/display-layer language: Node.js, Rust, or hybrid;
- terminal protocol priority;
- supported terminals for v1;
- libraries or in-repo protocol encoders to use;
- protocols to defer.

## Architecture

The daemon and foreground client/display layer are TypeScript/Node for v1. Issue
4 proved that Node.js can emit the required macOS terminal image protocols
directly, so v1 does not need a Rust client unless a later accepted experiment
reopens that decision. `termplotd` owns:

- local IPC server;
- lifecycle state;
- React Router/Express app;
- warm browser renderer;
- in-memory plot registry;
- screenshot pipeline;
- structured render responses.

The foreground `termplot` client owns:

- CLI parsing and daemon auto-start/connect behavior;
- terminal detection and protocol selection;
- direct in-repo encoders for terminal image display;
- PNG file output when terminal display is not requested.

The implementation should keep the daemon protocol stable enough that the client
can change in a later issue without rewriting the renderer.

## Stage Checklist

Experiments should implement these stages in order after Issue 4 closes. The
stage list is a roadmap, not permission to implement everything in one
experiment.

- [x] Stage 1: Adopt Issue 4's protocol and client-language decision.
  - Chosen client/display language: TypeScript/Node.
  - Protocol priority: Ghostty Kitty graphics first, iTerm2 OSC 1337 second,
    iTerm2 SIXEL compatibility third.
  - Supported macOS terminals for v1: Ghostty and iTerm2.
  - Initial implementation path: direct in-repo encoders, not external renderers
    or C bindings.
  - Selected encoders:
    - Ghostty: direct Kitty graphics encoder.
    - iTerm2 default: direct OSC 1337 `File=` PNG emitter.
    - iTerm2 compatibility: direct SIXEL encoder only if needed after the
      default path works.
  - Deferred paths:
    - ANSI/Unicode block fallback.
    - iTerm2 Kitty graphics.
    - Rust client/display layer.
    - non-macOS terminals and multiplexers.
  - Keep `timg` as a test oracle only, not production rendering.
- [x] Stage 2: `termplotd` lifecycle skeleton.
  - Start from a new v1 TypeScript/Node workspace outside `v0/`.
  - Create `termplotd` entrypoint.
  - Add local socket IPC and request/response framing.
  - Implement probe-before-bind so a new daemon never steals a live daemon's
    socket.
  - Implement client auto-start with detached daemon process, null stdin, log
    redirection, bounded socket polling, and clear startup errors.
  - Add `termplot daemon status|start|stop|restart|ttl`.
  - Add default one-hour idle TTL with flag/env/runtime override.
    - Env override: `TERMPLOTD_TTL_MS`.
    - Precedence: `--ttl-ms` flag, then `TERMPLOTD_TTL_MS`, then one hour.
  - Ensure render-like activity renews the lease while status/config inspection
    does not.
  - Cleanly unlink sockets on explicit shutdown, idle expiry, SIGTERM, and
    SIGINT.
  - Add tests using private temporary sockets so no real daemon is harmed.
- [x] Stage 3: daemon plot registry and protocol.
  - Define request/response schemas for render, get/list/delete/clear plots,
    status, ttl, and shutdown.
  - Store Plotly configs in memory by ID.
  - Support individual plot deletion and clearing all plots.
  - Clear all plots on daemon exit.
  - Return structured errors with stable machine-readable codes.
- [x] Stage 4: browser app and renderer port.
  - Port the v0 React Router/Express Plotly route into the v1 daemon app.
  - Keep browser/page or browser/context warm across renders.
  - Add deterministic browser-side render readiness instead of fixed sleeps.
  - Screenshot the plot element or page to a PNG buffer.
  - Return PNG bytes, width, height, plot ID, and timing metadata.
- [x] Stage 5: CLI render workflow.
  - Parse Plotly JSON from an argument, file, or stdin.
  - Validate width/height and Plotly config shape.
  - Auto-start or connect to `termplotd`.
  - Send render requests to `termplotd`.
  - Support `--output <file>` for PNG output.
  - Support explicit protocol selection based on Issue 4's results.
- [x] Stage 6: terminal image display.
  - Implement the protocol path selected by Issue 4.
  - Preserve any working fallback protocols identified by Issue 4.
  - Detect supported terminals conservatively.
  - Report unsupported terminals clearly.
  - Keep `timg` as a test oracle only if Issue 4 found it useful.
- [x] Stage 7: full-stack verification.
  - Reuse the Issue 2/Issue 4 screenshot harnesses to verify real terminal image
    rendering with TermPlot output.
  - Assert pixels from rendered Plotly output.
  - Verify daemon reuse makes second render faster than cold start.
  - Verify cleanup leaves no probe-owned daemon, browser, terminal, or helper
    process running.
  - Ghostty and iTerm2 full-stack probes passed with real TermPlot output,
    screenshot pixel assertions, daemon reuse timing evidence, and attributed
    cleanup.
  - Stage 8 can rely on the daemon/client contract. Local setup still requires
    macOS Screen Recording permission, target terminals, and GraphicsMagick for
    screenshot probes.
- [x] Stage 8: Nushell integration.
  - Provide a Nushell-friendly command or plugin path that uses the same daemon.
  - Accept Nushell pipeline values and convert them to Plotly JSON.
  - Return binary PNG data or terminal display output in the shape Nushell users
    expect.
  - Preserve the cross-shell daemon contract instead of creating a separate
    plugin-only browser lifecycle.
  - Implemented `termplot.nu` as a thin Nushell wrapper over the external CLI.
    It returns binary PNG data by default, supports `--output`, and uses the
    same `termplotd` daemon.
  - Browser-backed verification now uses Playwright Firefox because Chromium
    cannot launch from the current macOS automation session.
- [x] Stage 9: packaging and documentation.
  - Update package metadata, scripts, and build outputs for `termplot`,
    `termplotd`, and any client/display binary selected by Issue 4.
  - Document install, daemon lifecycle, supported terminals, permissions,
    protocol selection, and troubleshooting.
  - Add examples that prove plain shell and Nushell usage.
  - Package and document `termplot.nu`, including `source termplot.nu`, default
    binary PNG pipeline output, `--output`, `--display`, and daemon options.
  - Document the Playwright Firefox browser dependency and how users install or
    verify the required browser artifact.
  - Added package metadata, package file allowlist, Playwright Firefox install
    and verification scripts, shell/Nushell smoke scripts, package/docs tests,
    and top-level README documentation.
  - Keep `CLAUDE.md` as a symlink to `AGENTS.md` wherever agent docs are added.

## Constraints

- Do not start implementation experiments until Issue 4 is closed.
- Do not assume a protocol works because an external tool renders it.
- Treat permission prompts as setup failures, not dialogs to accept.
- Do not use Ghostty's prompt-producing `-e` command path in automated tests.
- Do not kill generic terminal, browser, Node, Rust, daemon, or helper
  processes. Cleanup must be attributed to processes opened by the experiment or
  test.
- Keep macOS as the required platform for v1 unless a later issue expands scope.
- Do not preserve v0 lifecycle behavior. Preserve v0 rendering ideas only where
  they still fit the daemon architecture.
- Do not implement all stages in one experiment. The stages are an ordered
  implementation map; experiments iterate through them.

## Verification Strategy

Issue 5 closes only when TermPlot v1 can:

1. start from no running daemon;
2. run `termplot` with a Plotly config;
3. auto-start or connect to `termplotd`;
4. render through a warm browser-backed React Router app;
5. display output in the selected terminal protocol;
6. capture and assert screenshot pixels in a real target terminal;
7. run a second plot through the warm daemon and record timing evidence;
8. stop or expire the daemon cleanly;
9. verify no probe-owned processes remain.

The conclusion should summarize the implemented architecture, supported
terminals and protocols, known limitations, and follow-up issues.

## Experiments

- [Experiment 1: Adopt protocol decision](01-adopt-protocol-decision.md) -
  **Pass**
- [Experiment 2: Implement termplotd lifecycle skeleton](02-implement-termplotd-lifecycle-skeleton.md) -
  **Pass**
- [Experiment 3: Implement plot registry protocol](03-implement-plot-registry-protocol.md) -
  **Pass**
- [Experiment 4: Implement browser renderer](04-implement-browser-renderer.md) -
  **Pass**
- [Experiment 5: Implement CLI render workflow](05-implement-cli-render-workflow.md) -
  **Pass**
- [Experiment 6: Implement terminal image display](06-implement-terminal-image-display.md) -
  **Pass**
- [Experiment 7: Verify full-stack terminal rendering](07-verify-full-stack-terminal-rendering.md) -
  **Pass**
- [Experiment 8: Implement Nushell integration](08-implement-nushell-integration.md) -
  **Pass**
- [Experiment 9: Package and document v1](09-package-and-document-v1.md) -
  **Pass**

## Conclusion

Issue 5 delivered TermPlot v1 as a macOS-focused TypeScript/Node tool.

The implemented architecture is:

- `termplotd`: a detached local daemon with socket IPC, one-hour default idle
  TTL, explicit lifecycle commands, in-memory plot registry, React
  Router/Express app, and warm Playwright Firefox browser renderer.
- `termplot`: a CLI that reads Plotly JSON from an argument, file, or stdin,
  auto-starts or reuses `termplotd`, renders PNG files with `--output`, and
  emits terminal image bytes when no output file is requested.
- `termplot.nu`: a Nushell wrapper that sources as `termplot`, accepts pipeline
  values, returns binary PNG data by default, supports `--output` metadata, and
  can pass terminal image output through with `--display`.

Supported macOS terminal display paths are Ghostty through Kitty graphics and
iTerm2 through OSC 1337 inline images. SIXEL was proved in Issue 4 but remains a
deferred compatibility path.

The Issue 5 closure checklist is satisfied:

1. `termplotd` starts from no running daemon and reports status.
2. `termplot render` accepts Plotly configs.
3. CLI render auto-starts or connects to `termplotd`.
4. The daemon renders through a warm browser-backed app and reuses the renderer.
5. Terminal image output is emitted through Kitty or iTerm2 protocols.
6. Stage 7 verified real Ghostty and iTerm2 terminal screenshots with pixel
   assertions.
7. Stage 7 recorded warm-daemon timing evidence for both target terminals.
8. Daemons stop explicitly and expire by TTL.
9. Tests and probes clean up attributed daemon, browser, terminal, and helper
   processes; final Stage 9 checks left no test-owned processes running.

Known limitations:

- v1 is macOS-only.
- Browser rendering uses Playwright Firefox because Chromium could not launch in
  the current macOS automation session.
- iTerm2 SIXEL is not exposed as a production protocol yet.
- Plot records stay in memory until deleted or the daemon exits.

Follow-up issues can expand non-macOS support, expose SIXEL if needed, add
richer package publishing/release automation, and revisit renderer choices if
Chromium becomes reliable in the target environment.

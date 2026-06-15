# Experiment 2: Implement termplotd lifecycle skeleton

## Description

Implement the Stage 2 lifecycle skeleton for TermPlot v1 in a new
TypeScript/Node workspace outside `v0/`. This experiment should create the
minimal daemon/client foundation needed by later plot registry, browser
renderer, and terminal display stages.

The skeleton must prove daemon lifecycle behavior without touching the archived
prototype:

- `termplotd` can bind a private local socket and answer framed IPC requests.
- `termplot` can run daemon management commands.
- A client can probe an existing daemon before starting a new one.
- Auto-start can launch a detached daemon, wait for readiness, and connect.
- Idle TTL defaults to one hour and can be overridden for tests.
- A lifecycle-only `daemon renew` command simulates render-like activity and
  renews the lease while status/config inspection does not.
- Explicit shutdown and idle expiry cleanly unlink the socket.
- SIGTERM and SIGINT sent to probe-owned daemon PIDs cleanly unlink the socket.
- Tests use private temporary sockets and never control a real user daemon.

This experiment must not implement Plotly storage, browser rendering, terminal
image output, or Nushell integration. Those are later stages.

## Changes

- Add root v1 package metadata and TypeScript configuration.
  - Create `package.json` with `termplot` and `termplotd` bins.
  - Create a root `tsconfig.json`.
  - Add build and test scripts.
  - Let pnpm manage lock/workspace metadata if needed; do not manually edit pnpm
    internals.
- Add v1 source under `src/`.
  - `src/bin/termplot.ts`: foreground CLI entrypoint.
  - `src/bin/termplotd.ts`: daemon entrypoint.
  - `src/ipc/*`: socket path, newline-delimited JSON framing, request/response
    helpers.
  - `src/daemon/*`: daemon server, lifecycle state, idle timer, signal cleanup.
  - `src/client/*`: daemon status/start/stop/restart/ttl/renew commands and
    auto-start helper.
  - `daemon renew` is a lifecycle-only no-op request that updates idle activity;
    it must not accept Plotly configs, create plot IDs, start a browser, or
    implement render protocol behavior.
- Add tests under `tests/`.
  - Use Node's built-in test runner.
  - Use only temp directories and explicit test socket paths.
  - Verify probe-before-bind, detached auto-start, status, stop, restart, TTL
    override, lease renewal, idle expiry, signal cleanup, and socket unlinking.
- Keep `v0/` unchanged.
- Update the Issue 5 README Stage 2 status and Experiment 2 result after the
  implementation is verified.

## Verification

Pass criteria:

- `pnpm install` succeeds if dependency metadata changed.
- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- `node build/bin/termplot.js daemon status --socket <missing-test-socket>`
  reports no daemon without starting one.
- `node build/bin/termplot.js daemon start --socket <tmp-socket> --ttl-ms 1000`
  starts `termplotd`, waits for readiness, and reports the daemon PID/socket.
- Detached startup uses null stdin or equivalent non-interactive behavior,
  redirects logs to a caller-provided temp log path, survives after the starter
  process exits, and uses bounded readiness polling with a clear timeout error.
- A startup-failure test uses an invalid or blocked socket path and reports a
  clear startup error without leaving a daemon or socket behind.
- `node build/bin/termplot.js daemon status --socket <tmp-socket>` reports a
  running daemon with uptime and TTL metadata.
- Starting again against the same socket probes the existing daemon and does not
  steal or replace it.
- `node build/bin/termplot.js daemon ttl --socket <tmp-socket> --ttl-ms 200`
  updates the idle TTL.
- `node build/bin/termplot.js daemon renew --socket <tmp-socket>` extends the
  idle deadline while `daemon status` does not.
- `node build/bin/termplot.js daemon stop --socket <tmp-socket>` shuts down the
  daemon and unlinks the socket.
- Tests verify idle expiry unlinks the socket and leaves no probe-owned daemon.
- Tests start daemons on private temp sockets, send SIGTERM and SIGINT only to
  those spawned PIDs, then assert daemon exit, socket unlinking, and no
  probe-owned daemon remains.
- `dprint fmt` succeeds on changed issue files.
- `git diff --check` passes.

Partial criteria:

- Core IPC and explicit start/status/stop work, but detached auto-start or idle
  expiry needs a follow-up experiment.

Fail criteria:

- The implementation can control or kill a real user daemon during tests.
- A new daemon can steal an existing daemon's live socket.
- Sockets are left behind after explicit shutdown or idle expiry.
- Sockets are left behind after SIGTERM or SIGINT.
- The experiment touches or depends on `v0/` runtime files.

## Design Review

Reviewer: Euclid (`019ecba1-cbf1-7233-8163-fe6761a4325b`), fresh-context Codex
design reviewer.

Initial findings:

- Blocker: verification omitted SIGTERM/SIGINT cleanup even though Stage 2
  requires signal cleanup.
- Major: detached auto-start/readiness criteria did not cover detached survival,
  null stdin, log redirection, bounded readiness timeout, or startup failures.
- Major: the render-like lease-renewal command was referenced but not defined.
- Minor: the experiment file had no `Design Review` section yet.

Fixes:

- Added SIGTERM and SIGINT tests that signal only probe-owned daemon PIDs and
  verify exit, socket unlinking, and no leftover probe-owned daemon.
- Added detached startup criteria for non-interactive stdin, temp log
  redirection, detached survival, bounded readiness polling, and startup-error
  reporting.
- Defined `daemon renew` as a lifecycle-only no-op lease-renewal command that
  cannot accept Plotly configs, create plot IDs, start a browser, or implement
  render protocol behavior.

Re-review: approved. The reviewer confirmed that all prior findings were
resolved and that no new blockers were introduced.

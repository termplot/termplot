---
title: "The daemon"
description: "termplotd lifecycle: auto-start, the warm renderer, idle TTL, sockets, and the plot registry."
order: 30
section: "Guide"
---

`termplotd` is the background daemon that owns the browser renderer and the plot
registry. The `termplot` CLI talks to it over a local Unix socket.

## Auto-start and reuse

Most render commands auto-start `termplotd` when it isn't running and reuse it for
later plots. The daemon launches detached, so it outlives the command that
started it. Because it keeps a Playwright Firefox browser warm, the first render
pays the browser-startup cost and subsequent renders are fast.

You can also manage it explicitly:

```bash
termplot daemon status
termplot daemon start
termplot daemon stop
termplot daemon restart
```

## Idle TTL

The daemon shuts itself down after an idle period. The default TTL is **one hour**.
You can override it, in order of precedence:

1. the `--ttl-ms <ms>` flag,
2. the `TERMPLOTD_TTL_MS` environment variable,
3. the one-hour default.

```bash
# Start with a five-minute idle TTL
termplot daemon start --ttl-ms 300000

# Or via the environment
TERMPLOTD_TTL_MS=300000 termplot render --file plot.json
```

Change the TTL on a running daemon, or reset its idle deadline, at runtime:

```bash
termplot daemon ttl --ttl-ms 600000
termplot daemon renew
```

## Status

`termplot daemon status` reports whether a daemon is running and, if so, a status
object with these fields:

| Field | Meaning |
| --- | --- |
| `pid` | The daemon process id. |
| `socketPath` | The Unix socket it is listening on. |
| `startedAt` | ISO timestamp of when it started. |
| `uptimeMs` | Milliseconds since start. |
| `ttlMs` | The current idle TTL. |
| `idleDeadlineAt` | ISO timestamp when it will expire if idle. |
| `idleRemainingMs` | Milliseconds left before idle expiry. |

## Sockets

By default the daemon listens on `${TMPDIR}/termplotd-<uid>.sock`. Use `--socket
<path>` to run an isolated daemon — handy for scripts and tests that should not
touch your main daemon:

```bash
termplot daemon start --socket /tmp/termplotd-test.sock
termplot render --file plot.json --socket /tmp/termplotd-test.sock
termplot daemon stop --socket /tmp/termplotd-test.sock
```

The daemon unlinks its socket on a clean shutdown, on idle expiry, and on
`SIGTERM`/`SIGINT`.

## Plot registry

The daemon stores Plotly configs in memory, keyed by id. Plots persist for the
daemon's lifetime and are cleared when it exits — there is no on-disk store.
Inspect or manage them with the [`termplot plots`](/docs/cli/) subcommands.

## The renderer

The daemon serves a React Router / Express app that draws the Plotly chart, and
screenshots it with **Playwright Firefox**. Firefox is required; Chromium was
tested but rejected because headless Chromium hung connecting to macOS SkyLight in
this environment.

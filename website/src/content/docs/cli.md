---
title: "CLI reference"
description: "Every termplot command and flag: render, daemon, and plots."
order: 20
section: "Guide"
---

The `termplot` CLI has three subcommands: `render`, `daemon`, and `plots`. A
subcommand is required — running `termplot` with none prints a usage error.

## `termplot render`

Render a Plotly config. The config comes from exactly one source:

- a positional JSON argument: `termplot render '{"data":[...]}'`
- a file: `termplot render --file plot.json`
- a flag: `termplot render --json '{"data":[...]}'`
- stdin, when no other source is given and stdin is not a terminal:
  `cat plot.json | termplot render`

Passing more than one source is an error.

### Terminal output vs. PNG file

Without `--output`, `render` prints the plot to your terminal as an image,
choosing the protocol from `--protocol` (default `auto`, which detects Ghostty or
iTerm2):

```bash
termplot render --file plot.json
```

```nu
source termplot.nu
open plot.json | from json | termplot --display
```

With `--output <file>`, `render` writes the PNG to that path and prints JSON
metadata instead of drawing in the terminal:

```bash
termplot render --file plot.json --output plot.png
```

The metadata object includes `plotId`, `output`, `protocol`, `contentType`,
`width`, `height`, `daemonPid`, `startedDaemon`, `browserPid`,
`rendererInstanceId`, `appPort`, and a `timings` block (daemon start, register,
and render phases).

## Global options

These options work across the render and daemon commands:

| Option | Meaning |
| --- | --- |
| `--socket <path>` | Daemon IPC socket. Defaults to `${TMPDIR}/termplotd-<uid>.sock`. |
| `--ttl-ms <ms>` | Daemon idle TTL in milliseconds. |
| `--log <path>` | File for daemon startup/render logs. |
| `--timeout-ms <ms>` | Request timeout. Defaults: register 1000 ms, PNG render 15000 ms. |
| `--json <json>` | Plotly config as a JSON string (render / `plots register`). |
| `--file <path>` | Read the Plotly config from a file (render). |
| `--output <file>` | Write a PNG file and print metadata instead of terminal output. |
| `--protocol <name>` | `auto`, `kitty`, `iterm2`, or `sixel`. See [Terminals & protocols](/docs/terminals/). |

## `termplot daemon`

Manage the background `termplotd` daemon. See [The daemon](/docs/daemon/) for the
lifecycle details.

| Command | Effect |
| --- | --- |
| `termplot daemon status` | Print `{ running: true, status }` or `{ running: false, socketPath }`. |
| `termplot daemon start` | Start the daemon (or probe an existing one). Accepts `--ttl-ms`, `--log`. |
| `termplot daemon stop` | Stop the daemon. |
| `termplot daemon restart` | Stop then start. Accepts `--ttl-ms`, `--log`. |
| `termplot daemon ttl --ttl-ms <ms>` | Change the idle TTL at runtime (requires `--ttl-ms`). |
| `termplot daemon renew` | Reset the idle deadline. |

## `termplot plots`

Inspect and manage the daemon's in-memory plot registry.

| Command | Effect |
| --- | --- |
| `termplot plots list` | List all registered plots. |
| `termplot plots register --json '<config>'` | Register a config without rendering. |
| `termplot plots get <id>` | Fetch a plot by id. |
| `termplot plots delete <id>` | Delete one plot. |
| `termplot plots render-png <id>` | Render a registered plot to PNG metadata. |
| `termplot plots clear` | Delete all plots. |

## Errors

On a known error the CLI prints a JSON object and exits non-zero:

```json
{ "ok": false, "error": { "code": "UNSUPPORTED_TERMINAL", "message": "..." } }
```

Codes you may see include `INVALID_JSON`, `INVALID_PLOT_CONFIG`,
`INVALID_DIMENSIONS`, `INVALID_PROTOCOL`, `UNSUPPORTED_TERMINAL`, and
`PROTOCOL_NOT_IMPLEMENTED`.

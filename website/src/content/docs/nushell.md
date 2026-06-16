---
title: "Nushell"
description: "The native termplot command for Nushell: pipeline input, binary PNG output, display, and daemon options."
order: 60
section: "Guide"
---

TermPlot ships a Nushell wrapper, `termplot.nu`, that gives you a native
`termplot` command. It builds the Plotly config from a pipeline value, calls the
CLI, and shares the same `termplotd` daemon.

## Source the wrapper

```nu
source termplot.nu
```

This defines the `termplot` command for the current session.

## Pipeline input

Pipe a record (or any value Nushell can serialize to JSON) into `termplot`:

```nu
let plot = {
  data: [{ x: [1, 2, 3], y: [2, 5, 3], type: "scatter" }]
  layout: { width: 640, height: 480 }
  config: { staticPlot: true }
}

$plot | termplot --output plot.png
```

## Output modes

The wrapper has three output modes:

- **Default (binary PNG):** with neither `--output` nor `--display`, `termplot`
  returns the PNG as binary data into the pipeline:

  ```nu
  $plot | termplot | save --force plot.png
  ```

- **`--output <file>`:** writes the PNG to the file and returns the CLI's JSON
  metadata as a Nushell record:

  ```nu
  $plot | termplot --output plot.png
  ```

- **`--display`:** prints the plot straight into the terminal using the image
  protocol (Ghostty or iTerm2):

  ```nu
  $plot | termplot --display
  ```

## Options

`termplot` accepts these flags:

| Flag | Meaning |
| --- | --- |
| `--output <path>` | Write a PNG file and return JSON metadata. |
| `--protocol <name>` | Terminal protocol; defaults to `auto`. |
| `--socket <path>` | Daemon socket path. |
| `--ttl-ms <int>` | Daemon idle TTL in milliseconds. |
| `--log <path>` | Daemon log file. |
| `--timeout-ms <int>` | Request timeout in milliseconds. |
| `--display` | Print the plot in the terminal instead of returning bytes. |
| `--cli <path>` | Path to the `termplot` CLI, if it isn't next to `termplot.nu`. |

By default the wrapper finds the CLI relative to `termplot.nu`; use `--cli` to
point at a specific build.

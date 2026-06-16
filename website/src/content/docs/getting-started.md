---
title: "Getting started"
description: "What TermPlot is, how to install it, and how to render your first Plotly plot in the terminal."
order: 10
section: "Start"
---

TermPlot renders [Plotly](https://plotly.com/javascript/) plots inside your
terminal as real images. It runs a small local daemon (`termplotd`) that keeps a
browser warm, draws your chart, screenshots it, and prints the picture through
your terminal's image protocol — Kitty graphics in Ghostty, OSC 1337 inline
images in iTerm2.

TermPlot is macOS-only for now, and supports Ghostty and iTerm2.

## How it works

1. You give the `termplot` CLI a Plotly config (a JSON object) from an argument,
   a file, or stdin.
2. The CLI auto-starts or reuses the background `termplotd` daemon.
3. The daemon renders the chart in a warm Playwright Firefox browser and
   screenshots it to a PNG.
4. The CLI either writes that PNG to a file (`--output`) or prints it to your
   terminal using the right image protocol.

Because the daemon keeps the browser hot, the second plot renders much faster
than the first. The daemon shuts itself down after one hour idle.

## Install

Install with [Homebrew](https://brew.sh) on macOS:

```bash
brew install astrohacker/tap/termplot
```

This installs the `termplot` CLI and the `termplotd` daemon. macOS is the only
supported platform at this time. See [Installation](/docs/installation/) for the
full guide, including building from source.

## Your first plot

Render a Plotly config straight into your terminal (Ghostty or iTerm2):

```bash
termplot render '{"data":[{"x":[1,2,3],"y":[2,6,3],"type":"scatter"}]}'
```

```nu
source termplot.nu
{ data: [{ x: [1 2 3], y: [2 6 3], type: "scatter" }] } | termplot --display
```

Or write a PNG file instead of drawing in the terminal:

```bash
termplot render '{"data":[{"x":[1,2,3],"y":[2,6,3],"type":"scatter"}]}' \
  --output plot.png
```

```nu
source termplot.nu
{ data: [{ x: [1 2 3], y: [2 6 3], type: "scatter" }] } | termplot --output plot.png
```

## Where to next

- [Installation](/docs/installation/) — Homebrew and building from source.
- [CLI reference](/docs/cli/) — every `termplot` command and flag.
- [The daemon](/docs/daemon/) — `termplotd` lifecycle, TTL, and sockets.
- [Terminals & protocols](/docs/terminals/) — Ghostty, iTerm2, and protocol
  selection.
- [Plotly input](/docs/plotly/) — the config format TermPlot accepts.
- [Nushell](/docs/nushell/) — the native `termplot` command for Nushell.

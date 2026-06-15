# TermPlot

TermPlot renders Plotly plots inside terminals. It runs a local daemon
(`termplotd`) with a browser-backed React Router app, screenshots the rendered
plot, and prints the image using terminal image protocols.

TermPlot v1 is macOS-focused. Ghostty uses Kitty graphics output, and iTerm2
uses iTerm2 OSC 1337 inline images.

Real terminal screenshot probes require macOS permissions for the app or shell
that launches them. Grant Screen Recording permission before running the Ghostty
or iTerm2 probe scripts. Permission prompts are setup failures for automation;
the probes do not accept dialogs on your behalf.

## Setup

Install dependencies and build:

```sh
pnpm install
pnpm run playwright:install
pnpm run build
```

Verify the Playwright Firefox renderer:

```sh
pnpm run playwright:verify
```

TermPlot uses Playwright Firefox for browser screenshots. Chromium was tested
but rejected in this environment because headless Chromium hung while connecting
to macOS SkyLight.

## Shell Usage

Render a Plotly config to a PNG file:

```sh
node build/bin/termplot.js render \
  '{"data":[{"x":[1,2,3],"y":[2,5,3],"type":"scatter"}],"layout":{"width":640,"height":480},"config":{"staticPlot":true}}' \
  --output /tmp/termplot.png
```

Render directly to the terminal:

```sh
node build/bin/termplot.js render \
  '{"data":[{"x":[1,2,3],"y":[2,5,3],"type":"scatter"}],"layout":{"width":640,"height":480},"config":{"staticPlot":true}}' \
  --protocol auto
```

Use `--protocol kitty` for Ghostty and `--protocol iterm2` for iTerm2 when
automatic detection is not enough.

## Nushell Usage

Source the wrapper:

```nu
source termplot.nu
```

Write a PNG and receive structured metadata:

```nu
let plot = {
  data: [{ x: [1, 2, 3], y: [2, 5, 3], type: "scatter" }]
  layout: { width: 640, height: 480 }
  config: { staticPlot: true }
}

$plot | termplot --output /tmp/termplot.png
```

Return binary PNG data to the Nushell pipeline:

```nu
$plot | termplot | save --force /tmp/termplot.png
```

Display in the terminal from Nushell:

```nu
$plot | termplot --display --protocol auto
```

## Daemon Lifecycle

Most render commands auto-start `termplotd` when needed and reuse it for later
plots. The default idle TTL is one hour. Private sockets are useful for tests:

```sh
node build/bin/termplot.js daemon status --socket /tmp/termplotd.sock
node build/bin/termplot.js daemon start --socket /tmp/termplotd.sock --ttl-ms 3600000
node build/bin/termplot.js daemon stop --socket /tmp/termplotd.sock
```

Daemon options accepted by render commands include `--socket`, `--ttl-ms`,
`--timeout-ms`, and `--log`.

## Verification

Run all automated checks:

```sh
pnpm test
pnpm run smoke
pnpm run pack:check
```

The full-stack terminal probes live in `scripts/probe-ghostty-termplot.sh` and
`scripts/probe-iterm2-termplot.sh`. They open real terminal windows, render real
TermPlot output, screenshot it, assert pixels, and clean up only processes they
started.

## Troubleshooting

- Run `pnpm run playwright:install` if Firefox is missing.
- Use `--log /tmp/termplotd.log` to inspect daemon startup and render errors.
- Use `--protocol kitty` in Ghostty and `--protocol iterm2` in iTerm2 if
  `--protocol auto` cannot identify the terminal.
- Stop a private daemon with
  `node build/bin/termplot.js daemon stop --socket
  <path>`.

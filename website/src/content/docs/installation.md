---
title: "Installation"
description: "Install TermPlot with Homebrew on macOS, or build it from source."
order: 15
section: "Start"
---

TermPlot is macOS-only. Installing it gives you the `termplot` CLI and the
`termplotd` daemon.

## Homebrew (recommended)

Install with [Homebrew](https://brew.sh) on macOS:

```bash
brew install astrohacker/tap/termplot
```

> The Homebrew tap is not published yet. When it lands, this one command installs
> the CLI, the daemon, and the Firefox renderer they depend on.

## From source

You can run TermPlot from a source checkout today. You'll need **Node.js ≥ 24**
and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/astrohacker/termplot.git
cd termplot
pnpm install
pnpm run playwright:install
pnpm run build
```

`pnpm run playwright:install` downloads the Playwright **Firefox** browser that
the daemon renders with. Confirm it is available:

```bash
pnpm run playwright:verify
```

After `pnpm run build`, the CLI is `build/bin/termplot.js` and the daemon is
`build/bin/termplotd.js`. Run the CLI with Node:

```bash
node build/bin/termplot.js render '{"data":[{"y":[1,3,2],"type":"bar"}]}'
```

To use the bare `termplot` command shown elsewhere in these docs, symlink or
alias it onto your `PATH`, for example:

```bash
ln -s "$PWD/build/bin/termplot.js" /usr/local/bin/termplot
```

## Verify it works

Render a plot straight into Ghostty or iTerm2:

```bash
termplot render '{"data":[{"x":[1,2,3],"y":[2,6,3],"type":"scatter"}]}'
```

The first render starts the daemon and warms the browser, so it is slower than
later renders. See [The daemon](/docs/daemon/) for lifecycle details and
[Requirements & limitations](/docs/requirements/) for everything else you need.

# Termplot

**Beautiful plots in your terminal.**

## Screenshot

<img src="raw-images/screenshot.png" width="600" alt="termplot demo">

## Overview

Termplot renders the most beautiful and advanced plots directly inside your
terminal by running a web app inside an ephemeral web browser, taking a
screenshot, and using modern escape codes to render the image.

## Installation

### Any Shell

In bash, zsh, or any other shell, you can install Termplot globally with npm:

```bash
npm install -g termplot.nu
```

However, this form of Termplot opens a new browser window for every call, making
plots render a bit slowly. You can render plots much faster by using the Nushell
plugin instead.

### Nushell Plugin

If you are in [Nushell](https://nushell.sh), you can access the advanced form of
Termplot that manages a browser automatically in the background.

Instead of simply installing `termplot` globally, you can install the plugin.

First, install Termplot in your project with [pnpm](https://pnpm.io/):

```nu
pnpm install termplot.nu
```

Then, add the Termplot plugin to your current Nushell environment:

```nu
plugin add node_modules/.bin/nu_plugin_termplot
```

Finally, you must "use" the plugin and source the Termplot script:

```nu
plugin use termplot
source node_modules/termplot.nu/termplot.nu
```

## Usage

### In Bash or Zsh

Simply pipe a Plotly configuration JSON file directly into Termplot in any
terminal that supports the iterm image protocol:

```bash
cat plotly-config.json | termplot
```

This will render the plot in your terminal.

You can see examples in [./examples](./examples).

Learn how to write Plotly configuration files in their
[documentation](https://plotly.com/javascript/).

### In Nushell

If you have followed the Nushell plugin installation instructions above, you can
pipe a Nushell value directory into Termplot. Do this by using the `open`
command in Nushell instead of the `cat` command. Termplot will manage the
browser window automatically, so that subsequent calls to Termplot will render
plots almost instantly.

```nu
open plotly-config.json | termplot
```

## Compatibility

Termplot only supports the iTerm image protocol, which works in iTerm2 and
WezTerm.

## Plotting Tools

Termplot currently only supports Plotly plots.

## How it Works

Termplot finds an open port, runs a React Router / express web app, runs a
[puppeteer](https://github.com/puppeteer/puppeteer) web browser, and navigates
to the web app, loading the desired plot, taking a screenshot of the plot,
rendeirng the screenshot in the terminal, and then exiting.

## Dependencies

These tools make Termplot possible:

- [plotly.js](https://github.com/plotly/plotly.js)
- [puppeteer](https://github.com/puppeteer/puppeteer)
- [express](https://github.com/expressjs/express)
- [react-router](https://github.com/remix-run/react-router)
- [ansi-escapes](https://github.com/sindresorhus/ansi-escapes)

## TODO

- [x] Cat files into termplot and render the images in iTerm2/Wezterm
- [x] Support config templates for easy plotting: See beautiful.nu
- [ ] Support png file output
- [ ] Support other image protocols for other terminals
- [ ] Support other plotting libraries
- [x] Nushell plugin to hold browser open for faster rendering
- [ ] Provide `serve` alternative for viewing interactive plots in a browser

---

Copyright (C) 2025 Ryan X. Charles

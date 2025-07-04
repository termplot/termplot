# Termplot

**Beautiful plots in your terminal.**

## Screenshot

<img src="raw-images/screenshot.png" width="600" alt="termplot demo">

## Overview

Termplot renders the most beautiful and advanced plots directly inside your
terminal by running a web app inside an ephemeral web browser, taking a
screenshot, and using modern escape codes to render the image.

## Installation

```nushell
npm install -g @termplot/termplot
```

## Usage

Simply pipe a Plotly configuration JSON file directly into Termplot in any
terminal that supports the iterm image protocol:

```nushell
cat plotly-config.json | termplot
```

You can see examples in [./examples](./examples).

Learn how to write Plotly configuration files in their
[documentation](https://plotly.com/javascript/).

## Compatibility

Termplot only supports the iTerm image protocol, which works in iTerm2 and
Wezterm.

## Plotting tools

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
- [ ] Support config templates for easy plotting
- [ ] Support png file output
- [ ] Support other image protocols for other terminals
- [ ] Support other plotting libraries
- [ ] nushell plugin to hold browser open for faster rendering
- [ ] Provide `serve` alternative for viewing interactive plots in a browser

---

Copyright (C) 2025 Ryan X. Charles

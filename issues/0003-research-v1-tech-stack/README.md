+++
status = "closed"
opened = "2026-06-15"
closed = "2026-06-15"
+++

# Issue 3: Research TermPlot v1 tech stack

## Goal

Determine the technical stack for TermPlot v1, with emphasis on programming
language choices, daemon architecture, Plotly/browser rendering, screenshot
capture, and terminal image display libraries.

## Background

TermPlot v0 was a TypeScript/Node prototype that rendered Plotly plots by
running a local web app, taking a browser screenshot, and printing the image
through terminal image escape codes. V1 should keep the useful parts of that
approach while replacing the prototype lifecycle with a real daemon,
`termplotd`.

The v1 direction is daemon-first. The foreground CLI should submit plot specs to
`termplotd`, which keeps the expensive rendering stack warm across plots. The
daemon should start on demand, stay alive while active, and exit after roughly
one hour of non-use. Plots may remain in memory while the daemon runs, can be
referenced by ID, and should be removed either individually or all at once when
`termplotd` exits.

The repository now has a Ghostty-based end-to-end image harness from Issue 2.
That harness proves that TermPlot can open an isolated Ghostty window, render a
known image with `timg -p kitty`, capture a screenshot, assert pixels, and clean
up probe-owned processes without accepting interactive permission prompts. The
v1 stack decision should build on that proof instead of treating terminal image
display as hypothetical.

`~/dev/nutorch` contains `nutorchd`, which may provide useful prior art for
daemon lifecycle management. The archived v0 TermPlot code should be studied to
understand which rendering decisions worked, which startup costs were expensive,
and where TypeScript/Node helped or constrained the prototype.

## Analysis

This issue should produce a researched recommendation, not a full v1
implementation. The recommendation should answer:

- Which parts of TermPlot v1 should be implemented in TypeScript/Node,
  especially the React Router app, Plotly.js rendering path, browser automation,
  and screenshot capture.
- Whether the foreground `termplot` CLI should remain TypeScript/Node or move to
  Rust for process supervision, terminal detection, image protocol handling,
  binary distribution, and Nushell integration.
- Whether `termplotd` should be pure Node, Rust supervising a Node rendering
  worker, or another split.
- Which IPC mechanism should connect the foreground CLI to `termplotd`, such as
  localhost HTTP, Unix domain sockets, lockfiles, portfiles, or a model adapted
  from `nutorchd`.
- Which libraries are available and appropriate for terminal image output,
  including Kitty graphics, iTerm2 inline images, SIXEL, and existing tools or
  libraries such as `timg`.
- Which image-processing libraries are useful for encoding, resizing, screenshot
  analysis, or terminal protocol generation in the candidate languages.
- What v0 did for rendering and terminal output, and which pieces should be
  preserved, replaced, or isolated behind interfaces.
- What risks remain around macOS permissions, daemon cleanup, terminal protocol
  support, and cross-platform behavior.

The expected outcome is a clear architecture recommendation for TermPlot v1:
language/runtime choices, daemon lifecycle model, rendering pipeline, image
output strategy, and a ranked list of implementation risks. After this research
issue closes, later issues can implement the daemon, CLI, renderer API, and
terminal image output paths as separate experiments.

## Experiments

- [Experiment 1: Research v1 stack options](01-research-v1-stack-options.md) -
  **Pass**

## Conclusion

TermPlot v1 should use TypeScript/Node for both `termplotd` and the foreground
`termplot` CLI. The daemon should own the React Router/Express app, warm browser
controller, in-memory plot registry, Plotly rendering route, screenshot capture,
and lifecycle state. The CLI should stay thin: parse input, auto-start the
daemon, send render requests, receive PNG bytes and metadata, and emit terminal
image escape codes or write a PNG file.

Rust is deferred. It remains a good future option for a native CLI, packaging,
or terminal display module, but it does not remove the browser/Plotly.js runtime
that makes TermPlot work. Introducing Rust before the daemon API is stable would
add a second build system and cross-language packaging without solving the
highest-risk part of v1.

The daemon lifecycle should copy the proven `nutorchd` contract: local socket,
probe-before-bind, auto-start, log beside socket,
`status|start|stop|restart|ttl` commands, default one-hour idle TTL,
activity-based renewal, non-renewing status, clean signal/shutdown/expiry
cleanup, and no socket theft from a live daemon. Plot configs can remain in
memory, referenced by ID, removable individually, and cleared when `termplotd`
exits.

The rendering pipeline should port v0's working approach: store Plotly configs
by ID, serve a React Router route, render Plotly.js in a browser, screenshot to
PNG, and return the PNG. V0's plain CLI paid server/browser startup on every
call; v0's Nushell plugin proved that keeping the browser warm is the speed win.
V1 turns that plugin-local optimization into a cross-shell daemon.

Terminal output should be isolated behind a display module. First support Kitty
graphics for Ghostty, then iTerm2 inline images for iTerm2 and WezTerm. Use
`timg` as an independent benchmark/oracle in tests, not as a required runtime
dependency. Defer production SIXEL support until the core daemon and Ghostty
path are working.

Recommended next issue: implement the `termplotd` lifecycle skeleton and CLI
daemon commands before moving rendering into the daemon.

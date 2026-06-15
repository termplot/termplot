+++
status = "open"
opened = "2026-06-15"
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
  **Designed**

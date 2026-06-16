---
title: "Requirements & limitations"
description: "What you need to run TermPlot, and the known limitations of v1."
order: 70
section: "Guide"
---

## Requirements

- **macOS.** TermPlot v1 is macOS-only.
- **A supported terminal:** Ghostty or iTerm2.
- **Node.js ≥ 24** when running from source (the Homebrew formula bundles its own
  runtime).
- **Playwright Firefox.** The daemon renders with Firefox; the browser artifact is
  installed as part of setup. Chromium was tested but rejected because headless
  Chromium hung connecting to macOS SkyLight.

The full-stack terminal **probe scripts** in the repository have extra
requirements that ordinary use does not: macOS **Screen Recording** permission for
the shell or app that launches them, and **GraphicsMagick** for the pixel
assertions. You only need these if you run the probes yourself.

## Limitations

- **macOS only.** Non-macOS terminals, and terminal multiplexers like tmux and
  screen, are out of scope for v1.
- **Two terminals.** Only Ghostty (Kitty graphics) and iTerm2 (OSC 1337) are
  supported display targets.
- **Firefox renderer.** Rendering uses Playwright Firefox; there is no Chromium
  or Safari path.
- **In-memory plots.** The daemon keeps plots in memory only. They are cleared
  when it exits; there is no persistent store.
- **SIXEL is not a production path.** It was proven for iTerm2 but is not exposed
  as a display protocol — `--protocol sixel` raises `PROTOCOL_NOT_IMPLEMENTED`.
- **No text fallback.** There is no ASCII/Unicode block rendering for unsupported
  terminals; TermPlot reports the unsupported terminal instead.
- **Auto-detection needs the terminal environment.** `--protocol auto` relies on
  `TERM_PROGRAM` and related variables; if a wrapper strips them, pass
  `--protocol kitty` or `--protocol iterm2` explicitly.

---
title: "Terminals & protocols"
description: "Supported terminals, the Kitty and OSC 1337 image protocols, auto-detection, and manual protocol selection."
order: 40
section: "Guide"
---

TermPlot prints plots as real images using terminal image protocols. For v1 it
supports two macOS terminals:

- **Ghostty** — via the **Kitty graphics** protocol.
- **iTerm2** — via the **OSC 1337** inline image protocol.

## Auto-detection

With `--protocol auto` (the default), TermPlot picks the protocol from your
environment:

- **Ghostty** is detected when `TERM_PROGRAM` is `ghostty` or `Ghostty`, or when
  `GHOSTTY_RESOURCES_DIR` is set → Kitty graphics.
- **iTerm2** is detected when `TERM_PROGRAM` is `iTerm.app` or `iTerm2`, or when
  `ITERM_SESSION_ID` is set → OSC 1337.

If neither is detected, TermPlot reports an `UNSUPPORTED_TERMINAL` error and asks
you to choose a protocol explicitly.

## Choosing a protocol manually

When detection isn't enough — for example through a wrapper that drops the
terminal environment variables — pass `--protocol` directly:

```bash
# Ghostty
termplot render --file plot.json --protocol kitty

# iTerm2
termplot render --file plot.json --protocol iterm2
```

Auto-detection is skipped only for terminal output; when you pass `--output`, the
protocol just labels the metadata and any value is accepted.

## SIXEL

`--protocol sixel` is **not** a production display path. SIXEL output was proven
for iTerm2 during development, but full-colour Plotly screenshots would need
colour quantization, so requesting it raises a `PROTOCOL_NOT_IMPLEMENTED` error.
Use `iterm2` (OSC 1337) for iTerm2.

## Not yet supported

There is no ASCII/Unicode block fallback for unsupported terminals — TermPlot
reports the unsupported terminal rather than degrading to text. Terminal
multiplexers (tmux, screen) and non-macOS terminals are out of scope for v1.

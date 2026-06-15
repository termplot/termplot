# Experiment 1: Research terminal protocol support and libraries

## Description

Research terminal image protocol support and implementation options before
writing any Node.js or Rust emitters. This experiment should fill the first
evidence-backed version of the Issue 4 protocol matrix from primary terminal
documentation, package registries, crate documentation, and relevant v0/Issue 2
local evidence.

This experiment is documentation-only. It should not add implementation code.
Its job is to decide which protocol/language/terminal combinations are worth
testing in later proof experiments.

## Changes

- Add research findings to this experiment file:
  - Ghostty macOS support for Kitty, iTerm2 inline images, SIXEL, and
    ANSI/Unicode block output;
  - iTerm2 macOS support for Kitty, iTerm2 inline images, SIXEL, and
    ANSI/Unicode block output;
  - Node.js library candidates for each protocol;
  - Rust library candidates for each protocol;
  - direct-from-spec feasibility for each protocol;
  - C library options, if relevant;
  - risks around chunking, cursor movement, sizing, terminal state,
    transparency, and terminal multiplexers.
- Update the Issue 4 README protocol matrix with researched support/library
  statuses while leaving proof columns as `Pending` until later experiments
  render and screenshot real images.
- Update the Issue 4 experiment roadmap if research changes the best proof
  order.

## Verification

Pass criteria:

- The experiment uses primary terminal documentation for Ghostty and iTerm2
  support claims where available.
- The experiment uses current package/crate sources for Node.js and Rust library
  candidates.
- The experiment records which claims are proven by local evidence from v0 or
  Issue 2, and which still require proof experiments.
- The Issue 4 protocol matrix is updated with evidence-backed support/library
  statuses.
- The result recommends the next proof experiment.
- `dprint fmt` succeeds on the issue files.
- `git diff --check` passes.

Fail criteria:

- The experiment treats `timg` success as proof of TermPlot's own encoder.
- The experiment claims Node.js or Rust support without identifying a library,
  specification path, or explicit unknown.
- The experiment relies on stale memory for current terminal or library support.
- The matrix remains too vague to choose the next proof experiment.

## Design Review

Reviewer: Hume (`019ecb42-20c1-73a1-823d-f7c998824b81`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 1 with status `Designed`, the experiment contains the required
sections, the documentation-only scope is narrow enough for one experiment,
verification has concrete pass/fail criteria and required hygiene checks, and
there is no evidence implementation started before the plan commit.

## Result

**Result:** Pass

This experiment researched protocol support and candidate implementation paths.
It did not implement or prove any TermPlot-owned Node.js or Rust encoder.

### Terminal Support Findings

Ghostty:

- Ghostty's official feature page lists the Kitty graphics protocol as a
  supported terminal developer feature and says it allows terminal applications
  to render images directly in the terminal:
  <https://ghostty.org/docs/features>.
- Ghostty's official feature page does not list iTerm2 OSC 1337 inline images or
  SIXEL as supported image protocols. A Ghostty issue requesting OSC 1337
  support was opened on 2026-06-14 and closed as not planned:
  <https://github.com/ghostty-org/ghostty/issues/13011>.
- Issue 2 proved that Ghostty can display a Kitty image through `timg -p kitty`
  and that the screenshot harness can assert pixels, but that is only an oracle
  and harness proof. It does not prove a Node.js or Rust encoder owned by
  TermPlot.
- ANSI/Unicode block output is expected because it is normal terminal text, but
  true rendering quality and pixel assertions still need proof.

iTerm2:

- iTerm2's Inline Images Protocol documentation defines the OSC 1337 `File=`
  path, base64 payload, inline display option, sizing options, and multipart
  file transfer for tmux-sized chunks:
  <https://iterm2.com/documentation-images.html>.
- iTerm2's feature-reporting spec defines `FILE` as support for OSC 1337 `File`,
  and defines `SIXEL` as support for SIXEL images:
  <https://iterm2.com/feature-reporting/>.
- iTerm2's current image docs do not document Kitty graphics protocol support. A
  long-standing GitLab feature suggestion asks iTerm2 to add Kitty graphics
  support: <https://gitlab.com/gnachman/iterm2/-/issues/7825>. A third-party
  detector currently claims iTerm2 v3.6+ supports Kitty, but that needs direct
  proof before TermPlot relies on it.
- ANSI/Unicode block output is expected because it is normal terminal text, but
  quality and sizing still need proof.

### Protocol Specification Findings

- Kitty graphics protocol is specified as a raster graphics protocol for
  terminal clients, with placement, alpha blending, scrolling integration, local
  optimizations, multiplexing notes, and support-detection guidance:
  <https://sw.kovidgoyal.net/kitty/graphics-protocol/>.
- iTerm2 inline images are simpler for one-shot display: OSC 1337 `File=`,
  optional arguments, a base64 payload, and BEL or ST terminator. Multipart
  transfer exists for tmux integration and chunk limits:
  <https://iterm2.com/documentation-images.html>.
- SIXEL is a real candidate only where terminal support exists. Its practical
  cost is image quantization/encoding and legacy protocol behavior, so a library
  path is preferred over a fresh in-repo encoder unless a proof experiment shows
  a clear reason.
- ANSI/Unicode block fallback is not an image protocol. It is a display fallback
  using colored text cells, likely half-blocks, and should be judged on visual
  fidelity and layout stability rather than protocol support.

### Node.js Library Findings

- `terminal-image` v4.3.0 is current as of 2026-04-12 and advertises automatic
  protocol selection: Kitty, iTerm2 inline images, then ANSI block fallback. It
  returns terminal escape text from PNG/JPEG/GIF buffers or files:
  <https://github.com/sindresorhus/terminal-image>.
- `supports-terminal-graphics` v0.1.0 is current as of 2026-01-04 and detects
  Kitty, iTerm2, and SIXEL. It is useful for detection, not rendering:
  <https://github.com/sindresorhus/supports-terminal-graphics>.
- `ansi-escapes` v7.3.0 is current as of 2026-02-04 and still exposes
  `image(filePath, options?)`, documented as image display with iTerm-style
  sizing options: <https://github.com/sindresorhus/ansi-escapes>.
- v0 local evidence used `ansi-escapes.image(...)` at `v0/cli/cli-entry.ts:51`
  and `v0/cli/display-image.ts:23`. The v0 README says the prototype only
  supported the iTerm image protocol and worked in iTerm2 and WezTerm at
  `v0/README.md:87`.
- `term-kitty-img` exists for Kitty from Node.js, but its latest release is from
  2022 and its README says the Kitty protocol is awkward from Node and relies on
  spawning with inherited stdin. Treat it as a research reference, not a
  first-choice dependency: <https://github.com/tmgldn/term-kitty-img>.
- `sixel` v0.16.0 exists for SIXEL encoding/decoding in Node.js/browser, but it
  is older and does not by itself solve terminal detection, sizing, or cursor
  management: <https://github.com/jerch/node-sixel>.

Node.js conclusion: Node.js appears viable for iTerm2 OSC 1337 and ANSI
fallback, and possibly viable for Kitty through `terminal-image` or a direct
spec encoder. Node.js SIXEL is plausible but weaker and should be tested only if
iTerm2/Ghostty support requirements justify it.

### Rust Library Findings

- `ratatui-image` v11.0.4 supports image widgets across SIXEL, Kitty, iTerm2,
  and half-block fallback; it also addresses terminal protocol detection and
  font-size/cell-size mapping:
  <https://docs.rs/ratatui-image/latest/ratatui_image/>.
- `viuer` v0.11.0 displays images in terminals. Its default path is half-blocks,
  with custom protocol support for Kitty, iTerm, and SIXEL behind a feature:
  <https://docs.rs/crate/viuer/latest>.
- `rasteroid` v0.3.2 advertises terminal image/video graphics across iTerm,
  Kitty, and SIXEL: <https://crates.io/crates/rasteroid>.
- `kitty-graphics-protocol` v0.1.3 and `kitty_image` are Rust libraries for
  Kitty protocol output: <https://crates.io/crates/kitty-graphics-protocol> and
  <https://docs.rs/kitty_image/latest/kitty_image/>.
- `iterm2img` exists for the iTerm2 Inline Images Protocol but appears small and
  old, with one tag and minimal activity:
  <https://github.com/lusingander/iterm2img>.
- `icy_sixel` v0.5.0 is a 100% Rust SIXEL encoder/decoder with color
  quantization: <https://crates.io/crates/icy_sixel>.
- `sixel-bytes` shows a libsixel FFI option, but its README marks it abandoned
  and points to alternatives such as `a-sixel` and `icy_sixel`:
  <https://github.com/benjajaja/sixel-bytes>.

Rust conclusion: Rust has stronger direct protocol coverage than Node.js, with
multiple multi-protocol and protocol-specific options. The main risk is not
library existence; it is whether a selected crate can be used cleanly in a
non-TUI CLI display client with deterministic sizing and cleanup.

### Risk Notes

- Terminal support detection cannot be trusted solely from environment
  variables. The matrix needs proof in real Ghostty and iTerm2 windows.
- Kitty chunking, image IDs, placement, deletion, cursor advancement, and
  terminal state are higher-risk than OSC 1337 for a simple plot display path.
- OSC 1337 is simpler for iTerm2, but Ghostty currently points away from it.
- SIXEL adds encoding complexity and palette/quality tradeoffs. It should not
  distract from Ghostty Kitty and iTerm2 OSC 1337 unless iTerm2 proof shows it
  gives a meaningful advantage.
- Multiplexers matter. iTerm2 documents multipart OSC 1337 for tmux chunk
  limits, and Kitty has explicit multiplexer guidance. Initial proofs should
  avoid tmux, then later decide whether multiplexer support belongs in v1.
- `timg` remains useful as a benchmark/oracle because v0 notes observed that
  `timg` handled stacking/cursor advancement better than TermPlot's prototype
  image output. It must not be mistaken for TermPlot's implementation.

### Verification

- Updated the Issue 4 protocol matrix with researched support/library statuses
  and left Node/Rust proof columns as `Pending`.
- Confirmed v0's implementation path with local source references:
  `v0/cli/cli-entry.ts:51`, `v0/cli/display-image.ts:23`, and `v0/README.md:87`.
- Checked current package metadata with `npm view`:
  - `terminal-image` 4.3.0, modified 2026-04-12;
  - `supports-terminal-graphics` 0.1.0, modified 2026-01-04;
  - `ansi-escapes` 7.3.0, modified 2026-02-04;
  - `term-kitty-img` 1.0.4, modified 2022-04-21;
  - `sixel` 0.16.0, modified 2022-05-18.
- Checked current Rust package search results with `cargo search`:
  - `ratatui-image` 11.0.4;
  - `viuer` 0.11.0;
  - `rasteroid` 0.3.2;
  - `kitty-graphics-protocol` 0.1.3;
  - `icy_sixel` 0.5.0;
  - `iterm2img` 0.1.0.
- `dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/01-research-terminal-protocol-support-and-libraries.md`
  passed and formatted both files.
- `git diff --check` passed.

## Conclusion

The next proof experiment should target Node.js Kitty output in Ghostty. Ghostty
is the user's primary terminal, Ghostty's official image protocol is Kitty, and
Issue 2 already provides a Ghostty screenshot/pixel harness that can be adapted.
This is the highest-risk assumption for keeping the display client in
TypeScript/Node. The proof should use either `terminal-image` or a minimal
direct Kitty encoder, render a deterministic PNG in Ghostty without `-e`,
capture a screenshot, assert pixels, and prove cleanup of only probe-owned
processes.

## Completion Review

Reviewer: Raman (`019ecb4b-3f5a-7692-b97e-1f8160c32194`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the completed experiment matches
the approved documentation-only scope, has `Result` and `Conclusion`, updates
the Issue 4 README status to `Pass`, records later-work learnings in the matrix,
records passing formatting and diff checks, preserves `Pending` proof columns
for unproven Node/Rust renderers, and had not been committed before the review.

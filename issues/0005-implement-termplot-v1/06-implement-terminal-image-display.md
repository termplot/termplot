# Experiment 6: Implement terminal image display

## Description

Implement Stage 6: display the PNG produced by the Stage 5 render workflow in
supported terminals by emitting TermPlot-owned terminal image escape codes.

Issue 4 chose the TypeScript/Node client/display layer and proved direct Node.js
encoders for the macOS v1 target terminals:

- Ghostty: Kitty graphics protocol.
- iTerm2: OSC 1337 `File=` inline images.
- iTerm2 compatibility: SIXEL, proven but not the default because full-color
  Plotly screenshots require quantization or a maintained encoder.

This experiment should turn the current `TERMINAL_DISPLAY_DEFERRED` path into
working terminal output for the primary Ghostty and iTerm2 paths. Full terminal
window screenshot/pixel assertions remain Stage 7; this stage should prove the
CLI emits the correct protocol bytes with unit and CLI-level byte-attribution
tests.

## Changes

- Add display encoder modules under `src/display/`.
  - Add a Kitty encoder that emits PNG payload bytes through Kitty graphics APC
    chunks suitable for Ghostty.
  - Add an iTerm2 OSC 1337 encoder that emits the PNG bytes as an inline `File=`
    image.
  - Add protocol attribution helpers or tests that prove Kitty output contains
    Kitty APC framing and does not contain OSC 1337 `File=`, and iTerm2 output
    contains OSC 1337 `File=` and does not contain Kitty APC framing.
- Add conservative terminal/protocol selection.
  - Preserve explicit `--protocol kitty` and `--protocol iterm2`.
  - Keep `--protocol auto` and select Kitty for Ghostty, OSC 1337 for iTerm2.
  - Report unsupported terminals clearly when no explicit protocol is given and
    auto-detection cannot identify Ghostty or iTerm2.
  - Keep `--protocol sixel` accepted by the parser but return a clear
    `PROTOCOL_NOT_IMPLEMENTED` or equivalent structured error unless the
    experiment intentionally implements a production SIXEL path.
- Extend `termplot render`.
  - Keep Stage 5 `--output <file>` PNG behavior unchanged.
  - When `--output` is absent, render through `termplotd`, encode the returned
    PNG with the selected protocol, write the binary escape output to stdout,
    and write structured metadata to stderr or another non-binary channel if
    needed for diagnostics.
  - Do not include `pngBase64` in user-facing structured metadata.
  - Do not shell out to `timg`, `imgcat`, `kitty +kitten icat`, `ansi-escapes`,
    or the Issue 4 proof fixtures.
- Add tests.
  - Unit-test the Kitty encoder against exact protocol attribution and chunking
    behavior.
  - Unit-test the OSC 1337 encoder against exact protocol attribution and inline
    PNG metadata.
  - CLI-test explicit `--protocol kitty` terminal output using a private daemon
    socket, asserting stdout contains Kitty APC bytes and rejects OSC 1337
    bytes.
  - CLI-test explicit `--protocol iterm2` terminal output using a private daemon
    socket, asserting stdout contains OSC 1337 `File=` bytes and rejects Kitty
    APC bytes.
  - CLI-test `--protocol auto` with controlled environment variables for Ghostty
    and iTerm2 detection, without depending on the developer's active terminal.
  - CLI-test unsupported auto-detection and explicit `--protocol sixel`
    structured errors.
  - Keep Stage 5 PNG output tests passing unchanged.
- Update Issue 5 Stage 6 status and Experiment 6 result after verification.
- Record Stage 7 handoff learnings in `## Result` / `## Conclusion`.
  - Confirmed protocol behavior.
  - Terminal auto-detection rules.
  - SIXEL deferral or implementation decision.
  - Known limitations before full-stack screenshot verification.

## Verification

Pass criteria:

- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- Tests prove `termplot render --protocol kitty` writes Kitty APC bytes to
  stdout, not JSON metadata and not OSC 1337 bytes.
- Tests prove `termplot render --protocol iterm2` writes OSC 1337 `File=` bytes
  to stdout, not JSON metadata and not Kitty APC bytes.
- Tests prove `--protocol auto` selects Kitty for a controlled Ghostty
  environment and OSC 1337 for a controlled iTerm2 environment.
- Tests prove unsupported auto-detection returns a structured error without
  rendering raw escape bytes.
- Tests prove explicit `--protocol sixel` returns a clear structured error
  unless a production SIXEL path is implemented in this experiment.
- Stage 5 `--output <file>` tests still prove PNG files are written and metadata
  remains structured JSON without full base64 PNG data.
- The implementation does not invoke external renderers such as `timg`,
  `imgcat`, `kitty +kitten icat`, `ansi-escapes`, or the Issue 4 proof fixtures.
- `dprint fmt` succeeds on changed issue files.
- `git add -N <new implementation/test files> && git diff --check` passes, or
  `git diff --check` runs after staging the result so new files are included.

Partial criteria:

- One primary protocol works, but the other needs a follow-up before Stage 7
  full-stack terminal verification can start.
- Explicit protocol output works, but auto-detection needs follow-up.

Fail criteria:

- The CLI still returns `TERMINAL_DISPLAY_DEFERRED` for primary protocols.
- Terminal output is only implemented by shelling out to an external renderer or
  proof fixture.
- The CLI emits the wrong protocol for a requested terminal.
- Terminal escape output is mixed with JSON metadata on stdout.

## Design Review

Reviewer: Ampere (`019ecbd5-d261-74b1-9369-ff24e7c51e6a`), fresh-context Codex
design reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: the plan did not explicitly require recording Stage 7 handoff
  learnings: confirmed protocol behavior, terminal auto-detection rules, SIXEL
  deferral or implementation decision, and limitations.

Fixes:

- Added a Changes bullet requiring the experiment result and conclusion to
  record the Stage 7 handoff learnings.

Approval: approved. The reviewer confirmed that Issue 5 links Experiment 6 as
`Designed`, the experiment has the required sections, the scope is limited to
Stage 6 while leaving screenshot/pixel assertions to Stage 7, implementation had
not started before the plan commit, verification has concrete pass/fail criteria
and repo hygiene checks, and the protocol strategy matches Issue 4: Ghostty
Kitty first, iTerm2 OSC 1337 second, SIXEL only as a compatibility path, and no
external renderer in production.

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

## Result

**Result:** Pass

Implemented terminal image display for the two primary macOS v1 protocols:

- `--protocol kitty` emits Kitty graphics APC chunks containing the PNG payload.
- `--protocol iterm2` emits iTerm2 OSC 1337 `File=` inline image output
  containing the PNG payload.
- `--protocol auto` selects Kitty for controlled Ghostty environments and OSC
  1337 for controlled iTerm2 environments.
- `--protocol sixel` remains accepted by the parser but returns
  `PROTOCOL_NOT_IMPLEMENTED`; SIXEL stays an iTerm2 compatibility path until a
  production full-color encoder or quantization decision is made.

`termplot render --output <file>` keeps the Stage 5 behavior: it writes PNG
bytes to the requested file and prints structured JSON metadata without
`pngBase64`. When `--output` is absent, `termplot render` now renders through
`termplotd`, encodes the returned PNG, and writes only terminal image bytes to
stdout. Terminal-display metadata is not mixed into stdout.

Changed files:

- `src/display/protocols.ts`: added direct Kitty PNG and OSC 1337 PNG encoders,
  conservative terminal auto-detection, and structured display errors.
- `src/bin/termplot.ts`: connected render output to protocol selection and
  terminal image encoding while preserving `--output` PNG behavior.
- `tests/display-protocols.test.ts`: added unit tests for encoder protocol
  attribution and auto-detection behavior.
- `tests/cli-render.test.ts`: added CLI tests for explicit Kitty, explicit
  iTerm2, controlled auto-detection for Ghostty/iTerm2, unsupported auto
  detection, SIXEL deferral, and invalid protocol errors.

Verification run:

```text
pnpm run build
```

Passed.

```text
pnpm test
```

Passed: 23 tests, 23 pass.

```text
rg --fixed-strings 'timg' src tests || true
rg --fixed-strings 'imgcat' src tests || true
rg --fixed-strings 'kitty +kitten' src tests || true
rg --fixed-strings 'ansi-escapes' src tests || true
```

Passed with no matches.

```text
git add -N src/display/protocols.ts tests/display-protocols.test.ts && git diff --check
```

Passed.

```text
pnpm exec dprint fmt issues/0005-implement-termplot-v1/README.md issues/0005-implement-termplot-v1/06-implement-terminal-image-display.md
```

Passed.

`pnpm exec dprint fmt src/bin/termplot.ts src/display/protocols.ts tests/display-protocols.test.ts tests/cli-render.test.ts`
reported no matching files for the current dprint plugin configuration, so no
source/test formatting changes were available through dprint. TypeScript
compilation and the full Node test suite passed.

## Conclusion

Stage 6 confirms that TermPlot's Node client can emit the production primary
terminal image protocols directly from the PNG generated by `termplotd`.

Stage 7 handoff notes:

- Confirmed protocol behavior:
  - Kitty output contains `ESC_G` APC chunks and rejects OSC 1337 bytes.
  - iTerm2 output contains OSC 1337 `File=` bytes and rejects Kitty APC bytes.
- Auto-detection rules:
  - Ghostty is detected by `TERM_PROGRAM=ghostty`, `TERM_PROGRAM=Ghostty`, or
    `GHOSTTY_RESOURCES_DIR`.
  - iTerm2 is detected by `TERM_PROGRAM=iTerm.app`, `TERM_PROGRAM=iTerm2`, or
    `ITERM_SESSION_ID`.
  - Unknown terminals return `UNSUPPORTED_TERMINAL` unless the user chooses an
    explicit protocol.
- SIXEL decision:
  - SIXEL is still deferred for production display because full-color Plotly
    screenshots need quantization or a maintained encoder decision.
- Known limitations:
  - This stage verifies emitted bytes and CLI behavior, not real terminal
    screenshots.
  - Stage 7 must reuse the Issue 2/Issue 4 terminal harnesses to prove actual
    Ghostty and iTerm2 rendering and pixel assertions with TermPlot output.

## Completion Review

Reviewer: Kuhn (`019ecbda-7064-7891-a996-a19afea9417f`), fresh-context Codex
completion reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the implementation matches the
Stage 6 scope, direct in-repo Kitty and iTerm2 encoders are implemented,
terminal display writes only encoded bytes to stdout when `--output` is absent,
JSON metadata remains limited to PNG file output, `pnpm run build` passed,
`pnpm test` passed with 23 tests, `git diff --check` passed, prohibited external
renderer searches in `src` and `tests` found no matches, the result commit had
not been made before review, the experiment has `## Result` and `## Conclusion`,
the Issue README marks Experiment 6 as `Pass`, and Stage 7 handoff notes are
recorded.

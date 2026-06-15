# Experiment 5: Implement CLI render workflow

## Description

Implement Stage 5: the user-facing `termplot` render workflow up to PNG output.
The CLI should accept Plotly JSON from an argument, file, or stdin, validate the
minimal v1 config shape and dimensions, auto-start or connect to `termplotd`,
register the plot, render it through the Stage 4 browser renderer, and write PNG
bytes to a file when `--output <file>` is provided.

Terminal image display remains Stage 6. This experiment may accept explicit
protocol-selection flags so the CLI shape is ready for Stage 6, but it must not
emit Kitty, OSC 1337, SIXEL, or terminal image escape codes yet.

## Changes

- Extend `termplot` CLI parsing.
  - Support `termplot render <json>`.
  - Support `termplot render --file <path>`.
  - Support `termplot render` with JSON from stdin.
  - Support `--output <file>` to write PNG bytes.
  - Support `--protocol <auto|kitty|iterm2|sixel>` as a parsed option that is
    accepted but rejected for terminal display until Stage 6 when no `--output`
    is provided.
- Add minimal v1 config validation.
  - Require JSON object input.
  - Validate `layout.width` and `layout.height` when present.
  - Preserve Stage 3's deferral of full Plotly schema validation unless Stage 5
    intentionally adds a small `data` array check.
- Use daemon auto-start/connect.
  - Reuse Stage 2 `startOrProbe`.
  - Support explicit `--socket`, `--ttl-ms`, `--log`, and `--timeout-ms` test
    options.
  - Ensure tests use private temp sockets and logs.
- Wire render workflow.
  - Register the config through Stage 3 `render`.
  - Render PNG through Stage 4 `renderPng`.
  - Decode base64 PNG and write it to `--output`.
  - Print structured JSON metadata to stdout without embedding the full PNG.
- Add tests.
  - JSON argument input.
  - `--file` input.
  - stdin input.
  - invalid JSON and invalid dimensions.
  - daemon auto-start and reuse across two renders.
  - PNG output file signature/dimensions.
  - clear error when terminal display is requested before Stage 6.
- Update Issue 5 Stage 5 status and Experiment 5 result after verification.

## Verification

Pass criteria:

- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- Tests prove JSON argument, file, and stdin input all render to PNG files.
- Tests prove `termplot render --output <file>` auto-starts the daemon on a
  private socket when needed and reuses it for a second render.
- Tests prove PNG output files have a valid PNG signature and expected
  dimensions.
- Tests prove stdout returns structured metadata with plot ID, dimensions,
  content type, daemon PID, and timing metadata, but not full base64 PNG data.
- Tests prove invalid JSON and invalid dimensions return structured errors and
  do not write output files.
- Tests prove terminal display without `--output` fails clearly until Stage 6.
- Existing Stage 2, Stage 3, and Stage 4 tests still pass.
- `dprint fmt` succeeds on changed JSON and issue files.
- `git add -N <new implementation/test files> && git diff --check` passes, or
  `git diff --check` runs after staging the result so new files are included.

Partial criteria:

- PNG output works, but stdin/file support or protocol flag handling needs a
  follow-up experiment before Stage 6.

Fail criteria:

- The CLI emits terminal image escape codes in this stage.
- The CLI requires a daemon to already be running for normal PNG output.
- Tests use or affect a real user daemon instead of private temp sockets.
- PNG files are written for failed validation.

## Design Review

Reviewer: Zeno (`019ecbc8-ee37-7511-98fa-af69eb065484`), fresh-context Codex
design reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that Issue 5 links Experiment 5 as
`Designed`, the experiment has the required sections, the scope stays on the
Stage 5 PNG-output workflow while deferring terminal escape emission to Stage 6,
verification covers concrete pass/fail criteria and repo hygiene, private socket
use is covered, input sources, PNG output, auto-start/reuse, validation,
structured metadata/errors, and the no-terminal-display boundary are covered,
and implementation had not started before the plan commit.

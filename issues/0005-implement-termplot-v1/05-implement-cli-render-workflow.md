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

## Result

**Result:** Pass

Implemented `termplot render` as the Stage 5 PNG-output workflow. The command
now accepts Plotly JSON from one positional argument, `--file`, or stdin,
validates the config object and positive numeric `layout.width` /
`layout.height`, auto-starts or reuses `termplotd`, registers the plot, renders
PNG bytes through the Stage 4 browser renderer, writes `--output`, and prints
structured metadata without embedding `pngBase64`.

Terminal image display remains deferred. `--protocol <auto|kitty|iterm2|sixel>`
is parsed and reported in metadata for output renders, but invoking
`termplot render` without `--output` returns the structured
`TERMINAL_DISPLAY_DEFERRED` error instead of emitting Kitty, OSC 1337, SIXEL, or
other terminal escape codes.

The previous registry-only `termplot render --json` behavior moved to
`termplot plots register --json` so Stage 3/4 diagnostic tests can continue to
exercise raw registry and renderer operations without conflicting with the
user-facing render workflow.

Changed files:

- `src/bin/termplot.ts`: added render input handling, protocol parsing, minimal
  validation, daemon auto-start/reuse, PNG output writing, structured metadata,
  and `plots register`.
- `tests/cli-render.test.ts`: added Stage 5 CLI workflow coverage for positional
  JSON, `--file`, stdin, daemon auto-start/reuse, PNG signature/dimensions,
  validation errors, and the Stage 6 terminal-display deferral.
- `tests/plot-registry.test.ts`: moved registry setup calls to `plots register`.
- `tests/browser-renderer.test.ts`: moved renderer setup calls to
  `plots register`.

Verification run:

```text
pnpm run build
```

Passed.

```text
pnpm test
```

Passed: 17 tests, 17 pass.

```text
git add -N tests/cli-render.test.ts && git diff --check
```

Passed.

```text
pnpm exec dprint fmt issues/0005-implement-termplot-v1/README.md issues/0005-implement-termplot-v1/05-implement-cli-render-workflow.md
```

Passed.

`pnpm exec dprint fmt src/bin/termplot.ts tests/plot-registry.test.ts tests/browser-renderer.test.ts tests/cli-render.test.ts`
reported no matching files for the current dprint plugin configuration, so no
source/test formatting changes were available through dprint. TypeScript
compilation and the full Node test suite passed.

## Completion Review

Reviewer: Lorentz (`019ecbd1-41a8-7ff1-ac13-5262156bd076`), fresh-context Codex
completion reviewer.

Findings:

- Blocker: none.
- Major: CLI tests did not explicitly assert the stdout metadata fields claimed
  by the experiment: width, height, daemon PID, and timing metadata.
- Minor: formatter evidence recorded the source/test dprint invocation but not
  the changed Markdown issue files.

Fixes:

- Added explicit assertions for render metadata width, height, daemon PID,
  daemon/register timing fields, and browser render timing fields in
  `tests/cli-render.test.ts`.
- Ran and recorded `pnpm exec dprint fmt` for the changed Issue 5 Markdown
  files.

Reviewer approval: approved with no blockers. Re-review requested for the
recorded fixes before the result commit.

Re-review approval: approved. Lorentz confirmed the prior metadata-assertion and
Markdown-formatting findings are resolved, no new blocker was introduced,
`git diff --check` passes, and the result commit had not been made before
re-review approval.

## Conclusion

Stage 5 gives TermPlot a real user-facing PNG render command while preserving
the daemon, registry, and warm browser renderer boundaries established in Stages
2 through 4. The next experiment should implement Stage 6 terminal image display
by taking the PNG produced by this workflow and emitting the selected protocol
encoder output for Ghostty and iTerm2.

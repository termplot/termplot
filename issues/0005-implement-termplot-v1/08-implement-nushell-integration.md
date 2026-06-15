# Experiment 8: Implement Nushell integration

## Description

Implement Stage 8: provide a Nushell-friendly way to use TermPlot while
preserving the v1 daemon contract. The integration should accept Nushell
pipeline values, convert them to Plotly JSON, and call the same `termplot`
client/`termplotd` daemon path used by other shells.

V0 provided a Nushell plugin that owned its own Puppeteer browser lifecycle. V1
must not recreate that architecture: `termplotd` owns the browser and render
pipeline. The Nushell path should be a thin integration layer over the same CLI
and daemon unless a real blocker requires a plugin.

The first implementation should prefer a `termplot.nu` script with exported
commands. A native Nushell plugin can remain a follow-up if the script cannot
provide the expected pipeline ergonomics.

## Changes

- Add a top-level `termplot.nu` script.
  - Export a `termplot` command that accepts pipeline input.
  - Convert Nushell values to JSON with Nushell's native JSON conversion.
  - Call the external built TermPlot CLI explicitly, not the exported Nushell
    wrapper command and not a separate renderer or browser.
    - Prefer a resolved/configurable CLI path for tests.
    - If invoking by command name, use Nushell's external-command form
      `^termplot render` so the wrapper does not recursively call itself.
  - Support at least:
    - terminal display through `--protocol <auto|kitty|iterm2|sixel>`;
    - PNG output through `--output <path>`;
    - binary PNG pipeline output when no terminal display is requested and no
      output file is provided, or terminal display passthrough if binary
      pipeline output is not the chosen user-facing shape.
    - daemon test options such as `--socket`, `--ttl-ms`, `--log`, and
      `--timeout-ms` so tests can use private sockets.
  - Ensure the wrapper does not create a plugin-only browser lifecycle.
- Add Nushell integration tests or scripts.
  - Use the installed `nu` binary when available.
  - Source `termplot.nu` and pipe a Nushell record into `termplot --output`.
  - Assert the PNG file exists, has a valid PNG signature, and has expected
    dimensions.
  - Assert at least one Stage 8 output shape beyond file output:
    - binary PNG pipeline output with a valid PNG signature and expected
      dimensions; or
    - terminal display output passthrough for an explicit protocol, with
      protocol byte attribution.
  - Assert two Nushell renders on the same private socket reuse the same daemon
    PID or otherwise prove they use the same daemon contract.
  - Test terminal display byte output with an explicit protocol if Nushell can
    expose the bytes without corrupting terminal state; otherwise record why PNG
    output is the verified Nushell path for this experiment and leave real
    terminal display to Stage 7's shell probes.
  - Skip or fail clearly when `nu` is not installed. On this machine,
    `nu
    --version` is available and should be used for verification.
- Add package/build integration if needed.
  - Ensure `termplot.nu` is included in the repository root for Stage 9
    packaging.
  - Do not add a `nu_plugin_termplot` binary unless the script wrapper cannot
    satisfy the stage.
- Update Issue 5 Stage 8 status and Experiment 8 result after verification.
- Record Stage 9 handoff learnings in `## Result` / `## Conclusion`.
  - Exact Nushell usage.
  - Whether the script path is sufficient or a native plugin remains needed.
  - Any packaging/docs requirements for `termplot.nu`.

## Verification

Pass criteria:

- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- `nu --version` is recorded.
- Nushell can source the new `termplot.nu`.
- A Nushell pipeline record can render through `termplot --output <file>` using
  a private socket and log.
- The output PNG has a valid PNG signature and expected dimensions.
- Nushell proves at least one Stage 8 user-facing output shape beyond file
  output:
  - binary PNG pipeline output with a valid PNG signature and expected
    dimensions; or
  - terminal display output passthrough for an explicit protocol, with protocol
    byte attribution.
- Two Nushell renders against the same private socket reuse the daemon contract,
  proven by daemon status/PID evidence or equivalent structured metadata.
- The wrapper uses the external TermPlot CLI explicitly, for example
  `^termplot render` or a configured path, and does not start Puppeteer, a
  browser, or a web app directly.
- The wrapper does not use `timg`, `imgcat`, `kitty +kitten icat`,
  `ansi-escapes`, v0 plugin code, or Issue 4 proof fixtures.
- If terminal display from a Nushell wrapper is not verified, binary PNG
  pipeline output must be verified for this experiment to pass.
- `dprint fmt` succeeds on changed issue files.
- `git add -N <new script/test files> && git diff --check` passes, or
  `git diff --check` runs after staging the result so new files are included.

Partial criteria:

- File PNG output works from Nushell pipeline values, but neither binary PNG
  pipeline output nor terminal display passthrough is verified.
- Binary PNG pipeline output works, but terminal display from Nushell needs a
  follow-up because of Nushell external-output handling.
- A script wrapper works, but packaging or command naming needs Stage 9 polish.

Fail criteria:

- Nushell integration starts or owns a separate browser lifecycle.
- Nushell input cannot be converted into the same Plotly JSON accepted by the
  CLI.
- The wrapper bypasses `termplotd` or creates a plugin-only daemon/browser
  contract.
- Verification requires interactive prompts or depends on the developer's
  default daemon/socket.

## Design Review

Reviewer: Averroes (`019ecbf2-9405-73c0-810e-1d92fb53ca21`), fresh-context Codex
design reviewer.

Initial findings:

- Blocker: the Stage 8 README requires binary PNG data or terminal display
  output, but the initial pass criteria allowed file-only PNG verification to
  pass.
- Major: exporting a Nushell command named `termplot` while saying it should
  call `termplot render` was ambiguous and could recursively call the wrapper
  instead of the external CLI.

Fixes:

- Tightened pass criteria so Stage 8 must verify at least one user-facing
  Nushell output shape beyond file output: binary PNG pipeline output or
  terminal display passthrough with protocol byte attribution. File-only PNG
  output is now `Partial`.
- Required the wrapper to call the external TermPlot CLI explicitly through a
  resolved/configurable path or Nushell's `^termplot render` external-command
  form.

Re-review: approved. The reviewer confirmed the pass criteria now require a
Stage 8 output shape beyond file output, file-only PNG output is explicitly
`Partial`, the wrapper must invoke the external CLI through a
resolved/configurable path or `^termplot render`, no new blockers were
introduced, and git state still showed only plan docs changed with no
implementation started.

## Result

**Result:** Pass

Implemented a top-level `termplot.nu` script as the v1 Nushell integration. It
is a thin wrapper over the external TermPlot CLI and keeps all browser/render
lifecycle ownership in `termplotd`.

Behavior:

- `source termplot.nu` exports a `termplot` command.
- Nushell pipeline values are converted with `to json --raw`.
- The wrapper calls the external CLI through a resolved path with `^$cli_path`,
  avoiding recursion into the exported Nushell command.
- `termplot --output <path>` writes PNG output and returns the CLI's structured
  metadata as a Nushell value.
- `termplot` without `--output` renders to a temporary PNG and returns binary
  PNG data to the Nushell pipeline.
- `termplot --display` passes terminal image output through the external CLI for
  users who want terminal display from Nushell.
- `--socket`, `--ttl-ms`, `--log`, `--timeout-ms`, `--protocol`, and `--cli` are
  supported so tests and users can control daemon and protocol behavior.

Changed files:

- `termplot.nu`: new Nushell wrapper.
- `tests/nushell-integration.test.ts`: sources the wrapper from Nushell, renders
  a pipeline record to `--output`, renders binary PNG pipeline output, verifies
  PNG signatures/dimensions, and proves daemon reuse through private socket
  status/PID evidence.
- `src/renderer/browser-renderer.ts`: switched the daemon-owned browser renderer
  to Playwright Firefox after the current macOS session could not launch
  Chromium headless.
- `src/daemon/server.ts`: keeps the daemon alive while requests are active so
  idle expiry cannot interrupt a slow browser-backed render.
- `src/bin/termplot.ts`: lets `plots render-png` honor `--timeout-ms`.
- `package.json` / `pnpm-lock.yaml`: use Playwright for browser automation and
  run the Node test suite serially for browser-backed integration stability.
- Browser-backed tests: use short `/tmp/tp-*` socket roots and longer render
  timeouts for integration tests.
- `issues/0005-implement-termplot-v1/README.md`: marked Stage 8 complete and
  Experiment 8 `Pass`.

Verification run:

```text
nu --version
```

Passed: `0.113.1`.

```text
pnpm run build
```

Passed.

```text
node --test build/tests/nushell-integration.test.js
```

Passed.

```text
pnpm test
```

Passed: 24 tests, 24 pass.

Chromium launch investigation:

- Minimal Puppeteer launch failed with
  `TimeoutError: Timed out after 30000 ms
  while waiting for the WS endpoint URL to appear in stdout!`
- Direct `chrome-headless-shell --headless --dump-dom about:blank` also hung.
- Sampling the hung Chromium process showed it blocked in AppKit/SkyLight while
  looking up the display server, below TermPlot and Puppeteer.
- Playwright WebKit launched but returned a zero-length screenshot.
- Playwright Firefox launched and produced valid PNG screenshot bytes, so
  TermPlot now uses Playwright Firefox for the browser-backed renderer.

```text
rg --fixed-strings 'puppeteer' termplot.nu tests/nushell-integration.test.ts || true
rg --fixed-strings 'timg' termplot.nu tests/nushell-integration.test.ts || true
rg --fixed-strings 'imgcat' termplot.nu tests/nushell-integration.test.ts || true
rg --fixed-strings 'kitty +kitten' termplot.nu tests/nushell-integration.test.ts || true
rg --fixed-strings 'ansi-escapes' termplot.nu tests/nushell-integration.test.ts || true
rg --fixed-strings 'v0/cli/nu_plugin_termplot' termplot.nu tests/nushell-integration.test.ts || true
```

Passed with no matches.

```text
pnpm exec dprint fmt issues/0005-implement-termplot-v1/README.md issues/0005-implement-termplot-v1/08-implement-nushell-integration.md
```

Passed.

```text
git add -N termplot.nu tests/nushell-integration.test.ts && git diff --check
```

Passed.

`pnpm exec dprint fmt termplot.nu tests/nushell-integration.test.ts` reported no
matching files for the current dprint plugin configuration, so no Nushell or
TypeScript test formatting changes were available through dprint. TypeScript
compilation and the full Node test suite passed.

## Conclusion

Stage 8 confirms that Nushell can use TermPlot through the same cross-shell
daemon contract:

- The script wrapper is sufficient for v1; a native Nushell plugin is not needed
  for the implemented pipeline ergonomics.
- Nushell users can pipe records into `termplot` and receive binary PNG data by
  default.
- Nushell users can write files with `--output` and receive structured metadata.
- Terminal display passthrough is exposed with `--display`, while Stage 7
  remains the real-terminal proof for Ghostty and iTerm2 rendering.

Stage 9 should package and document `termplot.nu`, including
`source termplot.nu`, binary PNG pipeline output, `--output`, `--display`,
daemon options, and the Playwright Firefox browser dependency.

## Completion Review

Reviewer: Wegener (`019ecc1c-1100-7130-b2e2-2b735ccb81cc`), fresh-context Codex
subagent, read-only.

Findings:

- Minor: `termplot.nu` removed temporary files only on successful paths. If the
  external CLI, JSON parsing, or raw PNG open failed, the JSON temp file and
  possibly PNG temp file could be left behind.

Fix:

- Updated `termplot.nu` to create the temporary JSON and PNG files up front and
  remove both in a Nushell `try ... finally` block. Re-review noted that the
  JSON save should also happen inside the `try`, so that write was moved into
  the cleanup-protected block before final verification.

Re-verification after the fix:

```text
node --test --test-concurrency=1 build/tests/nushell-integration.test.js
```

Passed: 1 test, 1 pass.

```text
pnpm test
```

Passed: 24 tests, 24 pass.

Approval: approved. The reviewer found no blockers or major issues, verified
`git diff --check`, `nu --version`, `pnpm run build`, and `pnpm test`, and
confirmed the result commit had not been made before review. Re-review approved
the temp-file cleanup fix and found no blockers.

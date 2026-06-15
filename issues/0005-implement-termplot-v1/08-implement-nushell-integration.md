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

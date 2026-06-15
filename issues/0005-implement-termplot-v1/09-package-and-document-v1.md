# Experiment 9: Package and document v1

## Description

Implement Stage 9: make TermPlot v1 understandable and installable from the
repository state produced by the earlier experiments.

The v1 implementation now has a Node.js/TypeScript CLI, `termplotd`, a
Playwright Firefox browser renderer, terminal image protocol output, real
terminal verification probes, and a Nushell wrapper. This experiment should turn
that into a coherent user-facing package surface and documentation set without
changing the core rendering architecture.

The experiment should close Issue 5 if packaging, documentation, and
verification show that all Issue 5 requirements are satisfied.

## Changes

- `package.json`:
  - Add package metadata that matches the v1 CLI surface.
  - Add scripts for building, testing, and installing/verifying the Playwright
    Firefox browser artifact.
  - Add a smoke script or small test helper that can verify Playwright Firefox
    launches and produces a PNG screenshot.
  - Add package file metadata so `termplot.nu`, built CLI shims, source,
    license, and docs are included when the package is eventually published.
- `README.md`:
  - Add top-level v1 documentation covering what TermPlot is, macOS scope,
    install/setup, Playwright Firefox dependency, daemon lifecycle, plain shell
    usage, Nushell usage, terminal protocol selection, supported terminals,
    troubleshooting, and cleanup behavior.
  - Document `source termplot.nu`, default Nushell binary PNG pipeline output,
    `--output`, `--display`, daemon options, and protocol options.
  - Document that Chromium was rejected for this environment and Playwright
    Firefox is the current renderer dependency.
- `termplot.nu`:
  - Adjust comments or exported help text only if needed for documentation
    clarity. Do not create a separate Nushell plugin lifecycle.
- `tests/`:
  - Add focused package/documentation checks for package metadata, README
    coverage, and Playwright Firefox launch if useful.
- `issues/0005-implement-termplot-v1/README.md`:
  - Mark Stage 9 complete when implementation and verification pass.
  - Add the Issue 5 conclusion if the full v1 closure requirements are met.

## Verification

Pass criteria:

- `pnpm run build` succeeds.
- `pnpm test` succeeds.
- Any new package/documentation tests pass.
- `git diff --check` succeeds.
- Package contents are directly verified with `pnpm pack --dry-run` or an
  equivalent package-file listing. The output must include `README.md`,
  `LICENSE`, `NOTICE`, `package.json`, `termplot.nu`, `build/bin/termplot.js`,
  and `build/bin/termplotd.js`.
- `pnpm exec dprint fmt README.md issues/0005-implement-termplot-v1/README.md issues/0005-implement-termplot-v1/09-package-and-document-v1.md`
  succeeds.
- Plain shell smoke:
  - Run
    `node build/bin/termplot.js render '{"data":[{"x":[1,2,3],"y":[2,5,3],"type":"scatter"}],"layout":{"width":240,"height":180},"config":{"staticPlot":true}}' --socket /tmp/tp-stage9-shell/termplotd.sock --ttl-ms 60000 --timeout-ms 60000 --output /tmp/tp-stage9-shell/plot.png`.
  - Pass only if the command exits zero, `/tmp/tp-stage9-shell/plot.png` exists,
    has PNG signature `89504e470d0a1a0a`, and reports dimensions `240x180`.
  - Stop the private daemon socket and remove `/tmp/tp-stage9-shell` after the
    check.
- Nushell smoke:
  - Run a Nushell script that does `source termplot.nu`, pipes the same Plotly
    config into
    `termplot --cli (pwd | path join "build/bin/termplot.js")
    --socket /tmp/tp-stage9-nu/termplotd.sock --ttl-ms 60000 --timeout-ms 60000`,
    and saves the binary pipeline output to `/tmp/tp-stage9-nu/plot.png`.
  - Pass only if the command exits zero, `/tmp/tp-stage9-nu/plot.png` exists,
    has PNG signature `89504e470d0a1a0a`, and reports dimensions `240x180`.
  - Stop the private daemon socket and remove `/tmp/tp-stage9-nu` after the
    check.
- Browser artifact setup is documented and verified with exact commands:
  - `pnpm exec playwright install firefox`
  - A local command or script that launches Playwright Firefox, screenshots a
    `200x100` test page, and asserts a nonempty PNG with signature
    `89504e470d0a1a0a` and dimensions `200x100`.
- Stage 9 documentation explains how to start, reuse, stop, and let `termplotd`
  expire.
- The Issue 5 README conclusion proves the original v1 closure checklist: daemon
  start, Plotly config input, auto-start/connect, warm browser-backed render,
  terminal display output, real terminal screenshot evidence from Stage 7,
  warm-daemon timing evidence, daemon stop/expiry, and no probe-owned process
  leaks.

Partial criteria:

- Documentation is complete but packaging metadata or browser artifact
  verification remains incomplete.
- Plain shell works but Nushell documentation or smoke coverage is missing.
- Package metadata is correct but Issue 5 closure evidence is not strong enough
  to close the issue.

Fail criteria:

- The package docs describe behavior that current commands do not implement.
- The setup instructions cannot produce a working browser-backed render on this
  machine.
- Stage 9 attempts to change core renderer, daemon, or terminal protocol
  behavior beyond small packaging/documentation fixes.

## Design Review

Reviewer: Bernoulli (`019ecc22-19ea-7fb3-9f53-b84f2a6524d9`), fresh-context
Codex subagent, read-only.

Findings:

- Major: shell and Nushell smoke checks were underspecified. They required
  rendering but did not define exact commands or objective PNG assertions.
- Major: browser artifact verification was underspecified with "such as" and no
  exact command or pass criteria.
- Minor: package contents were not directly verified after planned package file
  metadata changes.

Fixes:

- Added exact shell and Nushell smoke commands, output paths, PNG signature and
  dimension assertions, and cleanup requirements.
- Added exact Playwright Firefox install and screenshot verification criteria.
- Added package contents verification with `pnpm pack --dry-run` or equivalent
  file-list output.

Approval: approved. The reviewer found no blockers and confirmed the README
links Experiment 9 as `Designed`, required sections are present, the scope is
appropriate for one final packaging/documentation experiment, and implementation
has not started before the plan commit.

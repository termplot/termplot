# Experiment 1: Research v1 stack options

## Description

Research the implementation stack for TermPlot v1 and produce a concrete
architecture recommendation. The experiment should study the archived v0 code,
the `nutorchd` daemon model in `~/dev/nutorch`, and current libraries or tools
for browser rendering, screenshot capture, image processing, terminal image
protocols, and CLI implementation languages.

This experiment is documentation-only. It should not implement v1 code. Its
purpose is to decide the stack and identify the next implementation issues.

## Changes

- Add research findings to this experiment file:
  - v0 rendering pipeline and terminal output summary;
  - `nutorchd` daemon lifecycle lessons;
  - TypeScript/Node, Rust, and hybrid stack comparison;
  - current terminal image protocol and library options;
  - screenshot and image-processing options;
  - recommended v1 architecture and rejected alternatives;
  - risk list and proposed follow-up issues.
- Update the Issue 3 README with the final stack recommendation and any
  decision-critical findings.
- Close Issue 3 only if the recommendation answers every question listed in the
  issue analysis.
- Regenerate `issues/README.md` if Issue 3 closes.

## Verification

Pass criteria:

- The experiment inspects the archived v0 TermPlot implementation under `v0/`,
  including CLI entrypoints, server/app code, Plotly storage, screenshot logic,
  and terminal image output.
- The experiment inspects `~/dev/nutorch/nutorchd` and relevant nutorch issues
  for daemon lifecycle, IPC, shutdown, and cleanup patterns.
- The experiment performs current library research for candidate language and
  rendering choices, using primary sources where possible:
  - Plotly.js/browser rendering and screenshot path;
  - Playwright or equivalent browser automation;
  - Rust CLI/process/daemon/IPC options;
  - Rust and Node image encoding/resizing libraries;
  - terminal image protocol libraries or tools for Kitty, iTerm2, and SIXEL.
- The result records a direct recommendation for:
  - daemon language/runtime;
  - foreground CLI language/runtime;
  - IPC mechanism;
  - rendering pipeline;
  - screenshot strategy;
  - terminal display strategy;
  - idle timeout and plot lifecycle model.
- The result records alternatives considered and why they were rejected or
  deferred.
- The issue README contains enough summary for future implementation issues to
  proceed without rereading every research note.
- `dprint fmt` succeeds on the issue files.
- `git diff --check` passes.

Fail criteria:

- The recommendation does not answer the language/runtime choice.
- The experiment does not inspect v0.
- The experiment does not inspect `nutorchd`.
- The experiment relies only on stale memory for external library capabilities.
- The result proposes implementation work without enough evidence to justify the
  stack decision.

## Design Review

Reviewer: Maxwell (`019ecb20-cb51-7183-9670-3331525de54c`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 1 with status `Designed`, the experiment includes the required
sections, the documentation-only scope is appropriate, verification has concrete
pass/fail criteria, repo hygiene checks are present, and issue-level learning
capture is required.

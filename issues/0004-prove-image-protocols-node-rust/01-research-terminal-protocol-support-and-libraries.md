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

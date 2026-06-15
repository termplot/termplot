# Experiment 7: Synthesize protocol strategy

## Description

Synthesize the Issue 4 evidence into the protocol and client/display-layer
recommendation that unblocks Issue 5. This is a documentation-only experiment:
it should not add new renderers or probe scripts.

Experiments 2 through 6 proved TermPlot-owned direct encoders for the image
protocols that matter on macOS:

- Kitty graphics in Ghostty from Node.js and Rust.
- OSC 1337 `File=` in iTerm2 from Node.js and Rust.
- SIXEL in iTerm2 from Node.js and Rust.

The remaining matrix gaps are not expected to change the v1 implementation
choice:

- iTerm2 Kitty support is not documented by iTerm2's own image docs, and iTerm2
  already has two proven native image paths.
- ANSI/Unicode block fallback is a text rendering fallback, not a terminal image
  protocol. It may be useful later for unsupported terminals, but it does not
  determine the v1 client language or primary image strategy.

## Changes

- Update the Issue 4 README protocol matrix so every remaining proof cell has an
  evidence-backed status: `Pass`, `Unsupported`, or `Deferred`.
- Add a final protocol strategy section to the Issue 4 README.
  - Recommend the TermPlot v1 client/display layer language.
  - Recommend protocol priority for macOS.
  - Record supported terminals for v1.
  - Record which encoders should be in-repo initially.
  - Record which paths are compatibility paths or deferred.
- Add the Issue 4 conclusion.
- Close Issue 4 by updating frontmatter with `status = "closed"` and
  `closed = "2026-06-15"`.
- Regenerate `issues/README.md` with `scripts/build-issues-index.sh`.
- Update Issue 5 Stage 1 text only if needed so it can adopt the Issue 4
  decision in its first implementation experiment.

## Verification

Pass criteria:

- The Issue 4 README has no `Pending` cells in the protocol matrix.
- The Issue 4 conclusion gives a clear recommendation for:
  - client/display-layer language;
  - protocol priority;
  - supported terminals for v1;
  - selected in-repo encoders or libraries;
  - deferred protocols.
- Issue 4 frontmatter is closed with the correct date.
- `issues/README.md` moves Issue 4 from Open to Closed after index generation.
- Issue 5 remains open and is still the next implementation issue.
- `dprint fmt` succeeds on changed issue files.
- `git diff --check` passes.

Fail criteria:

- The recommendation contradicts the experiment evidence.
- The issue closes while leaving matrix cells as `Pending`.
- The conclusion overclaims unsupported terminals or unproven libraries.
- The issue index is stale after closing Issue 4.

## Design Review

Reviewer: Popper (`019ecb94-90c1-7e91-9d6f-9c666f903317`), fresh-context Codex
design reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 7 as `Designed`, the plan has the required sections, the
documentation-only scope is narrow enough, verification includes concrete
pass/fail criteria and index regeneration, and the design avoids overclaiming
iTerm2 Kitty support, ANSI fallback, unsupported terminals, or unproven
libraries.

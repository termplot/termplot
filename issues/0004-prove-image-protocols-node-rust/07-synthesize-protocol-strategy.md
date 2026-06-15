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

## Result

**Result:** Pass

Experiment 7 synthesized the prior protocol proofs and closed Issue 4.

Changes made:

- Updated the Issue 4 frontmatter to `status = "closed"` with
  `closed = "2026-06-15"`.
- Replaced the remaining protocol-matrix `Pending` cells with evidence-backed
  `Pass`, `Unsupported`, or `Deferred` statuses.
- Added the final protocol strategy:
  - TypeScript/Node foreground client and display layer for v1.
  - Ghostty default: Kitty graphics with an in-repo direct encoder.
  - iTerm2 default: OSC 1337 `File=` with an in-repo direct PNG emitter.
  - iTerm2 compatibility: SIXEL, proven in both Node.js and Rust, but not the
    default because production full-color plots would need quantization or a
    maintained encoder.
  - Deferred: ANSI/Unicode block fallback and iTerm2 Kitty graphics.
- Added the Issue 4 conclusion.
- Regenerated `issues/README.md` with `scripts/build-issues-index.sh` so Issue 4
  moves from Open to Closed.

Verification commands:

```bash
rg 'Pending' issues/0004-prove-image-protocols-node-rust/README.md
scripts/build-issues-index.sh
dprint fmt issues/0004-prove-image-protocols-node-rust/README.md issues/0004-prove-image-protocols-node-rust/07-synthesize-protocol-strategy.md issues/README.md
git diff --check
```

Expected verification:

- `rg 'Pending' ...` returns no matches.
- `issues/README.md` lists Issue 5 under Open and Issue 4 under Closed.
- `git diff --check` passes.

## Conclusion

Issue 4 no longer blocks Issue 5. TermPlot v1 should proceed with a
TypeScript/Node client/display layer and direct in-repo encoders for Kitty
graphics in Ghostty and OSC 1337 in iTerm2. SIXEL should remain an iTerm2
compatibility path, while ANSI/Unicode fallback and iTerm2 Kitty support are
deferred until the primary v1 path works end to end.

## Completion Review

Reviewer: Gauss (`019ecb97-fddd-78d1-b313-ac4bce4c31a6`), fresh-context Codex
completion reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the result stayed within the
documentation-only scope, Experiment 7 has `Result` and `Conclusion`, Issue 4 is
closed correctly, the matrix has no `Pending` cells, the recommendation covers
language, protocol priority, supported terminals, in-repo encoders, and deferred
paths, `issues/README.md` has Issue 5 open and Issue 4 closed,
`git diff
--check` and `dprint check` passed, and the result commit had not yet
been made.

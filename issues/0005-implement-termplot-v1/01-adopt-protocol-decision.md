# Experiment 1: Adopt protocol decision

## Description

Adopt Issue 4's protocol and client-language decision into Issue 5 before any v1
implementation starts. This experiment is documentation-only. It updates the
Issue 5 roadmap so subsequent implementation experiments have stable decisions
for language, protocol priority, supported terminals, selected encoders, and
deferred paths.

Issue 4 closed with this recommendation:

- use a TypeScript/Node foreground client and display layer;
- support Ghostty with Kitty graphics through an in-repo direct encoder;
- support iTerm2 with OSC 1337 `File=` through an in-repo direct PNG emitter;
- keep SIXEL as an iTerm2 compatibility path, not the default;
- defer ANSI/Unicode fallback and iTerm2 Kitty graphics;
- keep `timg` as a test oracle only.

## Changes

- Update the Issue 5 README Architecture section so the foreground client is no
  longer unresolved.
- Mark Stage 1 complete and record the adopted Issue 4 decisions directly under
  the Stage 1 checklist.
- Add a short implementation direction for Stage 2 so the next experiment can
  start with the `termplotd` lifecycle skeleton.
- Keep Issue 5 open.

## Verification

Pass criteria:

- Issue 5 records TypeScript/Node as the v1 foreground client/display language.
- Issue 5 records protocol priority: Ghostty Kitty first, iTerm2 OSC 1337
  second, iTerm2 SIXEL compatibility, ANSI/Unicode and iTerm2 Kitty deferred.
- Issue 5 records in-repo direct encoders as the initial implementation path.
- Stage 1 is marked complete.
- Issue 5 remains open.
- The next stage remains Stage 2: `termplotd` lifecycle skeleton.
- `dprint fmt` succeeds on the changed issue files.
- `git diff --check` passes.

Fail criteria:

- The issue still describes the foreground client language as unresolved.
- The roadmap contradicts Issue 4's final protocol strategy.
- This experiment starts implementation code before Stage 1 is committed.

## Design Review

Reviewer: Carson (`019ecb9b-4025-7662-9c8f-b3c4ec80fed1`), fresh-context Codex
design reviewer.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that Issue 5 links Experiment 1 as
`Designed`, the plan has the required sections, the scope is documentation-only,
the plan correctly adopts Issue 4's strategy without claiming unsupported paths,
Issue 5 remains open, and Stage 2 remains the next implementation stage.

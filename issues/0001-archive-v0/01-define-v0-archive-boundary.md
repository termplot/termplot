# Experiment 1: Define the v0 archive boundary

## Description

Before moving files, define the archive boundary for the current TermPlot
prototype. This experiment identifies which paths are part of v0 and should move
under `v0/`, which paths are repository-level workflow or policy and should stay
at the root, and which paths need special handling because moving them could
break archive readability or future workflow.

The goal is to produce an evidence-based archive map that the next experiment
can execute mechanically.

## Changes

- `issues/0001-archive-v0/README.md`: add this experiment to the issue index
  with status `Designed`.
- `issues/0001-archive-v0/01-define-v0-archive-boundary.md`: record the archive
  boundary, verification criteria, design review, result, and conclusion.

No production files move in this experiment.

## Verification

Pass criteria:

1. List every current top-level path and classify it as `move to v0`,
   `keep at
   root`, or `special handling`.
2. Verify the classification against `rg --files -g '!node_modules'` and
   top-level `find` output so no tracked or visible source path is silently
   omitted.
3. Identify how symlinks should behave after the move:
   - `CLAUDE.md` remains a root symlink to `AGENTS.md`.
   - `.codex/skills` and `.claude/skills` remain symlinks to `../skills`.
   - any v0-local symlink need must be explicitly documented before creation.
4. Identify root paths that must remain outside `v0/` for the ongoing issue
   workflow: `AGENTS.md`, `CLAUDE.md`, `.codex/`, `.claude/`, `skills/`,
   `issues/`, `scripts/build-issues-index.sh`, and repository-level license
   files.
5. Identify v0 paths that should move together to preserve the prototype:
   current app/server/CLI source, examples, package metadata, lock/workspace
   files, configs, public/raw assets, prototype docs, and generated binary entry
   shims.
6. Run `git diff --check` before the design is reviewed.

Fail criteria:

- Any current top-level source path is unclassified.
- The proposed boundary would break the agent-doc or skills symlink contract.
- The proposed boundary leaves prototype package/config files split in a way
  that makes the archived v0 harder to inspect or run without a stated reason.

## Design Review

Reviewer: `Herschel` (`019ecac2-977f-7742-8049-17f158873271`), fresh-context
Codex subagent with `fork_context: false`.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links this
experiment with status `Designed`, the experiment contains the required
Description, Changes, Verification, and Design Review sections, scope is narrow,
verification has concrete pass/fail criteria, `git diff --check` is included,
and no production move started before the plan commit.

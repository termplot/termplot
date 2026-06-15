# Experiment 2: Move the prototype into v0

## Description

Move the current TermPlot prototype into a new `v0/` directory using the archive
boundary defined by Experiment 1. The move should preserve the prototype as an
inspectable, runnable reference while leaving the repository root focused on the
new issue workflow and future implementation work.

This experiment performs the archive move mechanically. It does not redesign the
tool, edit prototype behavior, or start the next implementation.

## Changes

- Create `v0/`.
- Move the paths classified as `Move to v0/` in Experiment 1 into `v0/`.
- Keep root workflow and policy paths in place:
  - `.claude/`
  - `.codex/`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `LICENSE`
  - `NOTICE`
  - `dprint.json`
  - `issues/`
  - `scripts/`
  - `skills/`
- Apply `.gitignore` special handling:
  - keep root `.gitignore`;
  - add `v0/.gitignore` with the prototype ignore rules needed when working
    inside `v0/`.
- If the archive move passes and solves the issue, close Issue 1:
  - add a `## Conclusion` section to the issue README;
  - set issue frontmatter to `status = "closed"` and add
    `closed = "2026-06-15"`;
  - regenerate `issues/README.md` with `scripts/build-issues-index.sh`.
- Update issue documentation with the result and conclusion after verification.

## Verification

Pass criteria:

1. `git status --short` shows the prototype paths as moved into `v0/`, not
   deleted and re-created unnecessarily.
2. `git ls-files | awk -F/ '{print $1}' | sort -u` shows only intended
   repository-level tracked paths at root plus `v0`.
3. The root symlinks still resolve exactly:
   - `CLAUDE.md -> AGENTS.md`
   - `.codex/skills -> ../skills`
   - `.claude/skills -> ../skills`
4. `find v0 -maxdepth 1 -mindepth 1 -print | sed 's#^v0/##' | sort` includes
   every prototype path listed in Experiment 1's `Move to v0/` table.
5. `v0/.gitignore` exists and contains prototype-local ignores for
   `node_modules`, build output, React Router output, and TypeScript build info.
6. `git diff --check` passes.
7. From `v0/`, run the available package checks:
   - `pnpm install`
   - `pnpm run build`
   - `pnpm run typecheck`
8. If the archive move passes, the issue README has a `## Conclusion`,
   `status = "closed"`, `closed = "2026-06-15"`, and the regenerated
   `issues/README.md` lists Issue 1 under Closed.

If dependency install or browser-related postinstall behavior blocks package
checks, record the exact command output and classify the experiment as
`Partial`.

Fail criteria:

- Any path classified as root workflow/policy moves into `v0/`.
- Any prototype path from Experiment 1 is omitted without explanation.
- Any required symlink breaks.
- The archive cannot be inspected as a coherent prototype package.

## Design Review

Reviewer: `Bacon` (`019ecac7-2a1e-7710-bc78-044e9114b5ee`), fresh-context Codex
subagent with `fork_context: false`.

Findings:

- Blocker: none.
- Major: Experiment 2 did not explicitly require closing Issue 1 or regenerating
  the issue index after a successful archive move.
- Minor: none.

Fix: added changes and verification criteria requiring a successful archive move
to add an issue README conclusion, set `status = "closed"`, add
`closed = "2026-06-15"`, and regenerate `issues/README.md` with
`scripts/build-issues-index.sh`.

Re-reviewer: `Chandrasekhar` (`019ecac8-bd0d-7b73-acc8-60fd18ab5203`),
fresh-context Codex subagent with `fork_context: false`.

Re-review findings:

- Blocker: none.

Approval: approved. The re-reviewer confirmed the prior finding is resolved, the
closure/index requirements are now present in both Changes and Verification, and
no new blocker was introduced.

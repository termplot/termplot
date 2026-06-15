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

## Result

**Result:** Pass

The prototype was moved into `v0/` using `git mv` for the paths classified by
Experiment 1. Root workflow and policy files remained at the repository root.

The move included one archive-preservation typecheck fix inside `v0/`:

- `v0/app/.server/plotly-db.ts`: changed the re-export from
  `../../cli/plotly-db.ts` to `../../cli/plotly-db.js`, matching the existing
  JS-extension import style used by the CLI files.
- `v0/tsconfig.vite.json`: added `cli/plotly-db.ts` to the app TypeScript
  project so the `.server` re-export is inside the project file set.

`v0/.gitignore` was added with prototype-local ignores for `node_modules`, React
Router output, build output, and TypeScript build info.

Verification command results:

- `git status --short`: prototype paths are staged as moves into `v0/`; the two
  typecheck-preservation edits are shown as modified moved files.
- `git ls-files | awk -F/ '{print $1}' | sort -u`: root tracked paths are now
  `.claude`, `.codex`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`,
  `NOTICE`, `dprint.json`, `issues`, `scripts`, `skills`, and `v0`.
- `readlink CLAUDE.md`: `AGENTS.md`.
- `readlink .codex/skills`: `../skills`.
- `readlink .claude/skills`: `../skills`.
- `git ls-files v0 | awk -F/ '{print $2}' | sort -u`: includes every tracked
  prototype path listed by Experiment 1's `Move to v0/` table.
- `git status --ignored --short v0/.react-router v0/build v0/node_modules
  v0/*.tsbuildinfo`:
  generated verification artifacts are ignored by `v0/.gitignore`.
- `git diff --check`: pass.
- `pnpm install` from `v0/`: pass. Before pnpm had run the pending build
  scripts, plain install reported `ERR_PNPM_IGNORED_BUILDS`; running
  `pnpm install --dangerously-allow-all-builds` let pnpm handle the pending
  build approvals without manual workspace-file edits, after which plain
  `pnpm install` passed.
- `pnpm run build` from `v0/`: pass.
- `pnpm run typecheck` from `v0/`: pass.
- `scripts/build-issues-index.sh`: pass; Issue 1 is listed under Closed.

## Conclusion

Issue 1 is solved. The current TermPlot prototype is preserved as `v0/`, the
root is cleared for the next version's implementation work, and the workflow
files needed for future issues remain at the top level.

## Completion Review

Reviewer: `Fermat` (`019ecace-9adc-73a2-8f1f-05e9f256817a`), fresh-context Codex
subagent with `fork_context: false`.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the completed experiment matches
the approved scope, the typecheck-preservation edits are limited to
`v0/app/.server/plotly-db.ts` and `v0/tsconfig.vite.json`, Experiment 2 has
`## Result` and `## Conclusion`, Issue 1 is closed, `issues/README.md` lists
Issue 1 under Closed, root tracked paths are limited to the intended workflow
surface plus `v0`, v0 contains the expected prototype path set, symlinks still
resolve as required, generated v0 artifacts are ignored, `git diff --check`
passed, and the result commit had not yet been made.

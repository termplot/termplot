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

## Result

**Result:** Pass

The archive boundary is defined below from current-state evidence:

- `git ls-files | awk -F/ '{print $1}' | sort -u` reported 37 tracked top-level
  paths.
- `find . -maxdepth 1 -mindepth 1 -print | sed 's#^./##' | sort` reported the
  visible top-level tree, including untracked `.git` and `node_modules`.
- `find . -maxdepth 2 -type l -not -path './node_modules/*' -print -exec
  readlink {} \\;`
  reported the three repository symlinks: `CLAUDE.md -> AGENTS.md`,
  `.codex/skills -> ../skills`, and `.claude/skills -> ../skills`.

### Keep at Root

These paths are repository workflow, policy, issue-tracking, or shared legal
surface and should remain outside `v0/`:

| Path          | Reason                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| `.claude/`    | Agent runtime folder; `.claude/skills` must remain a symlink to `../skills`. |
| `.codex/`     | Agent runtime folder; `.codex/skills` must remain a symlink to `../skills`.  |
| `AGENTS.md`   | Root agent contract and workflow source of truth.                            |
| `CLAUDE.md`   | Must remain a symlink to `AGENTS.md`.                                        |
| `LICENSE`     | Repository-level license.                                                    |
| `NOTICE`      | Repository-level notice.                                                     |
| `dprint.json` | Repository formatting config used by issue docs and workflow files.          |
| `issues/`     | Active issue and experiment record.                                          |
| `scripts/`    | Contains `scripts/build-issues-index.sh`, the active issue index generator.  |
| `skills/`     | Shared project-local skills for Codex and Claude.                            |

### Move to `v0/`

These paths belong to the current prototype and should move together into the
archive:

| Path                     | Reason                                                                |
| ------------------------ | --------------------------------------------------------------------- |
| `.npmignore`             | npm package ignore rules for the prototype package.                   |
| `CHANGELOG.md`           | Prototype package changelog.                                          |
| `README.md`              | Prototype user-facing README.                                         |
| `app/`                   | Prototype React Router app.                                           |
| `bin/`                   | Prototype executable shims.                                           |
| `biome.json`             | Prototype code-format/lint config.                                    |
| `chat.archive.1.md`      | Prototype development record.                                         |
| `chat.archive.2.md`      | Prototype development record.                                         |
| `chat.md`                | Prototype development record.                                         |
| `cli/`                   | Prototype CLI, Nushell plugin, server bootstrap, and stdin utilities. |
| `examples/`              | Prototype Plotly examples.                                            |
| `package.json`           | Prototype package manifest.                                           |
| `pnpm-lock.yaml`         | Prototype dependency lockfile.                                        |
| `pnpm-workspace.yaml`    | Prototype workspace/build-policy file.                                |
| `process-icons.ts`       | Prototype icon processing script.                                     |
| `public/`                | Prototype public assets.                                              |
| `raw-icons/`             | Prototype source icon asset.                                          |
| `raw-images/`            | Prototype screenshot asset.                                           |
| `react-router.config.ts` | Prototype React Router config.                                        |
| `server/`                | Prototype React Router Express app wrapper.                           |
| `termplot.nu`            | Prototype Nushell wrapper script.                                     |
| `tsconfig.cli.json`      | Prototype CLI TypeScript config.                                      |
| `tsconfig.json`          | Prototype TypeScript root config.                                     |
| `tsconfig.node.json`     | Prototype Node TypeScript config.                                     |
| `tsconfig.vite.json`     | Prototype Vite/app TypeScript config.                                 |
| `vite.config.ts`         | Prototype Vite config.                                                |

### Special Handling

| Path            | Handling                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`    | Keep a root `.gitignore` for repository-level ignores, and create or copy `v0/.gitignore` so the archived package still ignores `node_modules`, build output, React Router output, and TypeScript build info when worked on from inside `v0/`. |
| `.git/`         | Untracked repository metadata; never move.                                                                                                                                                                                                     |
| `node_modules/` | Untracked install output; never move or commit. It can be removed or left ignored, but it is not part of the v0 archive.                                                                                                                       |

### Symlink Boundary

The root symlink contract remains unchanged:

- `CLAUDE.md -> AGENTS.md`
- `.codex/skills -> ../skills`
- `.claude/skills -> ../skills`

No v0-local symlink is required for the archive move. The v0 prototype can rely
on ordinary files and directories inside `v0/`.

### Next Experiment Input

The next experiment should execute this boundary mechanically:

1. Create `v0/`.
2. Move every path listed in `Move to v0/` into `v0/`.
3. Preserve root workflow paths listed in `Keep at Root`.
4. Apply `.gitignore` special handling.
5. Verify there are no unclassified tracked top-level paths left at root.
6. Verify symlink targets are unchanged.
7. Verify the archived prototype remains inspectable and, if dependency
   installation is available, buildable from `v0/`.

Verification command results:

- `git diff --check`: pass.

## Conclusion

The archive boundary is clear enough to move the prototype in the next
experiment. The only non-mechanical decision is `.gitignore`: root needs to keep
repository-level ignore behavior, while `v0/` should receive equivalent
prototype ignore rules so the archived package remains pleasant to work on from
inside its new directory.

## Completion Review

Reviewer: `Rawls` (`019ecac5-108e-73e1-ac3a-c7414daea800`), fresh-context Codex
subagent with `fork_context: false`.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the completed experiment stayed
within the approved documentation-only scope, the experiment has `## Result` and
`## Conclusion`, the issue README status matches `Pass`, the next-experiment
input is recorded, `git diff --check` passed, the result commit had not yet been
made, and no build or typecheck was required because no production files moved
or changed.

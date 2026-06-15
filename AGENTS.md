# TermPlot

TermPlot renders Plotly plots inside terminals by running a local web app in a
browser, taking a screenshot, and printing the image through terminal image
escape codes. It supports a plain CLI and a Nushell plugin path.

## Agent Docs Compatibility

This repository uses `AGENTS.md` as the source of truth for agent instructions.
Do not create an independent `CLAUDE.md`.

Every `AGENTS.md` must have a corresponding `CLAUDE.md` in the same directory,
and `CLAUDE.md` must be a symlink to `AGENTS.md`:

```bash
ln -s AGENTS.md CLAUDE.md
```

This applies in every folder, not just the repository root. When adding,
moving, or removing agent docs, update both names together and keep
`CLAUDE.md` as a symlink to `AGENTS.md`.

## Project-Local Skills

Project-local skills live in the top-level `skills/` directory. Keep
`.codex/skills` and `.claude/skills` as symlinks to `../skills`; do not let them
become divergent copies.

Current project-local skills:

- `commit`: write GitPoet-style commit messages.
- `adversarial-review`: run fresh-context review gates for experiment designs,
  experiment results, implementation diffs, and technical claims.

## Issues and Experiments

Every significant piece of work gets an issue in `issues/`. Issues describe the
problem, provide background, and frame the solution space. Experiments are the
incremental steps that solve the issue.

### Issue Structure

Each issue is a folder. The `README.md` is the issue spine: frontmatter, goal,
background, analysis, an ordered index of experiments, and the final conclusion.
Every experiment is its own numbered file in the same folder. The README never
contains experiment bodies, only links to them.

```text
issues/0001-rendering-pipeline/
|-- README.md                    # spine: frontmatter, goal, background,
|                                # experiments index, conclusion
|-- 01-audit-current-pipeline.md # Experiment 1 body
|-- 02-rework-cli-rendering.md   # Experiment 2 body
`-- 03-...                       # one file per experiment, in sequence
```

The folder name is `{NNNN}-{slug}`. The number is zero-padded to 4 digits and
globally sequential within this repository. The slug is lowercase, hyphenated,
and describes the topic.

The full issue index is `issues/README.md`. If the repository has an index
generation script, regenerate the index after opening or closing issues.

### Frontmatter

Every issue `README.md` starts with TOML frontmatter:

```toml
+++
status = "open"
opened = "2026-06-15"
+++
```

For closed issues:

```toml
+++
status = "closed"
opened = "2026-06-15"
closed = "2026-06-15"
+++
```

Issues may add their own TOML frontmatter keys to `README.md`, experiment
files, or other issue docs for issue-specific metadata, as long as:

- `README.md` always preserves the reserved keys `status` and `opened`, plus
  `closed` when closed;
- additive keys are valid TOML between the `+++` delimiters;
- additive keys do not contradict the reserved keys or index tooling;
- the issue documents any added schema in its own `README.md`.

### README.md Structure

After the frontmatter, a new issue's `README.md` has these sections:

1. Title: `# Issue {N}: {descriptive title}`
2. Goal: one or two sentences describing the desired outcome.
3. Background: context, prior work, constraints.
4. Architecture, Analysis, or Proposed Solutions: technical details.

A new issue README has no experiments listed yet.

As experiments are created, the README grows an `## Experiments` section: an
ordered list linking to each experiment file, one per line, with a one-line
status. The README holds links and statuses only, never experiment bodies.

```markdown
## Experiments

- [Experiment 1: Audit current rendering behavior](01-audit-current-rendering-behavior.md) -
  **Pass**
- [Experiment 2: Rework CLI rendering path](02-rework-cli-rendering-path.md) -
  **Partial** (needs Nushell plugin coverage)
- [Experiment 3: Add PNG output](03-add-png-output.md) - **Designed**
```

Keep each status to one of: `Designed`, `In progress`, `Pass`, `Partial`,
`Fail`. Update the line when the experiment result is recorded, so the README is
an at-a-glance progress tracker.

When the issue is solved or abandoned, add a `## Conclusion` section to the
README.

### Experiment Files

Each experiment lives in its own file `NN-{slug}.md` in the issue folder, where
`NN` is a zero-padded two-digit number in creation order (`01`, `02`, ...,
`99`). The slug is lowercase-hyphenated and describes the experiment.

An experiment file may begin with optional TOML frontmatter (`+++ ... +++`)
before its H1 title for issue-specific metadata such as agent provenance.
Experiment frontmatter is optional and must not replace the required H1 title
and H2 sections.

Each experiment file contains:

1. Title: `# Experiment {N}: {descriptive title}`
2. `## Description`: what and why.
3. `## Changes`: specific code changes, listed by file.
4. `## Verification`: concrete test steps and pass/fail criteria.
5. `## Result` and `## Conclusion`: added after the experiment runs.

Keep each file focused. If one grows past roughly 1000 lines, split the work
into the next numbered experiment.

### Multiple Open Issues

Multiple issues can be open at the same time. This allows broad roadmap issues
to stay open while smaller implementation issues are opened and closed alongside
them.

### Experiments

Only create an experiment after the issue requirements are clear. Each
experiment is designed, implemented, and concluded before the next one is
designed.

Never list all experiments upfront. The outcome of each experiment informs what
comes next.

Each experiment is added as a new link in the issue README's `## Experiments`
index the moment it is created. Inside the file, use an H1 title and H2
sections:

1. `# Experiment {N}: {descriptive title}`
2. `## Description`
3. `## Changes`
4. `## Verification`
5. `## Result` and `## Conclusion`, added after it runs.

### One at a Time

Design and implement one experiment at a time. The result of Experiment 1
directly informs what Experiment 2 should be.

### AI Review Gate

Every experiment should be reviewed by another AI agent before moving to the
next stage.

1. Design review before implementation:
   - After writing the experiment design, ask another AI agent to review it.
   - Fix real issues found by the review.
   - Record the review result in the experiment file.
   - Do not implement the experiment until the reviewing agent approves the
     design.

2. Result review before the next experiment:
   - After implementation, verification, and result recording, ask another AI
     agent to review the completed experiment and result.
   - Fix real issues found by the review.
   - Record the completion-review result in the experiment file.
   - Do not design or implement the next experiment until the reviewing agent
     approves the completed output.

The reviewing agent must be separate from the implementation pass. Prefer a
fresh-context subagent using the local `adversarial-review` skill. The review
must be read-only and must approve only when no blocker findings remain.

### Experiment Commits

When the repository is under git, every experiment has two required commit
points:

1. Plan commit: after the experiment design is written, reviewed, fixed,
   approved, and linked from the issue README, commit the experiment plan before
   implementation begins.
2. Result commit: after implementation, verification, result recording,
   completion review, and any required fixes, commit the experiment result
   before designing the next experiment.

These commits must be separate. Do not combine an experiment plan and its result
in the same commit, and do not start the next experiment before the previous
experiment's result commit exists.

### Recording Results

After testing, append the result inside the experiment's own file, below
Verification:

```markdown
## Result

**Result:** Pass / Partial / Fail

{description}

## Conclusion

{what we learned, what the next experiment should be}
```

Then update that experiment's status on its line in the README's
`## Experiments` index: `Designed` to `Pass`, `Partial`, or `Fail`. All three
outcomes are useful. Failed experiments eliminate dead ends.

### Closing an Issue

When the issue is solved or abandoned, add a `## Conclusion` section to the
issue `README.md` after the `## Experiments` index. Summarize what was learned
and the outcome. Update the frontmatter to `status = "closed"` with a `closed`
date. Regenerate the issue index if an index generation script exists.

### Immutability

Closed issues are historical records. They are immutable and must not be
modified. History stays as it was written.

### Process Summary

1. Create the issue: `issues/{NNNN}-{slug}/README.md` with frontmatter, goal,
   background, and analysis. No experiments yet.
2. Design Experiment 1: create `01-{slug}.md` with the experiment body, and add
   a link to it under `## Experiments` in the README with status `Designed`.
3. Review and commit the plan: get another AI agent to approve the design, fix
   real findings, record the review result, and commit the experiment plan.
4. Implement Experiment 1.
5. Record the result: append `## Result` and `## Conclusion` inside
   `01-{slug}.md`, and update its status on the README index line.
6. Review and commit the result: get another AI agent to approve the completed
   output, fix real findings, record the completion review, and commit the
   experiment result.
7. Repeat: create `02-{slug}.md` for the next experiment. The prior result
   informs it.
8. Close the issue: write the README conclusion, update frontmatter, and rebuild
   the index if applicable.

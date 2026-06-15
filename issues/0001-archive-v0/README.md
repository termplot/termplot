+++
status = "open"
opened = "2026-06-15"
+++

# Issue 1: Archive v0

## Goal

Move the current TermPlot prototype into a `v0/` directory so the repository can
preserve the working prototype while clearing the top-level source tree for a
substantially redesigned version of the tool.

## Background

The current codebase is the first working prototype of TermPlot. It renders
Plotly plots in terminals by serving a React Router app, driving Puppeteer to
capture the plot, and emitting terminal image escape codes. It also includes a
Nushell plugin path that keeps a browser and web app alive for faster repeated
renders.

That prototype is useful historical and technical reference material, but the
next version is expected to make large architectural changes. Keeping v0 intact
under `v0/` lets new work proceed without losing the implementation details,
examples, docs, packaging decisions, and Nushell plugin experiments that proved
the concept.

## Analysis

The archive should preserve the prototype as runnable reference code where
practical. The archive operation should identify which files belong to v0, move
them together, and leave only repository-level files at the root when those
files are shared by the future project workflow.

Likely v0-owned files include the current CLI, React app, server, examples,
assets, package metadata, TypeScript configs, and prototype docs. Likely
repository-level files include `AGENTS.md`, `CLAUDE.md`, `issues/`, `skills/`,
`.codex/`, `.claude/`, license files if they apply to the whole repository, and
the issue index script.

The first experiment should design and verify the archive boundary before moving
files. The second experiment, if the design passes, should perform the move and
verify that the archived prototype remains understandable and that the root is
ready for the next version.

## Experiments

- [Experiment 1: Define the v0 archive boundary](01-define-v0-archive-boundary.md) -
  **Pass**
- [Experiment 2: Move the prototype into v0](02-move-prototype-into-v0.md) -
  **Designed**

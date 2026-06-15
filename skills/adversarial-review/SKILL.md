---
name: adversarial-review
description: Run or request fresh-context adversarial reviews for TermPlot experiment plans, experiment results, implementation diffs, workflow gates, and technical claims, using a subagent of the same tool (Codex or Claude) that authored the work.
---

# Adversarial Review

Use this skill when an experiment design, experiment result, implementation
diff, or technical claim needs independent review.

TermPlot's default reviewer is a fresh-context subagent of the same tool that
authored the work: a Codex subagent for Codex-authored work, a Claude subagent
for Claude-authored work. Do not call `claude -p`, `codex exec`, or other
external paid CLIs from the other tool unless the user explicitly asks for
cross-tool review later.

## Core Rules

- Use a separate agent from the implementation pass.
- Prefer a new subagent with fresh context (no parent conversation).
- Give the reviewer only the files, commands, and rules needed for the review.
- The reviewer is read-only: no file edits, no commits, no destructive commands.
- The reviewer should try to reject the work, but must stay evidence-grounded.
- Findings must include severity, file/line reference when possible, evidence,
  and the required fix.
- Approval is valid only when no blocker findings remain.
- Record the reviewer name or ID, that it used fresh context, the findings, and
  the approval result in the experiment file.

If a fresh subagent cannot be started, do not silently reuse a warm agent for a
required adversarial gate. Either wait for a fresh slot or record the review as
a weaker same-session/fallback review that does not satisfy the gate unless the
user explicitly accepts it.

## Invocation Pattern

Spawn the reviewer with fresh context, using the mechanism of the tool running
the review:

- Codex: spawn a subagent with `fork_context: false`.
- Claude: spawn a subagent with the Agent tool (subagents start with no parent
  conversation context). Use a read-only agent type such as `Explore`, or
  instruct the reviewer that it must not edit files, commit, or run
  destructive commands.

Pass explicit paths instead of the parent conversation. Include:

- `AGENTS.md`
- the issue `README.md`
- the experiment file
- any changed source files or `git diff` relevant to the review
- the exact review objective

Do not include the implementer's reasoning unless the review is specifically
about that reasoning. Fresh context is the point.

## Design Review Prompt

Use this structure for experiment plans:

```text
Review this TermPlot experiment design with fresh context.

Do not edit files. Use AGENTS.md as the workflow contract.

Check:
- the issue README links this experiment with status Designed;
- the experiment has Description, Changes, Verification, and Design Review;
- scope is narrow enough for one experiment;
- implementation does not start before plan commit;
- verification includes concrete pass/fail criteria;
- required repo hygiene checks are present;
- necessary learnings will be recorded in the issue;
- the technical plan is likely to achieve the stated goal.

Return findings first, ordered by severity:
- Blocker
- Major
- Minor

Each finding needs file/line evidence and a required fix.
Approve only if no blockers remain.
```

## Completion Review Prompt

Use this structure after implementation and result recording:

```text
Review this completed TermPlot experiment with fresh context.

Do not edit files. Use AGENTS.md as the workflow contract.

Check:
- the implementation matches the approved experiment scope;
- verification commands were run and recorded accurately;
- the experiment file has Result and Conclusion;
- the issue README status matches the result;
- learnings needed by later work are recorded in the issue README;
- `git diff --check` passed or failures are explained;
- tests/build/typecheck evidence supports the claimed result;
- the result commit has not been made before this review.

Return findings first, ordered by severity:
- Blocker
- Major
- Minor

Each finding needs file/line evidence and a required fix.
Approve only if no blockers remain.
```

## Re-review Prompt

Use this after fixing findings:

```text
Re-review only the fixes for the prior findings.

Do not edit files. Confirm whether each prior finding is resolved.
Report any new blocker introduced by the fix.
Approve only if no blockers remain.
```

## Lead Agent Judgment

After the subagent returns:

1. Accept findings that are real workflow, correctness, verification, or
   maintainability issues.
2. Reject false positives explicitly and explain why.
3. Patch real issues before asking for re-review.
4. Record the review summary in the experiment file.
5. Do not implement after design review until the plan commit exists.
6. Do not design the next experiment after completion review until the result
   commit exists.

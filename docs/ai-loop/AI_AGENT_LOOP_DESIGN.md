# AI Agent Loop Design

## Purpose

This document defines a controlled AI-assisted development loop for the repository.
The goal is to let a controller agent read roadmap/spec documents, generate the next bounded worker prompt, let a coding agent implement it, then verify the result before the next iteration.

## Target Flow

```text
Roadmap / Issues / Current diff
  -> Controller Agent generates one bounded task
  -> Worker Agent implements on a feature branch
  -> CI verifies build, lint, tests, and scope rules
  -> Reviewer Agent checks diff against roadmap and constraints
  -> Next task is written to docs/ai-loop/NEXT_TASK.md
```

## Roles

### Controller Agent

Responsibilities:
- Read roadmap, issues, recent commits, and previous AI loop state.
- Select exactly one next task.
- Generate a worker prompt with explicit scope, allowed files, forbidden files, acceptance criteria, and test commands.
- Stop the loop when the next task is ambiguous, risky, or blocked.

Non-responsibilities:
- Do not directly make product decisions beyond the roadmap.
- Do not expand scope just because adjacent improvements are visible.

### Worker Agent

Responsibilities:
- Implement only the controller prompt.
- Keep changes small enough for one reviewable PR.
- Run the requested checks.
- Report changed files, test results, known failures, and follow-up items.

Non-responsibilities:
- Do not redesign architecture.
- Do not change secrets, generated files, service account files, lockfiles, or deployment settings unless explicitly allowed.

### Verifier

Responsibilities:
- Run deterministic checks.
- Confirm that the changed files are within scope.
- Fail closed when checks cannot run.

### Reviewer Agent

Responsibilities:
- Compare the implementation against the roadmap, prompt, and acceptance criteria.
- Identify scope creep, risky changes, missing tests, and documentation gaps.
- Decide one of: continue, request follow-up, stop for human review.

## Loop Inputs

Manual workflow inputs should include:

| Input | Meaning | Default |
|---|---|---|
| `iterations` | Maximum number of loop turns | `1` |
| `task_source` | Roadmap or issue reference | `docs` |
| `mode` | `docs-only`, `code`, or `review-only` | `docs-only` |
| `dry_run` | Generate prompts without writing implementation changes | `true` |

## Hard Safety Constraints

The loop must stop when any of the following occurs:

- CI fails and the failure is not an expected documented failure.
- The worker changes files outside the allowed scope.
- The worker modifies secrets, service account JSON, generated outputs, binary artifacts, or deployment credentials.
- The controller cannot identify a single bounded next task.
- The same failure repeats twice.
- The requested iteration count is exceeded.

## Recommended Repository Files

```text
docs/ai-loop/
  AI_AGENT_LOOP_DESIGN.md
  AI_STATE.example.json
  NEXT_TASK.md
  PROMPT_TEMPLATE.md
.github/workflows/
  ai-loop-controller.yml
```

## Minimum Viable Automation

Phase 1 should be intentionally conservative:

1. Manual workflow dispatch only.
2. Default `dry_run: true`.
3. Generate or update `docs/ai-loop/NEXT_TASK.md` only.
4. Require human copy/paste into Codex or Claude Code.
5. After worker push, ChatGPT reviews the PR/commit and generates the next prompt.

Phase 2 can add branch creation and PR draft creation.

Phase 3 can add bounded code edits by a worker CLI in a sandbox.

Phase 4 can add multi-iteration execution, still with stop conditions and periodic human gates.

## Recommended Human Gate

For early operation, use:

```text
max_iterations: 3
human_review_every: 1
```

After the loop is stable:

```text
max_iterations: 20
human_review_every: 5
```

Twenty unattended iterations are technically possible but should not be the first target. The first target is boring, repeatable, auditable automation. Exciting automation is how repositories become archaeological sites.

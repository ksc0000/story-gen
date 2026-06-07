# AI Loop Controller

This directory contains the logic for the AI Agent Loop Controller.

## Overview

The Controller is responsible for determining the next task to be performed by an AI Worker.
In Phase 1.5a, the controller is deterministic and generates a fixed next task for Phase 1.5b.

## How to Run

### Via GitHub Actions

1. Navigate to the **Actions** tab in the GitHub repository.
2. Select the **AI Loop Controller** workflow.
3. Click **Run workflow**.
4. Configure the inputs:
   - `iterations`: Maximum number of loop turns (default: 1).
   - `mode`: `docs-only`, `code`, or `review-only`.
   - `dry_run`: If `true`, the generated task will only be printed in the logs. If `false`, it will update `docs/ai-loop/NEXT_TASK.md`.
   - `task_source`: Roadmap or issue reference (default: `docs`).

### Locally

You can run the controller script directly from the root of the repository:

```bash
./scripts/ai-loop/generate-next-task.sh <iterations> <mode> <dry_run> <task_source>
```

Example:
```bash
./scripts/ai-loop/generate-next-task.sh 1 docs-only true docs
```

## Files

- `AI_AGENT_LOOP_DESIGN.md`: High-level design of the AI loop.
- `NEXT_TASK.md`: The generated task for the AI Worker.
- `AI_STATE.example.json`: Example state file for the loop.
- `PROMPT_TEMPLATE.md`: Template for worker prompts.
- `../../scripts/ai-loop/generate-next-task.sh`: The controller implementation.

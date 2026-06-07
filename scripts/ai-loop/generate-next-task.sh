#!/bin/bash
# Minimal deterministic controller script for Phase 1.5a
# This script generates a NEXT_TASK.md for the next phase (1.5b)

set -e

ITERATIONS="${1:-1}"
MODE="${2:-docs-only}"
DRY_RUN="${3:-true}"
TASK_SOURCE="${4:-docs}"

echo "Executing AI Loop Controller (Phase 1.5a)"
echo "Inputs: iterations=$ITERATIONS, mode=$MODE, dry_run=$DRY_RUN, task_source=$TASK_SOURCE"

# Fixed template for Phase 1.5b
NEXT_TASK_CONTENT=$(cat <<EOM
# NEXT TASK: Phase 1.5b - Anthropic Claude API Integration

## Objective
Implement Phase 1.5b AI loop controller by integrating Anthropic Claude API to generate tasks dynamically.

## Allowed files
- docs/ai-loop/**
- .github/workflows/ai-loop-controller.yml
- scripts/ai-loop/**

## Forbidden files
- src/**
- functions/src/**
- All other product code and secrets.

## Acceptance criteria
- The controller script (\`scripts/ai-loop/generate-next-task.sh\` or a new one) uses Anthropic Claude API.
- It reads context from \`docs/ai-loop/AI_STATE.json\` and \`docs/PRODUCT_ROADMAP.md\`.
- It generates a bounded task (1 PR size) into \`docs/ai-loop/NEXT_TASK.md\`.
- It handles API errors gracefully and stops the loop.

## Required test commands
- \`npm run guard:hygiene\`
- Execution of the updated controller with \`dry_run=true\`.

## Stop conditions
- Anthropic Claude API authentication failure.
- Insufficient context in roadmap to determine next task.

## Worker prompt
You are a Controller Agent. Your task is to implement Phase 1.5b.
Please update the controller automation to use Anthropic Claude API for dynamic task generation.
Refer to \`docs/ai-loop/AI_AGENT_LOOP_DESIGN.md\` for the intended flow.
EOM
)

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "--- DRY RUN: Generated NEXT_TASK content ---"
  echo "$NEXT_TASK_CONTENT"
  echo "--------------------------------------------"
else
  mkdir -p docs/ai-loop
  echo "$NEXT_TASK_CONTENT" > docs/ai-loop/NEXT_TASK.md
  echo "Successfully updated docs/ai-loop/NEXT_TASK.md"
fi

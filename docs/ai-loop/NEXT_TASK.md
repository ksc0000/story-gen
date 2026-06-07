# NEXT TASK: Phase 1.5b - OpenAI API Integration

## Objective
Implement Phase 1.5b AI loop controller by integrating OpenAI API to generate tasks dynamically.

## Allowed files
- docs/ai-loop/**
- .github/workflows/ai-loop-controller.yml
- scripts/ai-loop/**

## Forbidden files
- src/**
- functions/src/**
- All other product code and secrets.

## Acceptance criteria
- The controller script (`scripts/ai-loop/generate-next-task.sh` or a new one) uses OpenAI API.
- It reads context from `docs/ai-loop/AI_STATE.json` and `docs/PRODUCT_ROADMAP.md`.
- It generates a bounded task (1 PR size) into `docs/ai-loop/NEXT_TASK.md`.
- It handles API errors gracefully and stops the loop.

## Required test commands
- `npm run guard:hygiene`
- Execution of the updated controller with `dry_run=true`.

## Stop conditions
- OpenAI API authentication failure.
- Insufficient context in roadmap to determine next task.

## Worker prompt
You are a Controller Agent. Your task is to implement Phase 1.5b.
Please update the controller automation to use OpenAI API for dynamic task generation.
Refer to `docs/ai-loop/AI_AGENT_LOOP_DESIGN.md` for the intended flow.

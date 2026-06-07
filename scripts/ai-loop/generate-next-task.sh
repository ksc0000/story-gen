#!/usr/bin/env bash
# AI Loop Controller: Dynamic Task Generation via Anthropic Claude API
set -e

ITERATIONS="${1:-1}"
MODE="${2:-docs-only}"
DRY_RUN="${3:-true}"
TASK_SOURCE="${4:-docs}"

ROADMAP_PATH="docs/PRODUCT_ROADMAP.md"
STATE_PATH="docs/ai-loop/AI_STATE.json"
TEMPLATE_PATH="docs/ai-loop/PROMPT_TEMPLATE.md"
NEXT_TASK_PATH="docs/ai-loop/NEXT_TASK.md"

echo "Executing AI Loop Controller (Phase 1.5b)"
echo "Inputs: iterations=$ITERATIONS, mode=$MODE, dry_run=$DRY_RUN, task_source=$TASK_SOURCE"

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY is not set."
  exit 1
fi

# 1. Validate files exist
if [ ! -f "$ROADMAP_PATH" ]; then echo "Error: Roadmap not found at $ROADMAP_PATH"; exit 1; fi
if [ ! -f "$STATE_PATH" ]; then echo "Error: State not found at $STATE_PATH"; exit 1; fi
if [ ! -f "$TEMPLATE_PATH" ]; then echo "Error: Template not found at $TEMPLATE_PATH"; exit 1; fi

# 2. Construct the payload using jq with --rawfile to safely read and escape file contents
SYSTEM_PROMPT="You are an AI Loop Controller. Your goal is to read the product roadmap and current state, then generate exactly one bounded task for a worker agent. The output must be a Markdown document that will be saved to docs/ai-loop/NEXT_TASK.md. Follow the structure of the provided template exactly."

PAYLOAD=$(jq -n \
  --arg model "claude-3-5-haiku-20241022" \
  --arg system "$SYSTEM_PROMPT" \
  --rawfile roadmap "$ROADMAP_PATH" \
  --rawfile state "$STATE_PATH" \
  --rawfile template "$TEMPLATE_PATH" \
  --arg mode "$MODE" \
  --arg task_source "$TASK_SOURCE" \
  '{
    model: $model,
    system: $system,
    messages: [{
      role: "user",
      content: ("Please generate the next task for the AI Loop.\n\n### Current Roadmap\n" + $roadmap + "\n\n### Current State\n" + $state + "\n\n### NEXT_TASK.md Template\n" + $template + "\n\n### Execution Context\n- Mode: " + $mode + "\n- Task Source: " + $task_source + "\n- Objective: Determine the single most appropriate next step based on the roadmap and current state.\n\n### Requirements for NEXT_TASK.md\n- Use Markdown format.\n- Objective must be clear and bounded (1 PR size).\n- List Allowed and Forbidden files explicitly.\n- Include Acceptance criteria and Required test commands.\n- The \"Worker prompt\" section should contain the detailed instructions for the worker agent.")
    }],
    max_tokens: 4096
  }')

# 3. Call Anthropic API
echo "Calling Anthropic API (claude-3-5-haiku-20241022)..."

RESPONSE_FILE=$(mktemp)
HTTP_RESPONSE=$(curl -s -w "%{http_code}" -o "$RESPONSE_FILE" https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$PAYLOAD")

if [ "$HTTP_RESPONSE" -ne 200 ]; then
  echo "Error: API call failed with HTTP status $HTTP_RESPONSE"
  cat "$RESPONSE_FILE"
  rm -f "$RESPONSE_FILE"
  exit 1
fi

# 4. Extract content
NEXT_TASK_CONTENT=$(jq -r '.content[0].text' "$RESPONSE_FILE")
rm -f "$RESPONSE_FILE"

if [ -z "$NEXT_TASK_CONTENT" ] || [ "$NEXT_TASK_CONTENT" == "null" ]; then
  echo "Error: Failed to extract content from API response."
  exit 1
fi

# 5. Output
if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "--- DRY RUN: Generated NEXT_TASK content ---"
  echo "$NEXT_TASK_CONTENT"
  echo "--------------------------------------------"
else
  echo "$NEXT_TASK_CONTENT" > "$NEXT_TASK_PATH"
  echo "Successfully updated $NEXT_TASK_PATH"
fi

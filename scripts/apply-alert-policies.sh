#!/bin/bash

# scripts/apply-alert-policies.sh
#
# Aggregated script to update and enable 13 SJ/IM alert policies in Cloud Monitoring
# using the YAML configurations in scripts/alert-policies/.
#
# Run this manually by a human operator with authenticated gcloud CLI.
#
# Based on docs/P2_SJ_IM_ALERT_POLICIES.md (2026-06-09)

PROJECT_ID="story-gen-8a769"
POLICY_DIR="scripts/alert-policies"

echo "Applying tuned configurations to 13 SJ/IM alert policies for $PROJECT_ID..."

# Function to update a policy
update_policy() {
  local alert_id=$1
  local policy_resource=$2
  local yaml_file="$POLICY_DIR/${alert_id,,}.yaml"

  if [ -f "$yaml_file" ]; then
    echo "Updating $alert_id ($policy_resource)..."
    gcloud alpha monitoring policies update "$policy_resource" \
      --policy-from-file="$yaml_file" \
      --project="$PROJECT_ID"
  else
    echo "Error: Configuration file $yaml_file not found."
  fi
}

# SJ-1
update_policy "SJ-1" "projects/$PROJECT_ID/alertPolicies/2513526464198067799"

# SJ-2
update_policy "SJ-2" "projects/$PROJECT_ID/alertPolicies/4893251868647628500"

# SJ-3
update_policy "SJ-3" "projects/$PROJECT_ID/alertPolicies/14364886655881563701"

# SJ-4
update_policy "SJ-4" "projects/$PROJECT_ID/alertPolicies/10504437645741432748"

# IM-1
update_policy "IM-1" "projects/$PROJECT_ID/alertPolicies/6672566375930316929"

# IM-2
update_policy "IM-2" "projects/$PROJECT_ID/alertPolicies/4601285944978493813"

# IM-3
update_policy "IM-3" "projects/$PROJECT_ID/alertPolicies/10504437645741432726"

# IM-4
update_policy "IM-4" "projects/$PROJECT_ID/alertPolicies/17509905302009062853"

# IM-5
update_policy "IM-5" "projects/$PROJECT_ID/alertPolicies/17901603525203439569"

# IM-6
update_policy "IM-6" "projects/$PROJECT_ID/alertPolicies/17901603525203439157"

# IM-7
update_policy "IM-7" "projects/$PROJECT_ID/alertPolicies/10504437645741431479"

# IM-8
update_policy "IM-8" "projects/$PROJECT_ID/alertPolicies/10504437645741432289"

# IM-9
update_policy "IM-9" "projects/$PROJECT_ID/alertPolicies/17901603525203436195"

echo "Policy update commands sent."

# Verify status
echo "Current status of generation alert policies:"
gcloud monitoring policies list --project="$PROJECT_ID" \
  --filter="displayName:SJ- OR displayName:IM-" \
  --format="table(displayName,enabled)"

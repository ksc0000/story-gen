#!/bin/bash
set -e

# scripts/apply-alert-policies.sh
#
# Enables and tunes 13 SJ/IM alert policies using stored policy IDs and YAML configs.
#
# Usage:
#   chmod +x scripts/apply-alert-policies.sh
#   ./scripts/apply-alert-policies.sh

PROJECT_ID="story-gen-8a769"

echo "Applying 13 SJ/IM alert policies to project $PROJECT_ID..."

# SJ-1
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/2513526464198067799 \
  --policy-from-file=scripts/alert-policies/sj-1.yaml --project=$PROJECT_ID --enabled

# SJ-2
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/4893251868647628500 \
  --policy-from-file=scripts/alert-policies/sj-2.yaml --project=$PROJECT_ID --enabled

# SJ-3
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/14364886655881563701 \
  --policy-from-file=scripts/alert-policies/sj-3.yaml --project=$PROJECT_ID --enabled

# SJ-4
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/10504437645741432748 \
  --policy-from-file=scripts/alert-policies/sj-4.yaml --project=$PROJECT_ID --enabled

# IM-1
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/6672566375930316929 \
  --policy-from-file=scripts/alert-policies/im-1.yaml --project=$PROJECT_ID --enabled

# IM-2
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/4601285944978493813 \
  --policy-from-file=scripts/alert-policies/im-2.yaml --project=$PROJECT_ID --enabled

# IM-3
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/10504437645741432726 \
  --policy-from-file=scripts/alert-policies/im-3.yaml --project=$PROJECT_ID --enabled

# IM-4
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/17509905302009062853 \
  --policy-from-file=scripts/alert-policies/im-4.yaml --project=$PROJECT_ID --enabled

# IM-5
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/17901603525203439569 \
  --policy-from-file=scripts/alert-policies/im-5.yaml --project=$PROJECT_ID --enabled

# IM-6
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/17901603525203439157 \
  --policy-from-file=scripts/alert-policies/im-6.yaml --project=$PROJECT_ID --enabled

# IM-7
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/10504437645741431479 \
  --policy-from-file=scripts/alert-policies/im-7.yaml --project=$PROJECT_ID --enabled

# IM-8
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/10504437645741432289 \
  --policy-from-file=scripts/alert-policies/im-8.yaml --project=$PROJECT_ID --enabled

# IM-9
gcloud alpha monitoring policies update projects/$PROJECT_ID/alertPolicies/17901603525203436195 \
  --policy-from-file=scripts/alert-policies/im-9.yaml --project=$PROJECT_ID --enabled

echo "Done. All 13 policies applied and enabled."

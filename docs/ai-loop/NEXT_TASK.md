# Implement Provider Cost Comparison Dashboard in Admin UI

## Context

The roadmap explicitly lists "provider 比較・A/B テスト" and "provider コスト比較ダッシュボード（`imageModel` フィールド活用）" as unimplemented or tracking tasks. With multiple image generation providers (Replicate, OpenAI) and various models (`flux-2-pro`, `flux-kontext-max`, `klein_fast`, `pro_consistent`, `openai_image_candidate`, etc.) now integrated and in use (as per recent PRs like PR #375, PR #378), understanding and comparing their estimated costs is crucial for cost optimization, performance analysis, and future A/B testing decisions. The `imageModel` and `imageProvider` fields are already being saved in `book_outcome` and `book_runs` documents, providing the necessary data foundation.

## Objective

Create a new panel within the existing Admin UI that displays estimated image generation costs broken down by `imageProvider` and `imageModel`. This dashboard should provide actionable insights into the cost implications of different image generation configurations.

## Allowed Scope

-   `web/`: For adding new Admin UI components, data fetching logic, and dashboard panel integration. This will likely involve creating a new component under `web/src/components/admin/` or extending an existing dashboard.
-   `functions/`: If server-side aggregation or a dedicated API endpoint is deemed necessary for efficient data retrieval for the dashboard.
-   `shared/`: For defining any new types or interfaces used in data aggregation or display.
-   `docs/`: For updating the roadmap or adding a small design note if significant architectural decisions are made.
-   `firebase/firestore.rules`: If new read permissions are required for the Admin UI to access aggregated cost data (unlikely for existing collections).

## Forbidden Scope

-   Infrastructure changes (beyond minimal Firestore rule adjustments if necessary).
-   Direct integration with external billing APIs (focus on *estimated* costs based on internal generation parameters and predefined rates).
-   Core authentication/authorization redesign.
-   Secrets management changes.
-   Modification of generated assets.
-   Changes to the image generation logic itself.

## Requirements

-   **Admin UI Integration:** The new panel must be seamlessly integrated into the existing Admin dashboard (e.g., under `/admin/dashboard`).
-   **Cost Breakdown:** Display estimated image generation costs broken down by `imageProvider` and `imageModel`.
-   **Key Metrics:**
    

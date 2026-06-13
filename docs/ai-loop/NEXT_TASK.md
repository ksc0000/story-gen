# Implement User-Facing Regeneration Flow for Partially Failed Pages

## Context

The product roadmap explicitly states under "MVP販売開始の候補基準" that `partial_completed` books are acceptable, but "失敗ページ再生成導線がユーザーに見える必要がある" (a user-facing regeneration flow for failed pages must be visible to the user). The backend functionality for `page image regeneration` is already implemented. This task focuses on connecting that backend capability to the frontend user experience, addressing a critical reliability and UX gap for user-generated books. This aligns with Phase 1 (Reliability First) and Phase 6 (User Experience).

## Objective

Develop the user interface and frontend logic to allow users to trigger regeneration for individual failed pages within a `partial_completed` book, improving the

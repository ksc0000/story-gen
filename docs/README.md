# docs

EhonAI / story-gen の設計メモと運用資料の入口です。

## コンテンツ設計

- [EHONAI_STORY_CREATION_CONTENT_DESIGN.md](./EHONAI_STORY_CREATION_CONTENT_DESIGN.md)
  - `fixed_template / guided_ai / original_ai` の作成モード整理
  - fixed_template のページ構成
  - 年齢別本文の拡張方針

- [EHONAI_ORIGINAL_CHARACTER_AND_EXPANSION_PLAN.md](./EHONAI_ORIGINAL_CHARACTER_AND_EXPANSION_PLAN.md)
  - オリジナル相棒キャラクター機能の拡張案
  - `users/{userId}/children/{childId}` と `users/{userId}/originalCharacters/{characterId}` を前提にした設計

## そのほかの資料

- [admin-claim-bootstrap.md](./admin-claim-bootstrap.md)
- [image-model-policy.md](./image-model-policy.md)
- [security-roadmap.md](./security-roadmap.md)
- [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## 運用メモ

- Firestore Security Rules を変更した場合は、Hosting / Functions とは別に rules の deploy が必要です。
- 例:
  - `firebase deploy --only firestore:rules --project story-gen-8a769`
  - `firebase deploy --only firestore:rules,hosting,functions --project story-gen-8a769`
- 既存 Book の `createdAt` が欠けている場合は、`scripts/backfill-book-timestamps.js` で dry-run しながら補完できます。
  - 例:
    - `node scripts/backfill-book-timestamps.js --dry-run --limit=50`
    - `node scripts/backfill-book-timestamps.js --limit=50`

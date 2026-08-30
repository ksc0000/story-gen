# 共有ページOGP設計 (#697 案A: Functions SSR)

## 目的
`/share?id=<bookId>` をSNSで共有した際、絵本のタイトル・表紙がOGPカードに表示されるようにする（現状はサイト共通メタのみ）。static export制約下で最小の変更で実現する。

## 方式（案A採用）
Hosting rewrite で `/share` のみ Cloud Functions v2 `shareOgp` (asia-northeast1) に振り、
関数が**既存のSPAシェル(index.html)にOGPメタを注入して返す**。SPA本体・クライアント挙動は不変。

```
crawler/browser → hosting /share?id=X
  → rewrite → shareOgp
      → index.html をhostingから取得(5分メモリキャッシュ)
      → Firestore books/X を読む(Admin SDK)
      → public==true: タイトル/表紙でog:/twitter:メタを注入
        それ以外: 汎用メタ
      → どちらも noindex(子どもの絵本のためインデックスさせない)
  → 返却 (Cache-Control: public, max-age=60, s-maxage=300)
```

## 設計判断
- **fail-open**: Firestore/シェル取得に失敗したら無加工のシェルを返す（共有ページが死ぬより、OGPが汎用になる方がまし）
- **noindex固定**: 公開絵本でも検索インデックス不要（家族間共有が主用途、プライバシー優先）
- **s-maxage=300**: 公開停止の反映は最大5分遅延（許容。即時性が必要なら将来purge検討）
- 説明文に子どもの名前は使わない（タイトルのみ。タイトルに名前が入るのはユーザーの選択）
- id形式バリデーション（英数・-・_、40字以内）で不正クエリを弾く

## ロールバック
firebase.json の rewrite 1行を削除して hosting デプロイ（関数は残っても無害）。

## 変更ファイル
- functions/src/share-ogp.ts（onRequest v2）
- functions/src/lib/share-ogp-html.ts（純関数: エスケープ/メタ生成/注入。単体テスト対象）
- functions/src/index.ts（export追加）
- firebase.json（/share rewrite追加、catch-allより前）
- functions/test/share-ogp-html.test.ts

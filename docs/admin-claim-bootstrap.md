# 管理者ログインと admin claim 有効化

1. Firebase Auth に、管理者にしたいメールアドレスでログインします。
2. Functions の param `ADMIN_EMAILS` に、そのメールアドレスをカンマ区切りで設定します。
   例: `owner@example.com,another@example.com`
3. Functions を deploy します。
4. `/admin/login/` にアクセスします。
5. 「管理者権限を有効化」を押します。
6. 成功すると ID token を更新したあと `/admin/image-model-tests/` へ進めます。

補足:

- `ADMIN_EMAILS` に含まれないメールアドレスは管理者になれません。
- admin claim は Firebase Custom Claims を使って付与されます。
- claim 反映には新しい ID token が必要なため、画面側で `getIdToken(true)` を実行します。

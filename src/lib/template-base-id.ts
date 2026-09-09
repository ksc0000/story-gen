/**
 * ページ数バリアント（`-4p`/`-8p`/`-12p` サフィックス）を束ねる基準ID。
 * `variantOf` が明示されていればそれを使い、無ければテンプレID末尾の
 * ページ数サフィックスを除去した値を基準IDとして扱う。
 */
export function getTemplateBaseId(t: { id: string; variantOf?: string }): string {
  return t.variantOf ?? t.id.replace(/-\d+p$/, "");
}

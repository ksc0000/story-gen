# Plan Part 3: UI Component Theme Update (Tasks 10-12)

## Task 10: Button コンポーネント テーマ更新

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: button.tsx の buttonVariants を更新**

`default` variantを pill型グラデーションに、`rounded-lg` を `rounded-full` に変更。

`src/components/ui/button.tsx` の `buttonVariants` の第1引数（ベースクラス）を以下に変更:

```
"group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
```

変更点: `rounded-lg` → `rounded-full`

`variant.default` を以下に変更:
```
"bg-gradient-to-r from-purple-400 to-violet-400 text-white shadow-[0_4px_16px_rgba(167,139,250,0.4)] hover:from-purple-500 hover:to-violet-500 hover:shadow-[0_6px_20px_rgba(167,139,250,0.5)]"
```

- [ ] **Step 2: ビルド確認**

Run: `npx tsc --noEmit`
Expected: 型エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: update Button to pill shape with violet gradient"
```

---

## Task 11: Card コンポーネント テーマ更新

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Card のベースクラスを更新**

`src/components/ui/card.tsx` の `Card` コンポーネントの className を変更:

```
"group/card flex flex-col gap-4 overflow-hidden rounded-[20px] bg-card py-4 text-sm text-card-foreground shadow-[0_4px_20px_rgba(167,139,250,0.1)] border border-[rgba(240,171,252,0.3)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[20px] *:[img:last-child]:rounded-b-[20px]"
```

変更点:
- `rounded-xl` → `rounded-[20px]`
- `ring-1 ring-foreground/10` → `shadow-[0_4px_20px_rgba(167,139,250,0.1)] border border-[rgba(240,171,252,0.3)]`
- img角丸も `rounded-t-xl` → `rounded-t-[20px]`

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: update Card to 20px rounded corners with pastel soft shadow"
```

---

## Task 12: Badge コンポーネント テーマ更新

**Files:**
- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: badge.tsx の variant.default を更新**

`variant.default` を以下に変更:
```
"bg-[rgba(167,139,250,0.1)] text-[#7c3aed] border border-[rgba(167,139,250,0.2)] [a]:hover:bg-[rgba(167,139,250,0.2)]"
```

`variant.outline` を以下に変更:
```
"border-[rgba(167,139,250,0.3)] text-[#7c3aed] [a]:hover:bg-[rgba(167,139,250,0.1)]"
```

`variant.secondary` を以下に変更:
```
"bg-[rgba(103,232,249,0.1)] text-[#0891b2] [a]:hover:bg-[rgba(103,232,249,0.2)]"
```

`variant.destructive` を以下に変更:
```
"bg-red-50 text-red-500 border border-red-200 [a]:hover:bg-red-100"
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat: update Badge variants to pastel dream colors"
```

import { test, expect } from '@playwright/test';

test('verify single purchase section on pricing page', async ({ page }) => {
  // Set demo mode and dummy keys
  await page.addInitScript(() => {
    (window as any).NEXT_PUBLIC_EHORIA_DEMO_MODE = 'true';
    (window as any).NEXT_PUBLIC_FIREBASE_API_KEY = 'dummy-key';
    (window as any).NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy-project';
  });

  await page.goto('http://localhost:3000/pricing');

  // Wait for the page to load
  await page.waitForSelector('text=プラン選択');

  // Scroll down to the single purchase section
  const singlePurchaseHeader = page.locator('text=特別な1冊（単品購入）');
  await singlePurchaseHeader.scrollIntoViewIfNeeded();

  // Wait a bit for animations
  await page.waitForTimeout(500);

  // Take a screenshot of the single purchase section
  await page.screenshot({ path: '/home/jules/verification/pricing-single-purchase-scrolled.png' });

  // Verify elements exist
  await expect(page.locator('text=月間枠を使い切っても、追加で1冊から作成できます')).toBeVisible();
  await expect(page.locator('text=AIガイド・通常プラン')).toBeVisible();
  await expect(page.locator('text=Photo Storyプラン')).toBeVisible();
  await expect(page.locator('text=¥1,500 / 冊')).toBeVisible();
  await expect(page.locator('text=¥2,000 / 冊')).toBeVisible();
});


import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use a larger viewport to see more content
        page = await browser.new_page(viewport={'width': 1280, 'height': 2000})

        # Navigate to the admin quality review page
        # In demo mode, it should load demo data
        print("Navigating to Admin Quality Review page...")
        await page.goto("http://localhost:3000/admin/book-quality-review")

        # Wait for the page to load
        await page.wait_for_selector("text=Book 品質レビュー")
        await page.screenshot(path="initial_load_v2.png", full_page=True)

        # Select the first demo book
        print("Selecting demo book...")
        await page.click("text=Demo Book (Premium)")

        # Wait for the book details to load
        await page.wait_for_selector("text=demo-book-1")

        # Scroll down to see recommendations
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2) # Wait for potential animations

        await page.screenshot(path="book_selected_v2.png", full_page=True)

        # Check if "推奨アクション" is visible
        try:
            print("Checking for recommendations...")
            recommendation_header = page.locator("text=推奨アクション")
            await recommendation_header.wait_for(timeout=5000)
            print("Recommendations found!")

            # Click on the recommendation to see the draft panel
            # It should be "承認を確認" for the demo book
            print("Clicking on '承認を確認'...")
            await page.click("text=承認を確認")

            await asyncio.sleep(1)
            await page.screenshot(path="recommendation_selected.png", full_page=True)

            # Check for the "アクションを実行" button
            print("Checking for 'アクションを実行' button...")
            execute_button = page.locator("button:has-text('アクションを実行')")
            await execute_button.wait_for(timeout=5000)
            print("'アクションを実行' button found!")

            # Verify the approval specific content
            await page.wait_for_selector("text=品質スコアが基準（4.0）を超えています")
            print("Approval checklist found!")

        except Exception as e:
            print(f"Error during verification: {e}")
            # Take a screenshot of what we see
            await page.screenshot(path="verification_error.png", full_page=True)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

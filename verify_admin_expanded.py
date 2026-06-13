import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Set viewport to be large enough
        page = await browser.new_page(viewport={'width': 1280, 'height': 2000})

        # Navigate to the admin page
        # Assuming the dev server is running on localhost:3000
        # And demo mode is active
        try:
            await page.goto('http://localhost:3000/admin/book-quality-review/', wait_until='networkidle')

            # Wait for the "Books" list to load (demo mode should provide dummy data)
            await page.wait_for_selector('text=Books', timeout=10000)

            # Click on the first book if available
            books = await page.query_selector_all('button.text-left')
            if books:
                await books[0].click()
                await page.wait_for_timeout(1000) # Wait for details to load

            # Find the Quality Review Panel
            await page.wait_for_selector('text=Quality Review (Phase 2)', timeout=5000)

            # Expand "Story Score"
            story_button = await page.get_by_role("button", name="Story Score").first
            if story_button:
                await story_button.click()
                await page.wait_for_timeout(500)

            # Take screenshot of the panel area
            panel = await page.query_selector('text=Quality Review (Phase 2)')
            if panel:
                # Get the parent card
                card = await page.evaluate_handle('el => el.closest(".rounded-xl") || el.closest(".border")', panel)
                if card:
                   # Need to find the actual container card for QualityReviewPanel
                   # It's likely a div/section containing "Quality Review (Phase 2)"
                   pass

            # Just take a full page screenshot of the relevant area
            await page.screenshot(path='/home/jules/verification/admin_expanded.png', full_page=False)
            print("Screenshot saved to /home/jules/verification/admin_expanded.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path='/home/jules/verification/admin_error.png')

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

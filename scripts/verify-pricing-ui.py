from playwright.sync_api import Page, expect, sync_playwright

def verify_single_purchase_ui(page: Page):
    # Set demo mode and dummy keys via cookie or local storage if possible,
    # but init script is most reliable for Next.js env vars handled in-browser
    page.add_init_script("""
        window.NEXT_PUBLIC_EHORIA_DEMO_MODE = 'true';
        window.NEXT_PUBLIC_FIREBASE_API_KEY = 'dummy-key';
        window.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy-project';
    """)

    # 1. Go to the pricing page
    page.goto("http://localhost:3005/pricing/")

    # 2. Wait for the page to load
    page.wait_for_selector("text=プラン選択")

    # 3. Take a full page screenshot to see what's rendered
    page.wait_for_timeout(2000)
    page.screenshot(path="/home/jules/verification/pricing-debug.png", full_page=True)

    # 4. Try to find the section
    single_purchase_header = page.get_by_text("特別な1冊（単品購入）")
    expect(single_purchase_header).to_be_visible()
    single_purchase_header.scroll_into_view_if_needed()

    # 5. Take a final screenshot
    page.screenshot(path="/home/jules/verification/pricing-single-purchase-final.png")

    # 6. Assertions
    expect(page.get_by_text("月間枠を使い切っても、追加で1冊から作成できます")).to_be_visible()
    expect(page.get_by_text("AIガイド・通常プラン")).to_be_visible()
    expect(page.get_by_text("Photo Storyプラン")).to_be_visible()
    expect(page.get_by_text("¥1,500 / 冊")).to_be_visible()
    expect(page.get_by_text("¥2,000 / 冊")).to_be_visible()

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_single_purchase_ui(page)
        finally:
            browser.close()

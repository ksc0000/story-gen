import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def verify():
    # 1. Start Dev Server
    # Note: Using NEXT_PUBLIC_EHONAI_DEMO_MODE=true so we don't need real Firebase keys for UI flow
    env = os.environ.copy()
    env["NEXT_PUBLIC_EHONAI_DEMO_MODE"] = "true"
    env["NEXT_PUBLIC_FIREBASE_API_KEY"] = "Dummy"
    env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"] = "dummy.firebaseapp.com"
    env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "dummy-project"
    env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"] = "dummy.appspot.com"
    env["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"] = "123456789"
    env["NEXT_PUBLIC_FIREBASE_APP_ID"] = "1:123456789:web:abcdef"

    print("Starting dev server...")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )

    try:
        async with async_playwright() as p:
            # We need to wait for the server to be ready
            # In some environments, we might need to install browsers if they are missing
            # But let's try assuming they exist or using a light check
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={"width": 1280, "height": 800})

            # Wait for port 3000
            print("Waiting for server to respond on http://localhost:3000...")
            max_retries = 30
            for i in range(max_retries):
                try:
                    await page.goto("http://localhost:3000/login", wait_until="networkidle")
                    print("Connected to /login")
                    break
                except Exception:
                    if i == max_retries - 1:
                        raise
                    await asyncio.sleep(2)

            await page.screenshot(path="v2_login_page.png")

            # Click Google Login (Demo mode handles it)
            print("Clicking login button...")
            await page.click("button:has-text('Googleでログイン')")

            # Wait for redirection to /home
            print("Waiting for redirection to /home...")
            await page.wait_for_url("**/home", timeout=10000)
            await page.screenshot(path="v2_home_page.png")

            # Navigate to /create/theme?mode=fixed_template
            print("Navigating to theme selection...")
            await page.goto("http://localhost:3000/create/theme?mode=fixed_template", wait_until="networkidle")
            await page.screenshot(path="v2_theme_selection.png")

            # Find "ストーリーを見る" button
            # Since we updated demo.ts, 'fixed-first-zoo' should have it.
            print("Looking for 'ストーリーを見る' button...")
            # We wait specifically for the button to appear
            btn_selector = "button:has-text('ストーリーを見る')"
            try:
                await page.wait_for_selector(btn_selector, timeout=10000)
                print("Found preview button!")
                await page.click(btn_selector)

                # Wait for modal
                await asyncio.sleep(1) # wait for animation
                await page.screenshot(path="v2_modal_open.png")

                # Check for modal content
                modal_text = await page.inner_text("body")
                if "ストーリーのプレビュー" in modal_text:
                    print("SUCCESS: Modal is visible and contains expected title.")
                else:
                    print("FAILURE: Modal title not found.")
            except Exception as e:
                print(f"Error finding button or modal: {e}")
                # Log page content for debugging
                content = await page.content()
                with open("page_debug.html", "w") as f:
                    f.write(content)

            await browser.close()
    finally:
        proc.terminate()
        print("Dev server stopped.")

if __name__ == "__main__":
    asyncio.run(verify())

import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def verify():
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
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={"width": 1280, "height": 800})

            print("Waiting for server...")
            max_retries = 30
            for i in range(max_retries):
                try:
                    await page.goto("http://localhost:3000/login", wait_until="networkidle")
                    break
                except Exception:
                    await asyncio.sleep(2)

            await page.screenshot(path="v3_login.png")
            await page.click("button:has-text('Googleでログイン')")

            # Wait for some home page element instead of URL
            print("Waiting for home page content...")
            try:
                await page.wait_for_selector("text=Ehoria", timeout=10000)
                print("At home page")
            except:
                print("Home page element not found, current URL:", page.url)

            await page.screenshot(path="v3_home.png")

            print("Navigating to theme selection...")
            await page.goto("http://localhost:3000/create/theme?mode=fixed_template", wait_until="networkidle")
            await page.screenshot(path="v3_theme_selection.png")

            btn_selector = "button:has-text('ストーリーを見る')"
            print("Waiting for preview button...")
            try:
                await page.wait_for_selector(btn_selector, timeout=15000)
                print("Clicking preview button...")
                await page.click(btn_selector)

                await asyncio.sleep(2)
                await page.screenshot(path="v3_modal_open.png")

                modal_text = await page.inner_text("body")
                if "ストーリーのプレビュー" in modal_text:
                    print("SUCCESS: Modal is visible.")
                else:
                    print("FAILURE: Modal title not found in body.")
            except Exception as e:
                print(f"Error: {e}")
                await page.screenshot(path="v3_error.png")

            await browser.close()
    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(verify())

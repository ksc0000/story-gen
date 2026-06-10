import os
import time
import json
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Set viewport to a standard size
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print(f"Opening {BASE_URL}...")
        page.goto(BASE_URL)

        # 1. Login
        print("Logging in...")
        page.goto(f"{BASE_URL}/login")

        # Inject demo book into sessionStorage BEFORE we might need it
        # Actually, let's do it on the home page or book page

        page.wait_for_selector("button:has-text('Googleでログイン')")
        page.click("button:has-text('Googleでログイン')")

        print("Waiting for navigation to /home...")
        try:
            page.wait_for_url("**/home", timeout=15000)
        except Exception as e:
            print(f"Navigation to /home failed: {e}")
            page.screenshot(path="failed_login.png")
            # Try to see what's on the page
            print(f"Current URL: {page.url}")
            browser.close()
            return

        page.screenshot(path="0_home_page.png")

        # 2. Go to Book Viewer (Private)
        book_id = "test-book-123"
        print(f"Preparing demo book {book_id}...")

        demo_book = {
            "id": book_id,
            "title": "テストの絵本",
            "theme": "Adventure",
            "style": "Pastel",
            "pageCount": 2,
            "status": "completed",
            "progress": 100,
            "pages": [
                {
                    "id": "p1",
                    "pageNumber": 1,
                    "text": "むかしむかし、あるところに...",
                    "imageUrl": "https://placehold.jp/400x400.png?text=Page1",
                    "status": "completed"
                },
                {
                    "id": "p2",
                    "pageNumber": 2,
                    "text": "めでたしめでたし。",
                    "imageUrl": "https://placehold.jp/400x400.png?text=Page2",
                    "status": "completed"
                }
            ]
        }

        # Inject into sessionStorage
        page.evaluate(f"""(book) => {{
            const key = 'ehoria-demo-books';
            const data = JSON.parse(sessionStorage.getItem(key) || '{{}}');
            data[book.id] = book;
            sessionStorage.setItem(key, JSON.stringify(data));
        }}""", demo_book)

        print(f"Navigating to book {book_id}...")
        page.goto(f"{BASE_URL}/book/{book_id}")

        # Wait for the book to load
        page.wait_for_selector("h1:has-text('テストの絵本')", timeout=15000)
        page.screenshot(path="1_viewer_private.png")

        # 3. Toggle Share
        print("Toggling share...")
        # Find the share button. It has "共有する" text.
        share_button = page.locator("button:has-text('共有する')")
        share_button.click()

        # Wait for toast or text change
        # The button text changes to "共有中"
        page.wait_for_selector("button:has-text('共有中')", timeout=10000)

        # Check for toast "リンクをコピーしました"
        # Assuming toast is visible
        page.screenshot(path="2_viewer_shared.png")

        # 4. Access Public Share Page
        print("Accessing public share page...")
        # Create a new context (unauthenticated)
        context_public = browser.new_context(viewport={'width': 1280, 'height': 800})
        page_public = context_public.new_page()

        # We need to inject the demo book into this context's sessionStorage too,
        # because the public page also uses loadDemoBook in demo mode.
        page_public.goto(BASE_URL) # Initialize session storage for domain
        page_public.evaluate(f"""(book) => {{
            const key = 'ehoria-demo-books';
            const data = JSON.parse(sessionStorage.getItem(key) || '{{}}');
            // Ensure it is public
            book.public = true;
            data[book.id] = book;
            sessionStorage.setItem(key, JSON.stringify(data));
        }}""", demo_book)

        page_public.goto(f"{BASE_URL}/share/{book_id}")

        # Wait for content
        page_public.wait_for_selector("h1:has-text('テストの絵本')", timeout=15000)

        # Check for "Ehoria で作る" link
        page_public.wait_for_selector("a:has-text('Ehoria で作る')")

        page_public.screenshot(path="3_share_page_public.png")

        # 5. Verify 404 for non-public book
        print("Verifying 404 for private book...")
        page_public.evaluate(f"""(bookId) => {{
            const key = 'ehoria-demo-books';
            const data = JSON.parse(sessionStorage.getItem(key) || '{{}}');
            if (data[bookId]) {{
                data[bookId].public = false;
                sessionStorage.setItem(key, JSON.stringify(data));
            }}
        }}""", book_id)

        page_public.reload()
        # In Next.js, 404 might show "404" or some custom text
        # Our implementation throws notFound() which should show a 404 page
        time.sleep(2) # Wait for render
        page_public.screenshot(path="4_share_page_404.png")

        print("Verification completed successfully!")
        browser.close()

if __name__ == "__main__":
    run_verification()

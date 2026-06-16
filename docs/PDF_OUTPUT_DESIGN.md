# PDF Output Feature Design Document

> Status: **Draft**
> Created: 2026-06-15
> Author: Jules (AI Agent)
> Related: `docs/PRODUCT_ROADMAP.md` Phase 5 — Monetization / Phase 6 — UX

---

## 1. Overview

EhonAI provides a rich, interactive web-based reading experience. However, users often wish to keep their created stories permanently, share them outside the platform (e.g., via messaging apps), or print them at home. The **PDF Output** feature enables users to download a high-quality, formatted version of their picture book.

This feature is also a key component of the monetization strategy (Phase 5), as PDF downloads can be gated behind paid plans or offered as a per-book purchase.

---

## 2. User Problem

### Problem Statements

- **Permanence**: Users worry that if the service changes or they lose access, their personalized stories will be gone.
- **Offline Viewing**: Parents want to read stories to children in environments without stable internet (e.g., airplanes, camping).
- **Physicality**: Users want to print the books to create physical keepsakes or gifts.
- **Sharing**: Sharing a PDF file is often more intuitive for some users than sharing a web link, especially for non-tech-savvy relatives.

---

## 3. Goals / Non-goals

### Goals

- Generate a high-quality PDF that mirrors the "EhonAI" brand and layout.
- Include the Cover Page, Title Spread, and all Story Pages.
- Support Japanese typography (fonts) correctly.
- Ensure the feature is scalable and doesn't overload the frontend.
- Provide a clear UI for triggering and downloading the PDF.

### Non-goals

- **Physical Printing/Shipping**: This design covers the *digital* PDF output only. Integration with print-on-demand services is a future phase.
- **In-browser PDF Editing**: The PDF is a "snapshot" of the completed book.
- **Dynamic Content in PDF**: No animations or 3D effects (obviously).
- **Custom Layouts per PDF**: Initially, a standard "Storybook" layout will be used.

---

## 4. Architecture Options

### Option A: Client-side Generation (`react-pdf` / `jsPDF`)

- **Pros**: Zero server cost, immediate feedback.
- **Cons**: High memory usage on mobile devices, difficult to ensure font consistency (CJK fonts are large), browser compatibility issues with complex CSS.

### Option B: Server-side Generation (Puppeteer in Cloud Functions)

- **Pros**: Consistent output, high fidelity (renders exactly like the web view), handles large fonts easily, supports high-resolution assets.
- **Cons**: Server costs (CPU/RAM for Puppeteer), latency (takes a few seconds to generate).

### Decision: **Option B (Server-side with Puppeteer)**

Given the "Quality First" focus and the need for reliable Japanese font rendering, server-side generation is the superior choice. It ensures that the PDF looks identical regardless of the user's device.

---

## 5. Technical Design

### Component 1: PDF Generation Service (Cloud Function)

- **Runtime**: Node.js 20 (Firebase Functions).
- **Library**: `puppeteer` or `puppeteer-core` (with a Chromium layer).
- **Workflow**:
  1. Receive `bookId`.
  2. Authenticate the user and verify access (paid plan/credits).
  3. Launch a headless browser.
  4. Navigate to a specialized, print-optimized internal URL: `/print/book?id={bookId}&token={internal_token}`.
  5. Wait for images to load.
  6. Call `page.pdf()` with specific dimensions (e.g., A4 or Square).
  7. Upload the resulting buffer to Firebase Storage: `/books/{bookId}/outputs/book.pdf`.
  8. Return the signed URL or update the Book document with the PDF path.

### Component 2: Print-optimized Web View

- A hidden or internal-only route in the Next.js app (`src/app/(app)/print/book/page.tsx`).
- Uses the same components as `BookViewer` but in a "flat" vertical or per-page layout optimized for `@media print`.
- Removes UI elements like buttons, navigation, and background gradients that shouldn't be in the PDF.

### Component 3: Storage & Security

- PDFs are stored in Cloud Storage under `/books/{bookId}/outputs/`.
- Security rules ensure only the book owner (or admin) can access the PDF.
- Use Signed URLs with short expiration for the actual download.

---

## 6. Data Flow

1. **User Action**: Clicks "Download PDF" on the Book Detail page.
2. **Request**: Call `generateBookPdf({ bookId })` (HTTPS Callable).
3. **Validation**: Function checks `books/{bookId}` status and user's `productPlan`.
4. **Locking**: Set `pdfStatus: "processing"` on the Book document to prevent duplicate requests.
5. **Generation**:
   - Puppeteer renders the book.
   - PDF is generated and uploaded to Storage.
6. **Completion**: Update Book document with `pdfUrl`, `pdfGeneratedAt`, and set `pdfStatus: "completed"`.
7. **Notification**: Frontend (listening via `onSnapshot`) detects the change and shows the "Download" link.

---

## 7. UI/UX Integration

### Book Detail Page (`src/app/(app)/book/page.tsx`)

- Add a "Download PDF" button in the `BookNextActions` or near the "Share" button.
- Show a loading state (e.g., "Preparing your PDF... this may take a minute") while `pdfStatus === "processing"`.
- Once ready, provide a prominent "Download PDF" button.

### Bookshelf Page (`src/app/(app)/bookshelf/page.tsx`)

- Add a small PDF icon/action on each book card that has a generated PDF.

---

## 8. Monetization & Gating

- **Free Plan**: PDF download is disabled or shows a "Upgrade to Download" watermark.
- **Standard/Premium Paid**: PDF download included.
- **Single Purchase**: Users who bought a specific book can download its PDF.

Logic should be implemented in the Cloud Function to prevent unauthorized generation.

---

## 9. Implementation Phases

### Phase 1: Foundation (Internal)
- Create the `/print/book` route.
- Implement a basic Puppeteer script locally.
- Handle Japanese fonts (Noto Sans JP) in the Puppeteer environment.

### Phase 2: Cloud Function & Storage
- Deploy the `generateBookPdf` function.
- Integrate with Cloud Storage.
- Implement security rules for the `outputs` directory.

### Phase 3: Frontend Integration
- Add the "Download PDF" button to the UI.
- Handle the asynchronous generation state.
- Analytics tracking for PDF downloads.

---

## 10. Acceptance Criteria

- [ ] A PDF can be generated for a completed book.
- [ ] The PDF includes the Cover, Title Spread, and all Story Pages in order.
- [ ] Japanese text is rendered correctly without "tofu" (missing glyphs).
- [ ] Images are high-resolution (or the best available).
- [ ] Unauthorized users cannot trigger PDF generation.
- [ ] The PDF file size is reasonable (e.g., < 20MB for 12 pages).

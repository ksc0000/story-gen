import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import puppeteer from "puppeteer";
import { BookData, PageData, PdfStatus } from "./lib/types";
import { randomUUID } from "crypto";

/**
 * Core logic for generating a book PDF.
 */
export async function processGenerateBookPdf(
  bookId: string,
  auth: { uid: string },
  db: admin.firestore.Firestore,
  storage: admin.storage.Storage
) {
  const uid = auth.uid;
  const bookRef = db.collection("books").doc(bookId);
  const bookSnap = await bookRef.get();

  if (!bookSnap.exists) {
    throw new HttpsError("not-found", "指定された絵本が見つかりません");
  }

  const bookData = bookSnap.data() as BookData;
  if (bookData.userId !== uid) {
    throw new HttpsError("permission-denied", "この絵本のPDFを作成する権限がありません");
  }

  // Prevent multiple concurrent PDF generation tasks
  if (bookData.pdfStatus === "processing") {
      throw new HttpsError("already-exists", "現在PDFを作成中です。しばらくお待ちください。");
  }

  // Plan Check: PDF is restricted to Standard/Premium plans or single purchases.
  const isPremium = bookData.productPlan === "standard_paid" || bookData.productPlan === "premium_paid";
  const isSinglePurchase = bookData.isSinglePurchase === true;

  if (!isPremium && !isSinglePurchase) {
      throw new HttpsError("permission-denied", "PDFのダウンロードは有料プランまたは単品購入限定の機能です");
  }

  // Status Check: Book must be completed or partially completed.
  if (bookData.status !== "completed" && bookData.status !== "partial_completed") {
      throw new HttpsError("failed-precondition", "絵本の生成が完了してからPDFを作成してください");
  }

  // Update status to processing to prevent duplicate requests
  await bookRef.update({
      pdfStatus: "processing" as PdfStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
      const pagesSnap = await bookRef.collection("pages").orderBy("pageNumber").get();
      const pages = pagesSnap.docs.map(doc => doc.data() as PageData);

      // Generate HTML content for the PDF
      const htmlContent = generateSimpleHtml(bookData, pages);

      // PDF Generation using Puppeteer
      const pdfBuffer = await generatePdfFromHtml(htmlContent);

      // Upload the PDF to Firebase Storage (using project default bucket)
      const bucket = storage.bucket();
      const filename = `books/${bookId}/outputs/book.pdf`;
      const file = bucket.file(filename);
      const downloadToken = randomUUID();

      await file.save(pdfBuffer, {
          contentType: "application/pdf",
          metadata: {
              metadata: {
                  firebaseStorageDownloadTokens: downloadToken,
              },
          },
      });

      const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;

      // Update Firestore with the completed status and URL
      await bookRef.update({
          pdfStatus: "completed" as PdfStatus,
          pdfUrl,
          pdfGeneratedAtMs: Date.now(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, pdfUrl };
  } catch (err) {
      logger.error(`Error generating PDF for ${bookId}:`, err);

      // Update Firestore with the failed status
      await bookRef.update({
          pdfStatus: "failed" as PdfStatus,
          pdfError: err instanceof Error ? err.message : String(err),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new HttpsError("internal", "PDFの生成中にエラーが発生しました");
  }
}

/**
 * Basic HTML escaping to prevent XSS and layout breakage.
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Generates a simple HTML structure for the book.
 * This is an initial implementation with basic styling.
 */
function generateSimpleHtml(book: BookData, pages: PageData[]): string {
    const pagesHtml = pages.map(page => `
        <div class="page">
            <img src="${page.imageUrl}" />
            <div class="text-container">
                <p>${escapeHtml(page.text).replace(/\n/g, '<br>')}</p>
            </div>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Noto Sans JP', sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: white;
                }
                .cover {
                    text-align: center;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .cover img {
                    max-width: 80%;
                    max-height: 70%;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .page {
                    page-break-after: always;
                    padding: 40px;
                    text-align: center;
                    height: 100vh;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .page img {
                    max-width: 100%;
                    max-height: 70%;
                    object-fit: contain;
                    margin-bottom: 30px;
                    border-radius: 4px;
                }
                .text-container {
                    max-width: 80%;
                }
                p {
                    font-size: 20px;
                    line-height: 1.8;
                    color: #333;
                    word-wrap: break-word;
                }
                h1 {
                    font-size: 36px;
                    margin-bottom: 40px;
                    color: #1a1a1a;
                }
            </style>
        </head>
        <body>
            <div class="cover">
                <h1>${escapeHtml(book.title)}</h1>
                ${book.coverImageUrl ? `<img src="${book.coverImageUrl}" />` : ''}
            </div>
            ${pagesHtml}
        </body>
        </html>
    `;
}

/**
 * Uses Puppeteer to render HTML and generate a PDF buffer.
 */
async function generatePdfFromHtml(html: string): Promise<Buffer> {
    // Launch headless browser with args required for many containerized environments
    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none',
        ],
        headless: 'new' as any, // Recommended for newer versions of Puppeteer 22+
    });

    try {
        const page = await browser.newPage();

        // Set viewport for better rendering
        await page.setViewport({ width: 1200, height: 1600 });

        // Set content and wait for images and fonts to load
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'load', 'domcontentloaded']
        });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' }
        });

        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

/**
 * Callable function to generate a book PDF.
 */
export const generateBookPdf = onCall(
    {
        region: "asia-northeast1",
        memory: "2GiB", // Puppeteer requires substantial memory
        timeoutSeconds: 300,
        consumeAppCheckToken: true,
    },
    async (request) => {
        // Authentication Check
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "ログインが必要です");
        }

        const { bookId } = request.data as { bookId: string };
        if (!bookId || typeof bookId !== "string") {
            throw new HttpsError("invalid-argument", "bookId is required and must be a string");
        }

        const db = admin.firestore();
        const storage = admin.storage();

        return processGenerateBookPdf(bookId, request.auth, db, storage);
    }
);

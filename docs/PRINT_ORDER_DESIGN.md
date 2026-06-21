# Print Order Feature Design Document

> Status: **Draft**
> Created: 2026-06-20
> Author: Jules (AI Agent)
> Related: `docs/PRODUCT_ROADMAP.md` Phase 5 — Monetization / `docs/PDF_OUTPUT_DESIGN.md`

---

## 1. Overview

The **Print Order** feature allows users to transform their AI-generated digital stories into high-quality physical picture books. This represents a major milestone in the EhonAI roadmap, moving from a digital-only service to a provider of physical keepsakes and gifts.

---

## 2. User Problem & Value Proposition

### Problem Statements
- **Digital Fatigue**: Parents often prefer physical books over screens for bedtime reading to reduce blue light exposure.
- **Gifting**: It is difficult to give a digital-only book as a meaningful gift for birthdays or holidays.
- **Longevity**: Physical books don't require a device or internet and can be kept on a shelf for years.

### Value Proposition
- **High-Quality Physicality**: Professional-grade binding and paper.
- **Emotional Connection**: Seeing the child's own character in a "real" book enhances the magic.
- **Effortless Fulfillment**: Seamless transition from digital creation to home delivery.

---

## 3. User Flow

1.  **Book Completion**: The user completes their book generation (Standard or Premium plan).
2.  **Order Initiation**: From the Book Viewer or Bookshelf, the user clicks "Order Physical Copy".
3.  **Customization (Optional)**: User selects book type (e.g., Softcover vs. Hardcover) and quantity.
4.  **Checkout**:
    - User enters shipping details.
    - Payment is processed via Stripe (handling tax and shipping costs).
5.  **Print Asset Preparation**:
    - System triggers a high-resolution background process.
    - Images are upscaled (if necessary) to 300 DPI.
    - A print-ready PDF with bleed and trim markers is generated.
6.  **Fulfillment**:
    - The order and PDF are sent to a Print-on-Demand (POD) partner via API.
7.  **Order Tracking**:
    - The user receives status updates (Printing, Shipped, Delivered) within the EhonAI app.
8.  **Delivery**: The physical book arrives at the user's doorstep.

---

## 4. Technical Design

### 4.1 Print-Ready Requirements
Physical printing has stricter requirements than screen display:
- **DPI (Dots Per Inch)**: Minimum 300 DPI for crisp illustrations.
  - *Challenge*: 1024x1024 source images are only ~3.4 inches at 300 DPI.
  - *Solution*: Use AI upscaling (e.g., Real-ESRGAN or similar via Replicate) to reach at least 2400x2400 for standard square formats.
- **Bleed & Trim**: Add a 3mm (approx. 35px at 300 DPI) "bleed" area around all edges to prevent white borders after cutting.
- **Safe Zone**: Keep all text and critical visual elements (like faces) at least 10mm from the edge.
- **Color Space**: Convert RGB (web) to CMYK (print). This is often handled by POD APIs if high-quality RGB PDFs are provided.

### 4.2 Data Schema

#### `printOrders` Collection
```typescript
interface PrintOrder {
  id: string;
  userId: string;
  bookId: string;
  status: "pending_payment" | "paid" | "preparing_assets" | "sent_to_printer" | "printing" | "shipped" | "delivered" | "cancelled";

  // Fulfillment Details
  podPartner: "gelato" | "lulu" | "prodigi"; // Example partners
  podOrderId?: string;
  trackingNumber?: string;
  carrier?: string;

  // Pricing
  amountTotal: number;
  currency: string;
  stripeSessionId: string;

  // Assets
  printPdfUrl?: string; // High-res PDF in Storage

  // Shipping (Snapshotted from Stripe)
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.3 Architecture

1.  **Asset Worker**: A Cloud Function (v2) that handles image upscaling and PDF composition. It uses `canvas` or a headless browser with higher resolution settings than the standard PDF export.
2.  **Stripe Webhooks**: Listen for `checkout.session.completed` to trigger the fulfillment flow.
3.  **POD Integration Layer**: An abstraction layer to communicate with fulfillment partners. This allows switching partners based on region (e.g., Japan vs. Global).

---

## 5. Potential Challenges & Risks

- **Color Accuracy**: Screen colors (RGB) always look slightly different when printed (CMYK). We must manage user expectations.
- **Binding Quality**: Glue vs. Stitching. Hardcover books are more durable but significantly more expensive.
- **Shipping Delays**: International logistics can be unpredictable.
- **Image Artifacts**: Upscaling might introduce minor artifacts in watercolor or detailed styles.

---

## 6. Phase 1 Scope (MVP)

- Single format: 210mm x 210mm (Square) Softcover.
- Domestic (Japan) shipping only.
- Manual fulfillment trigger (Admin reviews high-res PDF before sending to printer).
- Basic order status tracking in "My Account" or "Bookshelf".

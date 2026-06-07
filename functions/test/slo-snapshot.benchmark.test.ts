import { describe, it, expect, vi } from "vitest";
import { saveSloSnapshot } from "../src/lib/slo-snapshot";
import * as firestore from "firebase-admin/firestore";

vi.mock("firebase-admin/firestore", () => {
  return {
    getFirestore: vi.fn(),
    FieldValue: {
      serverTimestamp: vi.fn(),
    },
  };
});

describe("saveSloSnapshot benchmark", () => {
  it("measures performance", async () => {
    const mockDb = {
      collection: vi.fn(),
    };
    (firestore.getFirestore as any).mockReturnValue(mockDb);

    // Mock 50 books
    const numBooks = 50;
    const books = Array.from({ length: numBooks }, (_, i) => ({
      id: `book-${i}`,
      data: () => ({ status: "completed" }),
    }));

    const booksSnap = {
      empty: false,
      docs: books,
    };

    const pagesSnap = {
      docs: [
        { data: () => ({ status: "completed", imageDurationMs: 1000 }) },
        { data: () => ({ status: "completed", imageDurationMs: 1200 }) },
      ],
    };

    mockDb.collection.mockImplementation((colName) => {
      if (colName === "books") {
        return {
          orderBy: () => ({
            limit: () => ({
              get: async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return booksSnap;
              },
            }),
          }),
          doc: (bookId) => ({
            collection: (subColName) => ({
              get: async () => {
                await new Promise((resolve) => setTimeout(resolve, 20)); // simulated latency
                return pagesSnap;
              },
            }),
          }),
        };
      }
      if (colName === "adminMetrics") {
        return {
          doc: () => ({
            collection: () => ({
              doc: () => ({
                get: async () => ({ exists: false }),
                set: async () => {},
              }),
            }),
          }),
        };
      }
    });

    const start = Date.now();
    await saveSloSnapshot({ source: "bench", window: "daily", sampleSize: numBooks });
    const duration = Date.now() - start;
    console.log(`Duration: ${duration}ms`);
  });
});

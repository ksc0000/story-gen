import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const SITE_URL = "https://ehoria.app";

/**
 * Stripe Price IDs
 * TODO: 既存ユーザーの価格維持（グランドファザリング）が必要な場合は、
 * ユーザーの既存の subscription に紐づく price ID を維持するか、
 * ロジックで旧 Price ID を割り当てる検討が必要。
 */
const STRIPE_PRICE_IDS: Record<string, string> = {
  standard_paid: process.env.STRIPE_PRICE_ID_STANDARD ?? "",
  premium_paid: process.env.STRIPE_PRICE_ID_PREMIUM ?? "",
};

// ─── createCheckoutSession ────────────────────────────────────────────────────
export const createCheckoutSession = onCall(
  {
    region: "asia-northeast1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const { productPlan } = request.data as {
      productPlan: "standard_paid" | "premium_paid";
    };

    const priceId = STRIPE_PRICE_IDS[productPlan];
    if (!priceId) {
      throw new HttpsError("invalid-argument", "無効なプランです");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const stripe = new Stripe(stripeSecretKey.value());
    const db = admin.firestore();

    // Get or create Stripe customer
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    let customerId: string | undefined = userData?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await db
        .collection("users")
        .doc(uid)
        .set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
      metadata: { uid, productPlan },
      subscription_data: {
        metadata: { uid, productPlan },
      },
    });

    return { url: session.url };
  }
);

// ─── createSinglePurchaseCheckout ──────────────────────────────────────────────
export const createSinglePurchaseCheckout = onCall(
  {
    region: "asia-northeast1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const { purchaseType } = request.data as {
      purchaseType: "ai_guided" | "photo_story";
    };

    const priceId =
      purchaseType === "ai_guided"
        ? process.env.STRIPE_PRICE_ID_SINGLE_AI_GUIDED
        : process.env.STRIPE_PRICE_ID_SINGLE_PHOTO_STORY;

    if (!priceId) {
      throw new HttpsError("invalid-argument", "無効な購入種別または価格設定が見つかりません");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const stripe = new Stripe(stripeSecretKey.value());
    const db = admin.firestore();

    // Get or create Stripe customer
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    let customerId: string | undefined = userData?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await db
        .collection("users")
        .doc(uid)
        .set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
      metadata: { uid, purchaseType, kind: "single_purchase" },
    });

    return { url: session.url };
  }
);

// ─── stripeWebhook ────────────────────────────────────────────────────────────
export const stripeWebhook = onRequest(
  {
    region: "asia-northeast1",
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value());
    const sig = req.headers["stripe-signature"] as string;

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(
        (req as unknown as { rawBody: Buffer }).rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err}`);
      return;
    }

    const db = admin.firestore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = event.data.object as Record<string, any>;

    switch (event.type) {
      case "checkout.session.completed": {
        const uid: string | undefined = obj.metadata?.uid;

        // Handle single purchase
        if (obj.metadata?.kind === "single_purchase") {
          if (!uid) break;
          const sessionId = obj.id;
          const sessionRef = db.collection("processedStripeSessions").doc(sessionId);

          try {
            await db.runTransaction(async (tx) => {
              const sessionDoc = await tx.get(sessionRef);
              if (sessionDoc.exists) return;

              const purchaseType = obj.metadata?.purchaseType as "ai_guided" | "photo_story" | undefined;
              const updateData: any = {
                singleBookCredits: admin.firestore.FieldValue.increment(1),
              };
              if (purchaseType) {
                updateData[`singlePurchaseCredits.${purchaseType}`] = admin.firestore.FieldValue.increment(1);
              }
              tx.update(db.collection("users").doc(uid), updateData);
              tx.set(sessionRef, {
                uid,
                purchaseType: obj.metadata?.purchaseType,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
          } catch (e) {
            console.error(`Error processing single purchase for session ${sessionId}:`, e);
          }
          break;
        }

        const productPlan: string | undefined = obj.metadata?.productPlan;
        if (uid && productPlan) {
          await db.collection("users").doc(uid).set(
            {
              plan: "premium",
              productPlan,
              stripeSubscriptionId: obj.subscription ?? null,
            },
            { merge: true }
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const uid: string | undefined = obj.metadata?.uid;
        const productPlan: string | undefined = obj.metadata?.productPlan;
        if (!uid) break;

        if (obj.status === "active" && productPlan) {
          await db.collection("users").doc(uid).set(
            { plan: "premium", productPlan, stripeSubscriptionId: obj.id },
            { merge: true }
          );
        } else if (["canceled", "unpaid", "past_due"].includes(obj.status)) {
          await db.collection("users").doc(uid).set(
            { plan: "free", productPlan: "free", stripeSubscriptionId: null },
            { merge: true }
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const uid: string | undefined = obj.metadata?.uid;
        if (uid) {
          await db.collection("users").doc(uid).set(
            { plan: "free", productPlan: "free", stripeSubscriptionId: null },
            { merge: true }
          );
        }
        break;
      }
    }

    res.json({ received: true });
  }
);

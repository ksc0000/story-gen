import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getIllustrationStyleProfile } from "./lib/illustration-styles";
import type { OrgRole } from "./organizations";

// 安全弁（E4課金が未実装のためのコスト上限）。
export const MAX_STUDENTS_PER_RUN = 40;
export const ORG_MONTHLY_BOOK_CAP = 100;

const ORG_BULK_STYLE = "soft_watercolor" as const;

export function currentYearMonthJst(now = new Date()): string {
  // JST(UTC+9)基準の YYYY-MM。
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface BulkInput {
  orgId: string;
  classId: string;
  templateId: string;
  message?: string;
}

export const bulkGenerateClassBooks = onCall(
  { region: "asia-northeast1", timeoutSeconds: 60 },
  async (request): Promise<{ created: number; remainingThisMonth: number }> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required");

    const claimOrgId = request.auth?.token.orgId as string | undefined;
    const claimRole = request.auth?.token.orgRole as OrgRole | undefined;

    const data = (request.data ?? {}) as Partial<BulkInput>;
    const orgId = (data.orgId ?? "").trim();
    const classId = (data.classId ?? "").trim();
    const templateId = (data.templateId ?? "").trim();
    const message = (data.message ?? "").trim().slice(0, 200);

    if (!orgId || !classId || !templateId) {
      throw new HttpsError("invalid-argument", "組織・クラス・テンプレートを指定してください。");
    }
    // 一括生成は当該組織の管理者のみ（コストのかかる操作）。
    if (claimOrgId !== orgId || claimRole !== "org_admin") {
      throw new HttpsError("permission-denied", "一括生成は団体の管理者のみ実行できます。");
    }

    const db = admin.firestore();

    // テンプレート検証（固定テンプレートのみ）。
    const templateSnap = await db.collection("templates").doc(templateId).get();
    if (!templateSnap.exists) {
      throw new HttpsError("not-found", "テンプレートが見つかりません。");
    }
    const template = templateSnap.data() as {
      creationMode?: string;
      active?: boolean;
      categoryGroupId?: string;
      priceTier?: string;
      storyCostLevel?: string;
      fixedStory?: { pages?: unknown[] };
    };
    if (template.creationMode !== "fixed_template" || template.active === false) {
      throw new HttpsError("failed-precondition", "このテンプレートは一括生成に対応していません。");
    }
    const pageCount = Array.isArray(template.fixedStory?.pages) ? template.fixedStory!.pages!.length : 8;

    // 名簿を取得（1回の上限を超えていないか）。
    const studentsSnap = await db
      .collection("organizations")
      .doc(orgId)
      .collection("classes")
      .doc(classId)
      .collection("students")
      .limit(MAX_STUDENTS_PER_RUN + 1)
      .get();
    if (studentsSnap.empty) {
      throw new HttpsError("failed-precondition", "このクラスに園児が登録されていません。");
    }
    if (studentsSnap.size > MAX_STUDENTS_PER_RUN) {
      throw new HttpsError(
        "failed-precondition",
        `一度に生成できるのは${MAX_STUDENTS_PER_RUN}人までです。クラスを分けてお試しください。`
      );
    }
    const students = studentsSnap.docs;

    // 組織の月次上限チェック。
    const yearMonth = currentYearMonthJst();
    const usageRef = db.collection("organizations").doc(orgId).collection("usage").doc(yearMonth);
    const usageSnap = await usageRef.get();
    const usedThisMonth = (usageSnap.exists ? (usageSnap.data()?.bulkBooks as number | undefined) : 0) ?? 0;
    if (usedThisMonth + students.length > ORG_MONTHLY_BOOK_CAP) {
      const remaining = Math.max(0, ORG_MONTHLY_BOOK_CAP - usedThisMonth);
      throw new HttpsError(
        "resource-exhausted",
        `今月の一括生成の上限（${ORG_MONTHLY_BOOK_CAP}冊）に達します。今月あと${remaining}冊まで作成できます。`
      );
    }

    const styleProfile = getIllustrationStyleProfile(ORG_BULK_STYLE);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const nowMs = Date.now();

    const batch = db.batch();
    for (const doc of students) {
      const s = doc.data() as { name?: string; age?: number | null };
      const childName = (s.name ?? "").trim() || "こども";
      const bookRef = db.collection("books").doc();
      batch.set(bookRef, {
        userId: uid,
        childId: null,
        protagonistType: "child",
        title: "",
        theme: templateId,
        templateId,
        categoryGroupId: template.categoryGroupId ?? "memories",
        creationMode: "fixed_template",
        isSinglePurchase: false,
        priceTier: template.priceTier ?? "ume",
        storyCostLevel: template.storyCostLevel ?? "none",
        productPlan: "standard_paid",
        imageQualityTier: "standard",
        imageModelProfile: "pro_consistent",
        characterConsistencyMode: "all_pages",
        style: ORG_BULK_STYLE,
        selectedStyleId: styleProfile.id,
        selectedStyleName: styleProfile.name,
        styleBible: styleProfile.styleBible,
        stylePreviewImageUrl: styleProfile.previewImageUrl ?? null,
        stylePreviewUsedAsReference: false,
        pageCount,
        status: "generating",
        progress: 0,
        input: {
          childName,
          ...(typeof s.age === "number" ? { childAge: s.age } : {}),
          ...(message ? { parentMessage: message } : {}),
        },
        // エンタープライズ一括生成のタグ。個人クォータを消費しない。
        orgId,
        classId,
        studentId: doc.id,
        orgSponsored: true,
        createdAt: now,
        createdAtMs: nowMs,
        createdAtSource: "org_bulk",
        updatedAt: now,
        updatedAtMs: nowMs,
      });
    }
    batch.set(
      usageRef,
      { bulkBooks: admin.firestore.FieldValue.increment(students.length), updatedAt: now },
      { merge: true }
    );
    await batch.commit();

    logger.info("Bulk class books created", { orgId, classId, templateId, count: students.length, uid });
    return {
      created: students.length,
      remainingThisMonth: Math.max(0, ORG_MONTHLY_BOOK_CAP - usedThisMonth - students.length),
    };
  }
);

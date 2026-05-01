"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapAdmin = void 0;
exports.parseAllowedAdminEmails = parseAllowedAdminEmails;
exports.isEmailAllowedForAdmin = isEmailAllowedForAdmin;
const auth_1 = require("firebase-admin/auth");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const adminEmailsParam = (0, params_1.defineString)("ADMIN_EMAILS", { default: "" });
function parseAllowedAdminEmails(rawValue) {
    return rawValue
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}
function isEmailAllowedForAdmin(email, allowedEmails) {
    if (!email)
        return false;
    return allowedEmails.includes(email.trim().toLowerCase());
}
exports.bootstrapAdmin = (0, https_1.onCall)({
    region: "asia-northeast1",
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です");
    }
    const uid = request.auth.uid;
    const userRecord = await (0, auth_1.getAuth)().getUser(uid);
    const email = userRecord.email?.toLowerCase();
    if (!email) {
        throw new https_1.HttpsError("failed-precondition", "メールアドレスが必要です");
    }
    if (userRecord.emailVerified === false) {
        throw new https_1.HttpsError("failed-precondition", "メールアドレス確認済みのアカウントが必要です");
    }
    const allowedEmails = parseAllowedAdminEmails(adminEmailsParam.value());
    if (allowedEmails.length === 0) {
        throw new https_1.HttpsError("permission-denied", "管理者許可リストが設定されていません");
    }
    if (!isEmailAllowedForAdmin(email, allowedEmails)) {
        throw new https_1.HttpsError("permission-denied", "このアカウントは管理者として許可されていません");
    }
    const currentClaims = userRecord.customClaims ?? {};
    if (currentClaims.admin === true) {
        return {
            ok: true,
            admin: true,
            alreadyAdmin: true,
            message: "admin claim granted. Please refresh ID token.",
        };
    }
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, {
        ...currentClaims,
        admin: true,
    });
    return {
        ok: true,
        admin: true,
        alreadyAdmin: false,
        message: "admin claim granted. Please refresh ID token.",
    };
});
//# sourceMappingURL=bootstrap-admin.js.map
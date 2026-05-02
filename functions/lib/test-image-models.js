"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testImageModels = void 0;
exports.normalizeTestImageModelsRequest = normalizeTestImageModelsRequest;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const replicate_1 = require("./lib/replicate");
const replicateApiToken = (0, params_1.defineSecret)("REPLICATE_API_TOKEN");
const DEFAULT_TIERS = ["light", "standard", "premium"];
const DEFAULT_MODEL_PROFILES = [
    "klein_fast",
    "klein_base",
    "pro_consistent",
];
function normalizeTestImageModelsRequest(data) {
    return {
        purpose: data.purpose ?? "book_page",
        inputImageUrls: [...new Set(data.inputImageUrls ?? [])].slice(0, 8),
        qualityTiers: (data.qualityTiers?.length ? data.qualityTiers : DEFAULT_TIERS).filter(Boolean),
        modelProfiles: (data.modelProfiles?.length ? data.modelProfiles : DEFAULT_MODEL_PROFILES).filter(Boolean),
        compareByModelProfile: Boolean(data.modelProfiles?.length),
    };
}
exports.testImageModels = (0, https_1.onCall)({
    region: "asia-northeast1",
    secrets: [replicateApiToken],
    memory: "1GiB",
    timeoutSeconds: 300,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です");
    }
    if (request.auth.token.admin !== true) {
        throw new https_1.HttpsError("permission-denied", "管理者のみ利用できます");
    }
    const data = request.data;
    if (!data.prompt || typeof data.prompt !== "string") {
        throw new https_1.HttpsError("invalid-argument", "prompt is required");
    }
    const normalized = normalizeTestImageModelsRequest(data);
    const { purpose, qualityTiers, inputImageUrls, modelProfiles, compareByModelProfile } = normalized;
    const imageClient = new replicate_1.ReplicateImageClient(replicateApiToken.value());
    const bucket = admin.storage().bucket("story-gen-8a769.firebasestorage.app");
    const batchId = (0, crypto_1.randomUUID)();
    const results = [];
    if (compareByModelProfile) {
        for (const modelProfile of modelProfiles) {
            const imageBuffer = await imageClient.generateImage(data.prompt, {
                purpose,
                imageModelProfile: modelProfile,
                inputImageUrls,
            });
            const filename = `internal-tests/image-models/${batchId}/${modelProfile}.png`;
            const token = (0, crypto_1.randomUUID)();
            await bucket.file(filename).save(imageBuffer, {
                contentType: "image/png",
                metadata: {
                    metadata: {
                        firebaseStorageDownloadTokens: token,
                    },
                },
            });
            results.push({
                modelProfile,
                model: (0, replicate_1.resolveReplicateModel)({ purpose, imageModelProfile: modelProfile }),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`,
            });
        }
        return {
            batchId,
            purpose,
            inputImageUrls,
            results,
        };
    }
    for (const tier of qualityTiers) {
        const imageBuffer = await imageClient.generateImage(data.prompt, {
            purpose,
            imageQualityTier: tier,
            inputImageUrls,
        });
        const filename = `internal-tests/image-models/${batchId}/${tier}.png`;
        const token = (0, crypto_1.randomUUID)();
        await bucket.file(filename).save(imageBuffer, {
            contentType: "image/png",
            metadata: {
                metadata: {
                    firebaseStorageDownloadTokens: token,
                },
            },
        });
        results.push({
            tier,
            model: (0, replicate_1.resolveReplicateModel)({ purpose, imageQualityTier: tier }),
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`,
        });
    }
    return {
        batchId,
        purpose,
        inputImageUrls,
        results,
    };
});
//# sourceMappingURL=test-image-models.js.map